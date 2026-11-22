#!/usr/bin/env bash
# Builds the installable Joomla package: dist/mod_modern_timeline-<version>.zip
set -euo pipefail
cd "$(dirname "$0")"
VERSION=$(sed -n 's:.*<version>\(.*\)</version>.*:\1:p' mod_modern_timeline/mod_modern_timeline.xml | head -1)
mkdir -p dist
OUT="dist/mod_modern_timeline-${VERSION}.zip"
rm -f "$OUT"
(cd mod_modern_timeline && zip -qr -X "../$OUT" . -x '.*')
echo "Built $OUT"
