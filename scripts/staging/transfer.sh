#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

[[ $GITHUB_SHA =~ ^[0-9a-f]{40}$ && $GITHUB_RUN_ID =~ ^[0-9]+$ && $GITHUB_RUN_ATTEMPT =~ ^[0-9]+$ ]]
[[ ${STAGING_SSH_HOST:?Missing SSH host} =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]+$ ]]
[[ ${STAGING_SSH_PORT:?Missing SSH port} =~ ^[0-9]{1,5}$ ]]
(( 10#$STAGING_SSH_PORT >= 1 && 10#$STAGING_SSH_PORT <= 65535 ))
[[ ${STAGING_SSH_USER:?Missing SSH user} == shiapsit ]]
: "${STAGING_SSH_PRIVATE_KEY:?Missing staging deploy key}"
: "${STAGING_SSH_KNOWN_HOSTS:?Missing verified host key}"

if [[ $(gh api "repos/$GITHUB_REPOSITORY/git/ref/heads/develop" --jq .object.sha) != "$GITHUB_SHA" ]]; then
  echo "A newer commit is on develop. Skipping this deployment."
  exit 0
fi

ssh_dir=$(mktemp -d "$RUNNER_TEMP/staging-ssh.XXXXXXXX")
trap 'rm -rf -- "$ssh_dir"' EXIT
printf '%s\n' "$STAGING_SSH_PRIVATE_KEY" >"$ssh_dir/key"
printf '%s\n' "$STAGING_SSH_KNOWN_HOSTS" >"$ssh_dir/known_hosts"
unset STAGING_SSH_PRIVATE_KEY STAGING_SSH_KNOWN_HOSTS GH_TOKEN

mode=deploy
if [[ ${ROLLBACK_DRILL_SHA:-} == "$GITHUB_SHA" ]]; then
  mode=rollback-drill
fi

bundle="$RUNNER_TEMP/staging-artifact"
cp scripts/staging/deploy.sh "$bundle/"
remote_command=$(cat <<'REMOTE'
set -eu
umask 077
root=/home/shiapsit/bookingengine-staging
test "$(realpath -e "$root")" = "$root"
test -O "$root"
incoming=$(mktemp -d "$root/.incoming.XXXXXXXX")
trap 'rm -rf -- "$incoming"' EXIT
trap 'exit 130' HUP INT TERM
tar -xf - -C "$incoming" --no-same-owner --no-same-permissions -- booking-engine.tar.gz SHA256SUMS deploy.sh
cd "$incoming"
bash ./deploy.sh "$@"
REMOTE
)

tar -C "$bundle" -cf - booking-engine.tar.gz SHA256SUMS deploy.sh |
  ssh -T -F /dev/null -p "$STAGING_SSH_PORT" -i "$ssh_dir/key" \
    -o BatchMode=yes -o IdentitiesOnly=yes -o ConnectTimeout=15 \
    -o ServerAliveInterval=15 -o ServerAliveCountMax=3 \
    -o StrictHostKeyChecking=yes -o GlobalKnownHostsFile=/dev/null \
    -o UserKnownHostsFile="$ssh_dir/known_hosts" \
    "$STAGING_SSH_USER@$STAGING_SSH_HOST" \
    "set -- $GITHUB_SHA $GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT $mode; $remote_command"
