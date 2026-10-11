#!/usr/bin/env bash
# Quick launcher for VeloTrain Desktop App
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

APPIMAGE="$DIR/VeloTrain.AppImage"
if [ ! -f "$APPIMAGE" ]; then
    APPIMAGE="$DIR/VeloTrain-x86_64.AppImage"
fi

if [ -f "$APPIMAGE" ]; then
    "$APPIMAGE" "$@" 2>/dev/null || "$APPIMAGE" --appimage-extract-and-run "$@"
elif [ -f "$DIR/release/linux-unpacked/velotrain" ]; then
    "$DIR/release/linux-unpacked/velotrain" "$@"
else
    cd "$DIR" && npm start
fi
