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

## Closed testing release checklist
- Run `npm run build` from the workspace root.
- Run `npx cap sync android` from the workspace root so the Android app picks up the latest web assets.
- From `android`, run `.\gradlew.bat assembleDebug` for a smoke-test APK.
- From `android`, run `.\gradlew.bat bundleRelease` for the Play Console upload bundle.
- Verify the final release artifact and confirm the app opens, restores auth, checks attendance, opens notebooks, and returns correctly on Android back navigation.
- Upload `app\build\outputs\bundle\release\app-release.aab` to a Google Play closed testing track.

## Student QA matrix
- Launch and splash screen feel branded and edge-to-edge on Android.
- Sign-in restores correctly after app relaunch.
- Student lands on the Android-first home surface, not the desktop dashboard layout.
- Bottom navigation works: `Home`, `Modules`, `Attendance`, `Notebook`, `Profile`.
- `Modules` opens the Android course shell and unit rail.
- QR attendance works for scan and token entry.
- Tutorial notebook, contact notebook, gallery, and resource flows open and return correctly.
- Offline mode messaging appears and the app recovers when the connection returns.
- Hardware back returns from course content to the Android student shell before exiting the app.

## Play Console preparation
- Confirm the privacy policy URL and Data Safety answers in Play Console before production rollout.
- Use closed testing feedback to confirm camera permission copy, account recovery flows, and device compatibility before broad release.
- Capture updated phone screenshots from the Android-first student shell instead of the desktop-style web layout.

## Troubleshooting
- `jarsigner : not recognized`: use `apksigner` from Android build-tools (as shown above).
- `ANDROID_HOME` not set: run PowerShell `$env:ANDROID_HOME = "C:\Users\<you>\AppData\Local\Android\Sdk"` for the current session.
- `apksigner.bat` not found: check installed versions under `C:\Users\<you>\AppData\Local\Android\Sdk\build-tools\` and update the version in the command.
- Signature check fails: rebuild with `.\gradlew.bat assembleRelease` and verify again against `app\build\outputs\apk\release\app-release.apk`.

## Important notes and debug output

- An example keystore file is provided as `keystore.properties.example` — copy it and fill in real values before running release builds.
- The repository `.gitignore` ignores `keystore.properties` to avoid committing secrets. Do not commit your real `keystore.properties`.
- If you want to test locally, a successful debug build produces `app\build\outputs\apk\debug\app-debug.apk`.
