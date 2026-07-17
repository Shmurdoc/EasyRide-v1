@echo off
set CI=true
set JAVA_HOME=C:\Users\madoc\.jdks\temurin17\jdk-17.0.18+8
cd /d F:\EasyRyde\mobile\apps\driver

echo Exporting JS bundle...
call npx expo export:embed --platform android --entry-file index.js --bundle-output "%TEMP%\driver.android.bundle" --assets-dest "%TEMP%\driver-assets" --dev false
if errorlevel 1 (
    echo Bundle export failed!
    exit /b 1
)
echo Bundle exported successfully.

echo Building release APK...
cd android
call gradlew.bat assembleRelease -PreactNativeArchitectures=armeabi-v7a
if errorlevel 1 (
    echo Build failed!
    exit /b 1
)
echo Build complete!
