#!/usr/bin/env bash
# 캠스터디 모바일 웹앱을 안드로이드 앱(APK)으로 감싸 만든다 (GitHub Actions에서 실행)
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${WORK:-/tmp/capapp}"
rm -rf "$WORK" && mkdir -p "$WORK/www/fonts" && cd "$WORK"

cp "$REPO/camstudy-m.html" www/index.html
cp "$REPO/fonts/Paperlogy-4Regular.ttf" "$REPO/fonts/Paperlogy-7Bold.ttf" www/fonts/
cp "$REPO/camstudy-m-icon-192.png" "$REPO/camstudy-m-icon-512.png" www/

npm init -y >/dev/null
npm i @capacitor/core@6 @capacitor/cli@6 @capacitor/android@6 >/dev/null
npx cap init "캠스터디" com.ilavty.camstudy --web-dir www
npx cap add android

PKG=android/app/src/main/java/com/ilavty/camstudy
mkdir -p "$PKG"
cp "$REPO/android-app/FaceDetectPlugin.java" "$REPO/android-app/MainActivity.java" "$PKG/"

python3 - <<'PY'
import os, re, pathlib
g = pathlib.Path("android/app/build.gradle"); s = g.read_text()
s = s.replace("dependencies {", "dependencies {\n    implementation 'com.google.mlkit:face-detection:16.1.6'", 1)
s = re.sub(r"versionCode \d+", "versionCode " + os.environ.get("GITHUB_RUN_NUMBER", "1"), s, 1)
g.write_text(s)
m = pathlib.Path("android/app/src/main/AndroidManifest.xml"); t = m.read_text()
t = t.replace("</manifest>", '    <uses-permission android:name="android.permission.CAMERA" />\n    <uses-feature android:name="android.hardware.camera" android:required="false" />\n</manifest>')
m.write_text(t)
PY

# 앱 아이콘
pip install pillow >/dev/null 2>&1 || true
export REPO
python3 - <<'PY'
from PIL import Image
import os, pathlib, shutil
src = Image.open(os.environ["REPO"] + "/camstudy-m-icon-512.png").convert("RGBA")
res = pathlib.Path("android/app/src/main/res")
for d, px in (("mdpi",48),("hdpi",72),("xhdpi",96),("xxhdpi",144),("xxxhdpi",192)):
    for n in ("ic_launcher.png","ic_launcher_round.png","ic_launcher_foreground.png"):
        src.resize((px,px), Image.LANCZOS).save(res/f"mipmap-{d}"/n)
shutil.rmtree(res/"mipmap-anydpi-v26", ignore_errors=True)
PY

# 항상 같은 키로 서명해야 나중에 새 버전을 덮어 설치해도 기록이 안 지워진다
mkdir -p ~/.android && cp "$REPO/android-app/debug.keystore" ~/.android/debug.keystore

cd android
chmod +x gradlew
./gradlew assembleDebug --no-daemon -q
ls -la app/build/outputs/apk/debug/
