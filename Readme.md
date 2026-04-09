# POS App

Lightweight Point-of-Sale (POS) terminal built with Ionic 8 + Angular 20 and Capacitor for Android.

**Features:** sales, inventory, customers, transactions, charts, offline sync, and CI-built APK releases.

**System Requirements**
- **Node.js:** 22.x or newer
- **npm:** bundled with Node
- **Java JDK:** 21 (for Android Gradle builds)
- **Android SDK / Android Studio:** required for building APKs and signing
- **Capacitor:** v8 (configured in the project)
- **Ionic CLI (optional):** for local development and debugging
- **Git:** for cloning and working with repository

**Project links**
- Repository: https://github.com/Subhnegi/POS
- Live demo (GitHub Pages): https://subhnegi.github.io/POS

**Quick start (web development)**
1. Clone the repo and open the app folder:

```bash
git clone https://github.com/Subhnegi/POS.git
cd POS/pos-app
```

2. Install dependencies:

```bash
npm install
```

3. Run the dev server:

```bash
npx ng serve --open
```

4. Build (production):

```bash
npm run build
```

**Android (debug APK) - local**
1. Add Android platform (only once):

```bash
npx cap add android
```

2. Sync web assets to Android and build:

```bash
npx cap sync android
cd android
./gradlew assembleDebug   # macOS / Linux
gradlew.bat assembleDebug  # Windows
```

APK output will be in `android/app/build/outputs/apk/debug/`.

**CI / Releases / Auto-update**
- The project's CI (GitHub Actions) builds an APK and creates a GitHub Release. The app embeds a build tag in `src/environments/environment.prod.ts` (injected by CI) and on startup checks GitHub Releases for a newer tag.
- Auto-update behavior: the app fetches `https://api.github.com/repos/Subhnegi/POS/releases/latest`, compares the release tag with the embedded `appVersion`, and prompts users on native platforms to download the APK from the release assets.
- See workflow: `.github/workflows/build-apk.yml` for details on tagging and release creation.

**Environment placeholders**
- Local/dev: `src/environments/environment.ts` contains `appVersion: '1.0.0'` for development.
- CI/production: `src/environments/environment.prod.ts` contains `appVersion: '__APP_VERSION__'` which the CI replaces with the release tag.

**Notes & Troubleshooting**
- On mobile, opening the APK uses Capacitor Browser plugin; ensure `@capacitor/browser` is installed and the device allows installing from unknown sources for debug APKs.
- For Play Store distribution, sign the APK and publish through the Play Console (this project currently creates debug APKs in CI).

