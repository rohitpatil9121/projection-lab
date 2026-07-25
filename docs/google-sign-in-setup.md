# Sign in with Google — setup

The code is already wired. What's left is the Google Cloud configuration, which only
the account owner can do, plus three environment variables.

Until `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` are set, the Google button stays
hidden and `POST /v1/auth/google` returns `503` — nothing else is affected.

## Why Android needs its own client

Google refuses OAuth inside embedded WebViews (`403: disallowed_useragent`), so the
browser flow cannot work inside the APK. The app therefore takes two routes to the
same destination:

| Platform | How it gets an ID token |
| --- | --- |
| Web | Google Identity Services (`accounts.google.com/gsi/client`) |
| Android | Native sign-in via `@capgo/capacitor-social-login` |

Both return an ID token whose **audience is the Web client ID** — on Android that is
what `webClientId` asks for. So the API verifies both with a single audience, and
`GOOGLE_CLIENT_ID` is always the **Web** client ID, never the Android one.

## 1. Google Cloud Console

1. <https://console.cloud.google.com> → create a project (e.g. `financial-blueprint`).
2. **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name, support email, developer email
   - Scopes: `email`, `profile`, `openid`
   - While in **Testing**, only accounts listed under *Test users* can sign in.
     Add your own Gmail. Publish the app when you want it open to everyone.

## 2. Web client ID (required — this is the one the API verifies against)

**APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**

- **Authorised JavaScript origins**
  - `http://localhost:5173` (dev)
  - your production web origin, if the web app is hosted
- **Authorised redirect URIs**: none needed (GIS uses the token flow)

Copy the client ID — it looks like `123456789-abc123.apps.googleusercontent.com`.

## 3. Android client ID (required for the APK)

**Create credentials → OAuth client ID → Android**

- **Package name**: `in.projectlab.app`
- **SHA-1 certificate fingerprint**: see below

You never put this ID in code — registering it is what authorises the APK. The app
keeps sending the *Web* client ID as `webClientId`.

### SHA-1 fingerprints

Debug (this machine — already read for you):

```
C5:33:64:28:F0:A2:53:39:CA:F5:C8:C2:CE:B0:72:B1:50:6D:2F:97
```

Regenerate any time with:

```bash
keytool -list -v -keystore ~/.android/debug.keystore \
  -alias androiddebugkey -storepass android -keypass android
```

Release keystore (the one `KEYSTORE_PATH` points at when building the AAB):

```bash
keytool -list -v -keystore /path/to/your-release.jks -alias upload
```

**If you publish to Play Store**: Play App Signing re-signs your app with *Google's*
key, so the SHA-1 users actually run is different from your upload key. Add it too —
**Play Console → Release → Setup → App signing → App signing key certificate → SHA-1**.
Miss this and sign-in works in your local APK but fails for Play Store installs.

Add every fingerprint you need (debug + release + Play) — a client can hold several.

## 4. Environment variables

All three are the **same Web client ID from step 2**.

| Where | Variable |
| --- | --- |
| `apps/api/.env` (local) | `GOOGLE_CLIENT_ID=...` |
| Render → Environment | `GOOGLE_CLIENT_ID=...` (already declared in `render.yaml`) |
| `apps/web/.env.production` | `VITE_GOOGLE_CLIENT_ID=...` |

For local web dev, put it in `apps/web/.env.local` (gitignored):

```
VITE_GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
```

`VITE_*` values are **baked in at build time** and are visible in the shipped bundle.
That is expected and safe — a client ID is public. There is no client *secret*
anywhere in this setup, which is why the ID token is verified server-side instead.

## 5. Verify

```bash
curl -s http://localhost:3001/healthz
# {"auth":{"google":true,...}}   ← google:false means GOOGLE_CLIENT_ID isn't set
```

Then rebuild the web app and the button appears on `/login`.

For the APK:

```bash
npm run build -w web && npm run cap:sync -w web && npm run apk
```

## How the API treats a Google identity

`apps/api/src/google.js` verifies the token's signature, issuer, audience and expiry
via `google-auth-library`, then **requires `email_verified === true`**. Accounts are
keyed on email, so a user who signed up with a password and later uses Google lands on
the same account — safe only because Google has vouched for the address. An unverified
one is rejected rather than trusted.

## Notes

- Only the Google provider is bundled into the APK; Facebook/Apple/Twitter are turned
  off in `capacitor.config.json` under `plugins.SocialLogin.providers` to keep the
  APK small. Re-enable there if ever needed.
- The OTP **button** was removed from the login screen, but the OTP backend stays —
  the password-reset flow uses the same `otps` table.
