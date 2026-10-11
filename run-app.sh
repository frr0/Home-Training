#!/usr/bin/env bash
# Quick launcher for VeloTrain Desktop App
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$DIR/VeloTrain-x86_64.AppImage" ]; then
    # Try normal execution, fallback to extract-and-run if FUSE 2 is not installed
    "$DIR/VeloTrain-x86_64.AppImage" "$@" 2>/dev/null || "$DIR/VeloTrain-x86_64.AppImage" --appimage-extract-and-run "$@"
elif [ -f "$DIR/release/linux-unpacked/velotrain" ]; then
    "$DIR/release/linux-unpacked/velotrain" "$@"
else
    cd "$DIR" && npm start
fi
