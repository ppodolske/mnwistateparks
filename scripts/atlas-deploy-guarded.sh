#!/usr/bin/env bash
# Atlas Parks · reusable guarded Cloudflare Pages deployment.
# Run from a pinned temporary Git checkout AFTER tests and the static build.
set -Eeuo pipefail
export GIT_TERMINAL_PROMPT=0 CI=1 CLOUDFLARE_SEND_METRICS=false

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
PIN="${1:-}"
MODE="${2:---deploy}"
MESSAGE="${3:-Atlas Parks guarded deployment}"

if [[ ! "$PIN" =~ ^[a-f0-9]{40}$ ]]; then
  echo 'STOP: expected an exact 40-character lowercase Git commit SHA.' >&2
  exit 2
fi
case "$MODE" in --verify-only|--deploy) ;; *) echo 'STOP: mode must be --verify-only or --deploy.' >&2; exit 2 ;; esac
for tool in git node; do
  command -v "$tool" >/dev/null || { echo "STOP: $tool not installed." >&2; exit 1; }
done
cd "$ROOT"

TOP="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[[ "$TOP" == "$ROOT" ]] || { echo 'STOP: this helper must be used in the repository root.' >&2; exit 1; }
HEAD="$(git rev-parse --verify HEAD)"
[[ "$HEAD" == "$PIN" ]] || { printf 'STOP: source changed (HEAD %s, expected %s). No deploy.\n' "$HEAD" "$PIN" >&2; exit 1; }
BRANCH="$(git symbolic-ref --quiet --short HEAD || true)"
[[ "$BRANCH" == 'cloudflare-prep' ]] || { echo "STOP: unexpected Git branch '$BRANCH'." >&2; exit 1; }

# Only expected, ignored generated files may exist; no source edits may remain.
git check-ignore -q dist/ || { echo 'STOP: dist/ is not ignored by Git.' >&2; exit 1; }
git check-ignore -q park-coordinates.generated.json || { echo 'STOP: generated coordinates are not ignored by Git.' >&2; exit 1; }
DIRTY="$(git status --porcelain=v1 --untracked-files=all)"
if [[ -n "$DIRTY" ]]; then
  echo 'STOP: unexpected tracked/untracked changes after building; deployment blocked.' >&2
  printf '%s\n' "$DIRTY" >&2
  exit 1
fi
for f in dist/index.html dist/trip/index.html dist/atlas-trip-experience.js dist/atlas-campsite-catalog.js; do
  [[ -f "$f" && ! -L "$f" ]] || { echo "STOP: required built asset missing or symlinked: $f" >&2; exit 1; }
done
[[ ! -L dist ]] || { echo 'STOP: dist/ is a symlink.' >&2; exit 1; }
node - <<'NODE'
const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('dist/trip/index.html','utf8');
assert(html.includes('/atlas-campsite-catalog.js'),'Trip page does not load campsite catalog');
assert(html.includes('/atlas-trip-experience.js'),'Trip page does not load workspace JS');
console.log('PASS: source assets and trip entrypoint verified');
NODE
printf 'PASS: pinned source, branch and clean Git state verified (%s).\n' "$HEAD"
if [[ "$MODE" == '--verify-only' ]]; then
  echo 'PASS: deployment guard verification only; no Cloudflare writes.'
  exit 0
fi
command -v npx >/dev/null || { echo 'STOP: npx not installed.' >&2; exit 1; }
# Wrangler dirty flag only acknowledges status AFTER strict Git validation.
npx --no-install wrangler pages deploy dist \
  --project-name=parks \
  --branch=cloudflare-prep \
  --commit-hash="$PIN" \
  --commit-message="$MESSAGE" \
  --commit-dirty=true
