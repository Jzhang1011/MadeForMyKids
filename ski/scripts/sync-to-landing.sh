#!/usr/bin/env bash
# Copy the ski app into the madeformykids.com landing Worker's assets so it is
# served at https://madeformykids.com/ski/. Then deploy the Worker:
#   cd landing && wrangler deploy
# The copy reads fresh morning data from private.madeformykids.com (GitHub Pages)
# and also fetches live data in the browser, so it only needs re-syncing when code changes.
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
dest="$root/landing/public/ski"
rm -rf "$dest"
mkdir -p "$dest"
cp -R "$root/ski/index.html" "$root/ski/css" "$root/ski/js" "$root/ski/data" "$dest/"
echo "Synced ski/ -> landing/public/ski/"
