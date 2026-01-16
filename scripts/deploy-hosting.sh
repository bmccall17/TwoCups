#!/bin/bash
#
# Two Cups - Deterministic Firebase Hosting Deploy
#
# This script ensures a clean, complete deployment by:
# 1. Cleaning the dist folder (removes stale files)
# 2. Running a fresh build
# 3. Verifying all required files exist
# 4. Deploying to Firebase Hosting
#
# Usage:
#   ./scripts/deploy-hosting.sh           # Full deploy to production
#   ./scripts/deploy-hosting.sh --preview # Deploy to preview channel
#   ./scripts/deploy-hosting.sh --dry-run # Build only, no deploy
#

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
APP_DIR="$ROOT_DIR/TwoCupsApp"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "======================================"
echo "  Two Cups Firebase Hosting Deploy"
echo "======================================"
echo ""

# Parse arguments
PREVIEW=false
DRY_RUN=false
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --preview) PREVIEW=true ;;
        --dry-run) DRY_RUN=true ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift
done

# Step 1: Clean build
echo -e "${YELLOW}[1/4]${NC} Cleaning previous build..."
cd "$APP_DIR"
rm -rf dist
echo -e "${GREEN}[OK]${NC} dist/ removed"

# Step 2: Build
echo ""
echo -e "${YELLOW}[2/4]${NC} Building web app..."
npm run build:web
echo -e "${GREEN}[OK]${NC} Build complete"

# Step 3: Verify build
echo ""
echo -e "${YELLOW}[3/4]${NC} Verifying build..."

# Required files that MUST exist
REQUIRED_FILES=(
    "dist/index.html"
    "dist/sw.js"
    "dist/manifest.json"
    "dist/build-manifest.json"
    "dist/assets/icon.png"
    "dist/assets/adaptive-icon.png"
    "dist/assets/favicon.png"
)

MISSING=0
for file in "${REQUIRED_FILES[@]}"; do
    if [[ ! -f "$APP_DIR/$file" ]]; then
        echo -e "${RED}[MISSING]${NC} $file"
        MISSING=$((MISSING + 1))
    fi
done

if [[ $MISSING -gt 0 ]]; then
    echo ""
    echo -e "${RED}[ERROR]${NC} $MISSING required files missing!"
    echo "Build may be incomplete. Aborting deploy."
    exit 1
fi

# Count total files
FILE_COUNT=$(find "$APP_DIR/dist" -type f | wc -l)
echo -e "${GREEN}[OK]${NC} All required files present"
echo "    Total files in dist: $FILE_COUNT"

# Show build manifest info
if [[ -f "$APP_DIR/dist/build-manifest.json" ]]; then
    BUILD_TS=$(node -e "console.log(require('$APP_DIR/dist/build-manifest.json').buildTimestamp)")
    BUILD_DATE=$(node -e "console.log(require('$APP_DIR/dist/build-manifest.json').buildDate)")
    echo "    Build timestamp: $BUILD_TS"
    echo "    Build date: $BUILD_DATE"
fi

# Step 4: Deploy
echo ""
if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}[4/4]${NC} Dry run - skipping deploy"
    echo ""
    echo "Build complete! Files ready in TwoCupsApp/dist/"
    echo "To deploy, run without --dry-run flag"
else
    cd "$ROOT_DIR"
    if [[ "$PREVIEW" == true ]]; then
        echo -e "${YELLOW}[4/4]${NC} Deploying to preview channel..."
        firebase hosting:channel:deploy preview --expires 7d
    else
        echo -e "${YELLOW}[4/4]${NC} Deploying to production..."
        firebase deploy --only hosting
    fi
    echo ""
    echo -e "${GREEN}[OK]${NC} Deploy complete!"
fi

echo ""
echo "======================================"
echo "  Deploy Summary"
echo "======================================"
echo "  Files deployed: $FILE_COUNT"
echo "  Build timestamp: $BUILD_TS"
if [[ "$PREVIEW" == true ]]; then
    echo "  Target: Preview channel"
else
    echo "  Target: Production"
fi
echo "======================================"
echo ""
