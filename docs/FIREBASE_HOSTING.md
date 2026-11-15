# Deploying Field Shift to Firebase Hosting

This repository is preconfigured with `firebase.json` (`"public": "web/dist"`) and automatic sample-data generation during `npm run build` (when real `data/` files are absent).

## Option 1: Deploy from your computer (fastest — gets your `.web.app` link in ~1 minute)

1. Install Node.js 18+ and log in to Firebase:
   ```bash
   npx firebase-tools login
   ```
2. Create a Firebase project (or pick an existing one) in the [Firebase Console](https://console.firebase.google.com/), and copy your **Project ID** (for example `field-shift-lk`).
3. From the repository root, build and deploy Hosting:
   ```bash
   cd web && npm ci && npm run build && cd ..
   npx firebase-tools deploy --only hosting --project YOUR_PROJECT_ID
   ```
   *(Use `--only hosting` first so it deploys immediately even if Firestore has not been enabled in your Firebase project yet. `firebase.json` also includes a `predeploy` hook that runs `scripts/firebase_predeploy.mjs` automatically.)*
4. Firebase will print your live link:
   - `https://YOUR_PROJECT_ID.web.app` (main dashboard)
   - `https://YOUR_PROJECT_ID.web.app/farm` (farmer link)
   - `https://YOUR_PROJECT_ID.web.app/2021` (2021 evaluation report)
   - `https://YOUR_PROJECT_ID.web.app/data` (datasets page)

### Optional: Enable shared Firestore plans & SMS register
1. In the Firebase Console, enable **Firestore Database** and register a **Web app** to get `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, and `appId`.
2. Put those values in `web/.env.local` (or in `key.txt` at the repo root and run `node scripts/make_env.mjs`).
3. Deploy both Hosting and Firestore rules:
   ```bash
   npx firebase-tools deploy --project YOUR_PROJECT_ID
   ```

## Option 2: Auto-deploy from GitHub Actions

`.github/workflows/firebase-hosting.yml` builds and deploys automatically on pushes to `main` once you add these in **GitHub → Settings → Secrets and variables → Actions**:
- `FIREBASE_PROJECT_ID` (Variable or Secret): your Firebase Project ID
- `FIREBASE_SERVICE_ACCOUNT` (Secret): JSON key for a service account with **Firebase Hosting Admin** permission
- *(Optional)* `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
