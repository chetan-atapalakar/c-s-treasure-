# CüS Treasure – Android APK (add-only files)

No existing file was changed. New files: capacitor.config.json, index.android.html, vite.config.android.js,
src/main.android.jsx, src/native/NativeBridge.jsx, src/components/OfflineBanner.jsx, assets/*, scripts/patch-android.mjs,
.github/workflows/android-debug.yml, ANDROID.md.

## Get the APK (no installs on your computer)
1. Upload these new files to your GitHub repo (Add file > Upload files; keep the folder names).
2. Repo > Settings > Secrets and variables > Actions > New repository secret: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (anon/public key only).
3. Actions tab > "Build Android debug APK" > Run workflow. When green, open the run and download artifact cus-treasure-debug-apk.
4. Unzip it, send app-debug.apk to your phone, open it, allow "install unknown apps".

## Limitations
- Not built or tested yet.
- Use email + password login in the app. "Continue with Google" will not work inside the app without editing existing files.
- Settings > export (JSON/CSV) may not save on Android.
- Email confirm / password-reset links open in the browser.
- Debug APK only; needs internet.
