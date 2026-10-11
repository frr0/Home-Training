#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Building VeloTrain in Release mode ==="
~/.cargo/bin/cargo build --release
strip target/release/velo-train

echo "=== Assembling AppDir ==="
mkdir -p AppDir/usr/bin AppDir/usr/share/applications AppDir/usr/share/icons/hicolor/256x256/apps
cp target/release/velo-train AppDir/usr/bin/
cp velo-train.desktop AppDir/
cp velo-train.desktop AppDir/usr/share/applications/
cp velo-train.png AppDir/
cp velo-train.png AppDir/usr/share/icons/hicolor/256x256/apps/

cat << 'EOF' > AppDir/AppRun
#!/bin/sh
SELF=$(readlink -f "$0")
HERE=${SELF%/*}
export PATH="${HERE}/usr/bin:${PATH}"
export LD_LIBRARY_PATH="${HERE}/usr/lib:${LD_LIBRARY_PATH}"
export XDG_DATA_DIRS="${HERE}/usr/share:${XDG_DATA_DIRS}"
exec "${HERE}/usr/bin/velo-train" "$@"
EOF
chmod +x AppDir/AppRun

echo "=== Generating AppImage ==="
ARCH=x86_64 ~/.local/bin/appimagetool AppDir VeloTrain-x86_64.AppImage
cp VeloTrain-x86_64.AppImage ../

echo "=== Success! Generated: ../VeloTrain-x86_64.AppImage ==="
ls -lh VeloTrain-x86_64.AppImage
