#!/bin/sh
# Start the Eventor dev server.
# Usage: ./run.sh [--tunnel] [--web]
#   --tunnel  expose the dev server through a tunnel (phone on another network)
#   --web     open the web build

set -e
cd "$(dirname "$0")"

echo "=============================="
echo "  Eventor"
echo "  Event companion app"
echo "=============================="

# Prefer pnpm, fall back to npm.
if command -v pnpm >/dev/null 2>&1; then
  PM=pnpm
elif command -v npm >/dev/null 2>&1; then
  PM=npm
else
  echo "Error: install pnpm or npm first (https://nodejs.org)." >&2
  exit 1
fi
echo "Using package manager: $PM"

# Install dependencies on first run.
if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  "$PM" install
fi

# Pass supported flags through to Expo.
ARGS=""
for arg in "$@"; do
  case "$arg" in
    --tunnel) ARGS="$ARGS --tunnel" ;;
    --web) ARGS="$ARGS --web" ;;
    *) echo "Unknown option: $arg (supported: --tunnel, --web)" >&2; exit 1 ;;
  esac
done

# shellcheck disable=SC2086
exec npx expo start $ARGS
