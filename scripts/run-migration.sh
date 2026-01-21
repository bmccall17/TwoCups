#!/bin/bash

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Path to the migration script
MIGRATION_SCRIPT="$ROOT_DIR/TwoCupsApp/scripts/migrate-gem-breakdown.ts"

# Check if script exists
if [ ! -f "$MIGRATION_SCRIPT" ]; then
  echo "Error: Migration script not found at $MIGRATION_SCRIPT"
  exit 1
fi

echo "Running migration script..."
echo "Script: $MIGRATION_SCRIPT"
echo "Root: $ROOT_DIR"
echo ""

# Run the script using npx ts-node from TwoCupsApp directory to resolve dependencies
cd "$ROOT_DIR/TwoCupsApp" || exit 1

# Check for credentials
if [ -z "$GOOGLE_APPLICATION_CREDENTIALS" ] && [ ! -f "serviceAccountKey.json" ]; then
    echo "Warning: No credentials found in env or local file."
    echo "Please set GOOGLE_APPLICATION_CREDENTIALS or place serviceAccountKey.json in TwoCupsApp/"
fi

npx ts-node "scripts/migrate-gem-breakdown.ts"
