# Android Distribution Guide

## 1) Prepare signing key
Create a release keystore (one-time):

```powershell
keytool -genkeypair -v -keystore ..\keys\release-key.jks -alias release -keyalg RSA -keysize 2048 -validity 10000
```

Then copy and configure signing properties:

```powershell
Copy-Item keystore.properties.example keystore.properties
```

Edit `keystore.properties` with your actual values.

## 2) Build release artifacts
From the `android` folder:

- Build Play Store bundle (recommended):

```powershell
.\gradlew.bat bundleRelease
```

Output:
- `app\build\outputs\bundle\release\app-release.aab`

- Build signed APK:

```powershell
.\gradlew.bat assembleRelease
```

Output:
- `app\build\outputs\apk\release\app-release.apk`

## 3) Verify artifact signing (optional)

```powershell
& "$env:ANDROID_HOME\build-tools\36.1.0\apksigner.bat" verify --verbose --print-certs .\app\build\outputs\apk\release\app-release.apk
```

Expected result:
- `Verifies`
- `Verified using v2 scheme (APK Signature Scheme v2): true`

Notes:
- If `$env:ANDROID_HOME` is not set, use your SDK path directly (for example `C:\Users\<you>\AppData\Local\Android\Sdk`).
- `jarsigner` may not be on PATH on some machines; `apksigner` is included with Android build-tools.

## Notes
- Release builds require `keystore.properties`; Gradle will fail early if it is missing.
- Keep your keystore and passwords secure and backed up.
- For Google Play, prefer uploading the `.aab` file.

## Troubleshooting
- `jarsigner : not recognized`: use `apksigner` from Android build-tools (as shown above).
- `ANDROID_HOME` not set: run PowerShell `$env:ANDROID_HOME = "C:\Users\<you>\AppData\Local\Android\Sdk"` for the current session.
- `apksigner.bat` not found: check installed versions under `C:\Users\<you>\AppData\Local\Android\Sdk\build-tools\` and update the version in the command.
- Signature check fails: rebuild with `.\gradlew.bat assembleRelease` and verify again against `app\build\outputs\apk\release\app-release.apk`.

## Important notes and debug output

- An example keystore file is provided as `keystore.properties.example` — copy it and fill in real values before running release builds.
- The repository `.gitignore` ignores `keystore.properties` to avoid committing secrets. Do not commit your real `keystore.properties`.
- If you want to test locally, a successful debug build produces `app\build\outputs\apk\debug\app-debug.apk`.
