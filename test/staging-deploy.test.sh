#!/usr/bin/env bash
set -Eeuo pipefail

root=$(mktemp -d)
trap 'rm -rf -- "$root"' EXIT
mkdir -p "$root"/{bin,app/release-6bc972e,bundle,artifact/node_modules/next,artifact/.next/static/chunks}
export TEST_APP_ROOT="$root/app"
export PATH="$root/bin:$PATH"
repo=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)

cat > "$root/bin/cloudlinux-selector" <<'MOCK'
#!/usr/bin/env bash
[[ $* == "restart --json --interpreter nodejs --domain dev-booking.shiap.id --app-root bookingengine-staging" ]] || exit 1
cp "$TEST_APP_ROOT/server.js" "$TEST_APP_ROOT/running.js"
printf '%s\n' '{"result":"success"}'
MOCK
cat > "$root/bin/node" <<'MOCK'
#!/usr/bin/env bash
case $1 in
  -p) echo 24 ;;
  --input-type=module)
    expected=$4
    actual=$(sed -nE 's/^process\.env\.SHIAP_RELEASE_SHA = "([0-9a-f]{40})";$/\1/p' "$TEST_APP_ROOT/running.js")
    [[ $expected == "$actual" && $expected != "${FAIL_RELEASE:-unassigned}" ]]
    ;;
  --check|-e) exit 0 ;;
  *) exit 1 ;;
esac
MOCK
chmod +x "$root/bin/"*

printf '%s\n' 'import("./release-6bc972e/server.js").catch(console.error);' > "$TEST_APP_ROOT/server.js"
cp "$TEST_APP_ROOT/server.js" "$TEST_APP_ROOT/running.js"
cp "$TEST_APP_ROOT/server.js" "$TEST_APP_ROOT/server.placeholder.js"
touch "$TEST_APP_ROOT/release-6bc972e/server.js"
touch "$root/artifact/"{server.js,package.json,.next/BUILD_ID,.next/static/chunks/site.css,node_modules/next/package.json}
sed -e "s@^app_root=.*@app_root=$TEST_APP_ROOT@" -e "s@^node=.*@node=$root/bin/node@" \
  "$repo/scripts/staging/deploy.sh" > "$root/bundle/deploy.sh"

cd "$root/bundle"
tar -C "$root/artifact" -czf booking-engine.tar.gz .
sha256sum booking-engine.tar.gz > SHA256SUMS
first=1111111111111111111111111111111111111111
second=2222222222222222222222222222222222222222

bash deploy.sh "$first" 1-1
cmp "$TEST_APP_ROOT/server.js" "$TEST_APP_ROOT/running.js"
cp "$TEST_APP_ROOT/server.js" "$root/good-launcher.js"
grep -Fq "release-$first-1-1/server.js" "$root/good-launcher.js"

if FAIL_RELEASE="$second" bash deploy.sh "$second" 2-1 2>&1 | tee "$root/rollback.log"; then
  echo "Failed health check unexpectedly succeeded" >&2
  exit 1
fi
grep -Fq "Rollback verified: release-$first-1-1" "$root/rollback.log"
cmp "$root/good-launcher.js" "$TEST_APP_ROOT/server.js"
cmp "$root/good-launcher.js" "$TEST_APP_ROOT/running.js"
[[ -f "$TEST_APP_ROOT/release-6bc972e/server.js" ]]
grep -Fq 'release-6bc972e/server.js' "$TEST_APP_ROOT/server.placeholder.js"

printf 'bad checksum\n' > SHA256SUMS
if bash deploy.sh "$second" 3-1; then
  echo "Invalid checksum unexpectedly succeeded" >&2
  exit 1
fi
cmp "$root/good-launcher.js" "$TEST_APP_ROOT/server.js"
echo "Activation, health-check failure, rollback, and invalid checksum passed."
