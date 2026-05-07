#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPLE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKSPACE_PATH="$APPLE_DIR/Showcase.xcworkspace"
WORKSPACE_SCHEME_PATH="$WORKSPACE_PATH/xcshareddata/xcschemes/Showcase-Workspace.xcscheme"

open_workspace=false
args=()

for arg in "$@"; do
    if [[ "$arg" == "--open" ]]; then
        open_workspace=true
    elif [[ "$arg" != "--no-open" ]]; then
        args+=("$arg")
    fi
done

if [[ "${#args[@]}" -gt 0 ]]; then
    tuist generate --path "$APPLE_DIR" --no-open "${args[@]}"
else
    tuist generate --path "$APPLE_DIR" --no-open
fi
rm -f "$WORKSPACE_SCHEME_PATH"

if [[ "$open_workspace" == true ]]; then
    open "$WORKSPACE_PATH"
fi
