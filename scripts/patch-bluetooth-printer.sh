#!/bin/bash
# Patch react-native-bluetooth-escpos-printer for modern Android SDK
# This runs automatically after npm install (via postinstall in package.json)
set -e

GRADLE_FILE="node_modules/react-native-bluetooth-escpos-printer/android/build.gradle"
JAVA_FILE="node_modules/react-native-bluetooth-escpos-printer/android/src/main/java/cn/jystudio/bluetooth/RNBluetoothManagerModule.java"

if [ ! -f "$GRADLE_FILE" ]; then
  echo "Warning: $GRADLE_FILE not found — skipping patch"
  exit 0
fi

echo "Patching react-native-bluetooth-escpos-printer for modern Android SDK..."

# Patch build.gradle: jcenter -> mavenCentral, AGP 3.1.4 -> 8.1.0, SDK 27 -> 34, support-v4 -> androidx.core
sed -i '' \
  -e 's|jcenter { url "http://jcenter.bintray.com/" }|mavenCentral()|g' \
  -e 's|maven {url "http://repo.spring.io/plugins-release/"}|maven {url "https://repo.spring.io/plugins-release/"}|g' \
  -e "s|classpath 'com.android.tools.build:gradle:3.1.4'|classpath 'com.android.tools.build:gradle:8.1.0'|g" \
  -e 's/compileSdkVersion 27/compileSdk 34/g' \
  -e 's/buildToolsVersion "27.0.3"/buildToolsVersion "34.0.0"/g' \
  -e 's/minSdkVersion 16/minSdkVersion 24/g' \
  -e 's/targetSdkVersion 24/targetSdkVersion 34/g' \
  -e "s|implementation group: 'com.android.support', name: 'support-v4', version: '27.0.0'|implementation 'androidx.core:core:1.12.0'|g" \
  -e 's/"com.google.zxing:core:3.3.0"/"com.google.zxing:core:3.5.2"/g' \
  -e 's/compile fileTree/implementation fileTree/g' \
  "$GRADLE_FILE"

# Add namespace to android block if not present
if ! grep -q 'namespace "cn.jystudio.bluetooth"' "$GRADLE_FILE"; then
  sed -i '' 's/android {/android {\n    namespace "cn.jystudio.bluetooth"/' "$GRADLE_FILE"
fi

# Patch Java file: android.support.v4 -> androidx.core
if [ -f "$JAVA_FILE" ]; then
  sed -i '' \
    -e 's/import android.support.v4.app.ActivityCompat;/import androidx.core.app.ActivityCompat;/g' \
    -e 's/import android.support.v4.content.ContextCompat;/import androidx.core.content.ContextCompat;/g' \
    "$JAVA_FILE"
  echo "Java file patched."
fi

echo "Patch complete."
