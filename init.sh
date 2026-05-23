#!/bin/bash
set -e

echo "=== A&K Harness Initialization ==="
echo ""

# Check directory
if [ ! -f package.json ]; then
  echo "ERROR: No package.json found. Run from /mnt/f/attick-keller/web/"
  exit 1
fi

echo "=== Installing dependencies ==="
npm install --silent 2>/dev/null || npm install

echo ""
echo "=== TypeScript Check ==="
npx tsc --noEmit 2>&1
echo "TypeScript: OK"

echo ""
echo "=== Lint Check ==="
if node -e "const s=require('./package.json').scripts||{}; process.exit(s.lint?0:1)" 2>/dev/null; then
  npm run lint 2>&1 || true
  echo "Lint: checked"
else
  echo "Lint: no script found, skipping"
fi

echo ""
echo "=== Build Check ==="
npm run build 2>&1
echo "Build: OK"

echo ""
echo "=== Harness Verification Complete ==="
echo ""
echo "Next steps:"
echo "1. Read feature_list.json to see current feature state"
echo "2. Pick ONE unfinished feature to work on"
echo "3. Implement only that feature"
echo "4. Re-run this script before claiming done"