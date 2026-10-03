#!/bin/bash
# Builds "Grandad's Cold Snap.app" so the game can live in your Applications
# folder, Dock or Launchpad like any other Mac app.
#
#   ./make-mac-app.sh              # puts the app in ~/Applications
#   ./make-mac-app.sh ~/Desktop    # or anywhere you like
#
# The app opens the game in its own window using Chrome, Edge or Brave if one
# is installed, and otherwise in your default browser (usually Safari).
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
DEST="${1:-$HOME/Applications}"
APP="$DEST/Grandad's Cold Snap.app"

for need in index.html js vendor; do
  if [ ! -e "$HERE/$need" ]; then
    echo "Can't find $need next to this script. Run it from the game's folder." >&2
    exit 1
  fi
done

mkdir -p "$DEST"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
# the game plus its scripts and an offline copy of the 3D library, so it works without internet
cp "$HERE/index.html" "$APP/Contents/Resources/"
cp -R "$HERE/js" "$HERE/vendor" "$APP/Contents/Resources/"
[ -f "$HERE/classic.html" ] && cp "$HERE/classic.html" "$APP/Contents/Resources/"

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Grandad's Cold Snap</string>
  <key>CFBundleDisplayName</key><string>Grandad's Cold Snap</string>
  <key>CFBundleIdentifier</key><string>local.grandads-cold-snap</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleExecutable</key><string>launch</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
</dict>
</plist>
PLIST

cat > "$APP/Contents/MacOS/launch" <<'LAUNCH'
#!/bin/bash
GAME="$(cd "$(dirname "$0")/../Resources" && pwd)/index.html"
URL="file://$GAME"
for browser in "Google Chrome" "Microsoft Edge" "Brave Browser"; do
  if [ -d "/Applications/$browser.app" ] || [ -d "$HOME/Applications/$browser.app" ]; then
    exec open -na "$browser" --args --app="$URL" --window-size=1400,900
  fi
done
exec open "$GAME"
LAUNCH
chmod +x "$APP/Contents/MacOS/launch"

echo "Made: $APP"
echo "Double-click it to play. Drag it to your Dock to keep it handy."
