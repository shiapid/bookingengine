#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

app_root=/home/shiapsit/bookingengine-staging
domain=dev-booking.shiap.id
node=/home/shiapsit/nodevenv/bookingengine-staging/24/bin/node
sha=${1:?Expected release SHA}
run=${2:?Expected run ID and attempt}
mode=${3:-deploy}
[[ $sha =~ ^[0-9a-f]{40}$ && $run =~ ^[0-9]+-[0-9]+$ ]]
[[ $mode == deploy || $mode == rollback-drill ]]
[[ "$(realpath -e "$app_root")" == "$app_root" && -O "$app_root" ]]
[[ $("$node" -p 'process.versions.node.split(".")[0]') == 24 ]]
command -v cloudlinux-selector >/dev/null

archive="$PWD/booking-engine.tar.gz"
sha256sum --strict --check SHA256SUMS
launcher="$app_root/server.js"
release="release-$sha-$run"
state="$app_root/.deploy"
[[ ! -L "$state" ]]
mkdir -p -- "$state"
[[ -O "$state" && ! -L "$state/lock" ]]
exec 9>"$state/lock"
flock -w 30 9
log=$(mktemp "$state/$run.XXXXXXXX.log")
exec > >(tee -p -a "$log" 9>&-) 2>&1

restart() {
  local output
  output=$(timeout 30s cloudlinux-selector restart --json --interpreter nodejs \
    --domain "$domain" --app-root bookingengine-staging) || return
  "$node" -e 'if (JSON.parse(process.argv[1]).result !== "success") process.exit(1)' "$output"
}

health() {
  "$node" --input-type=module - "$domain" "$1" "$2" <<'NODE'
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";

const [domain, expected, expectedId] = process.argv.slice(2);
const origin = new URL(`https://${domain}`);
const request = async (url) => {
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(5000),
    headers: { "cache-control": "no-cache" },
  });
  assert.equal(response.status, 200, url.pathname);
  return response;
};

async function check() {
  const nonce = `?deploy=${randomUUID()}`;
  const health = await request(new URL(`/api/health${nonce}`, origin));
  assert.match(health.headers.get("content-type") ?? "", /^application\/json\b/i);
  assert.match(health.headers.get("cache-control") ?? "", /(?:^|,)\s*no-store\s*(?:,|$)/i);
  assert.deepEqual(await health.json(), { status: "ok", service: "shiap-booking-engine" });
  assert.equal(health.headers.get("x-shiap-release"), expected || null);
  assert.equal(health.headers.get("x-shiap-release-id"), expectedId || null);

  const page = await request(new URL(`/${nonce}`, origin));
  const html = await page.text();
  assert.match(html, /<title>SHIAP Booking Engine<\/title>/);
  const paths = [...html.matchAll(/href="(\/_next\/static\/[\w./-]+\.css)"/g)];
  assert.ok(paths.length, "Homepage has no stylesheet");
  for (const path of new Set(paths.map((match) => match[1]))) {
    const css = await request(new URL(path + nonce, origin));
    assert.match(css.headers.get("content-type") ?? "", /^text\/css\b/i);
    assert.ok((await css.arrayBuffer()).byteLength, "Stylesheet is empty");
  }
  const after = await request(new URL(`/api/health?deploy=${randomUUID()}`, origin));
  assert.equal(after.headers.get("x-shiap-release"), health.headers.get("x-shiap-release"));
  assert.equal(after.headers.get("x-shiap-release-id"), health.headers.get("x-shiap-release-id"));
}

for (let attempt = 1; ; attempt++) {
  try {
    await check();
    console.log(`HTTPS homepage, CSS and health passed (${expectedId || "existing release"})`);
    break;
  } catch (error) {
    if (attempt === 8) throw error;
    await setTimeout(2500);
  }
}
NODE
}

[[ -f "$launcher" && ! -L "$launcher" && -O "$launcher" ]]
# Recognize the working Passenger launcher and its current release before replacing it.
previous=$(sed -nE 's@^import\("\./(release-[0-9a-f-]+)/server\.js"\).*@\1@p' "$launcher")
[[ $previous =~ ^release-([0-9a-f]{7}|[0-9a-f]{40}-[0-9]+-[0-9]+)$ ]]
[[ -f "$app_root/$previous/server.js" && ! -L "$app_root/$previous" ]]
previous_sha=$(sed -nE 's/^process\.env\.SHIAP_RELEASE_SHA = "([0-9a-f]{40})";$/\1/p' "$launcher")
previous_id=$(sed -nE 's/^process\.env\.SHIAP_RELEASE_ID = "(release-[0-9a-f-]+)";$/\1/p' "$launcher")
health "$previous_sha" "$previous_id"

backup=$(mktemp "$state/$run.XXXXXXXX.server.js")
cp -p -- "$launcher" "$backup"
work=$(mktemp -d "$state/work.XXXXXXXX")
changed=0

finish() {
  local status=$?
  trap - EXIT
  trap '' HUP INT TERM
  if (( changed )); then
    echo "Restoring $previous from ${backup##*/}"
    if cp -p -- "$backup" "$work/rollback.js" &&
      mv -fT -- "$work/rollback.js" "$launcher" && restart && health "$previous_sha" "$previous_id"; then
      echo "Rollback verified: $previous"
    else
      echo "ROLLBACK FAILED: inspect $log and restore $backup using cPanel" >&2
      status=2
    fi
  fi
  rm -rf -- "$work"
  exit "$status"
}
trap finish EXIT
trap 'exit 130' HUP INT TERM

[[ ! -e "$app_root/$release" && ! -L "$app_root/$release" ]]
mkdir -- "$work/release"
tar --extract --gzip --file "$archive" --directory "$work/release" \
  --no-same-owner --no-same-permissions
[[ -f "$work/release/server.js" && ! -L "$work/release/server.js" ]]
[[ -f "$work/release/package.json" && -f "$work/release/.next/BUILD_ID" ]]
[[ -d "$work/release/.next/static" && -d "$work/release/node_modules/next" ]]
[[ -n $(find "$work/release/.next/static" -type f -name '*.css' -print -quit) ]]
"$node" --check "$work/release/server.js"
mv -T -- "$work/release" "$app_root/$release"

cat >"$work/launcher.js" <<EOF
"use strict";

process.env.SHIAP_RELEASE_SHA = "$sha";
process.env.SHIAP_RELEASE_ID = "$release";
import("./$release/server.js").catch((error) => {
  console.error("SHIAP Booking Engine startup failed", error);
  process.exitCode = 1;
});
EOF
"$node" --check "$work/launcher.js"
chmod --reference="$launcher" "$work/launcher.js"
changed=1
mv -fT -- "$work/launcher.js" "$launcher"
echo "Restarting Passenger for $release"
restart
health "$sha" "$release"

if [[ $mode == rollback-drill ]]; then
  echo "Rollback drill: restoring the previous launcher after a healthy activation"
  exit 1
fi

changed=0
echo "Deployment verified: $sha"
