# Google Sign-In: the three SHA-1 fingerprints — exactly what to do

**Why this matters:** on Android, Google identifies your app by *package name + signing
certificate*. It does not use the client ID alone. If the certificate that signed the
running app isn't registered, sign-in fails with a generic "no credential available"
and no useful error. This is the single most common "worked in testing, broken on Play"
failure, because the certificate changes between your machine and Play.

Your values:

| | |
|---|---|
| Package name | `in.projectlab.app` |
| Google Cloud project | the one owning client ID `103128869471-…` |
| Web client ID (already working) | `103128869471-b2fmcg7pinr1igftm5rmjocfv0lj6i5t.apps.googleusercontent.com` |

---

## The key thing to understand

You need an **Android OAuth client** in Google Cloud Console, and it must carry **three**
SHA-1s. This is separate from the Web client ID above — the Web client stays as-is
(it's what the API verifies tokens against). The Android client is what authorises the
app to *request* a credential.

**Fingerprint #3 cannot be obtained until after you upload your first AAB.** So this is
a two-visit job, not one. Do steps 1–3 now, ship to internal testing, then do step 4.

---

## Step 1 — Debug SHA-1 (you already have this)

```
C5:33:64:28:F0:A2:53:39:CA:F5:C8:C2:CE:B0:72:B1:50:6D:2F:97
```

Verified on this machine. Regenerate any time with:

```bash
keytool -list -v -keystore ~/.android/debug.keystore \
  -alias androiddebugkey -storepass android -keypass android
```

This one makes sign-in work when you run a debug build from your own machine. It is
**not** the one that matters for real users.

---

## Step 2 — Upload-key SHA-1 (after you create the keystore)

You have not created the release keystore yet — see §1 of `PLAY-CHECKLIST.md`. Once you
have `financial-blueprint-upload.jks`:

```bash
keytool -list -v -keystore /path/to/financial-blueprint-upload.jks -alias upload
```

Copy the `SHA1:` line.

---

## Step 3 — Register both in Google Cloud Console

1. Go to <https://console.cloud.google.com/apis/credentials>
2. Select the project that owns client ID `103128869471-…`
3. Look for an existing **OAuth 2.0 Client ID** of type **Android**.
   - If one exists → click it.
   - If not → **+ Create credentials → OAuth client ID → Application type: Android**.
4. Set **Package name** to exactly: `in.projectlab.app`
5. Paste the **debug SHA-1** from step 1 into the SHA-1 field.
6. Save.
7. Reopen it and **add a second SHA-1** — the upload key from step 2.
   (One Android client can hold several fingerprints; you do not need a client each.)

> Changes can take 5 minutes to propagate. If sign-in fails immediately after editing,
> wait before concluding it's broken.

---

## Step 4 — Play's app-signing SHA-1 (AFTER your first upload)

This is the one people miss, and it is the one that affects **every real user**.

Play App Signing re-signs your app with Google's own key before distributing it. So the
certificate on the APK a user installs is **not** your upload key. Google therefore sees
a fingerprint you never registered, and refuses the credential.

Once you have uploaded any AAB (internal testing is enough):

1. Play Console → your app → **Release → Setup → App signing**
2. Under **App signing key certificate**, copy the **SHA-1 certificate fingerprint**
3. Add it to the same Android OAuth client from step 3, as a third SHA-1

---

## Step 5 — Test it the way that actually proves it

**Do not test with a release APK built and installed locally.** That APK is signed with
your *upload* key, so it exercises fingerprint #2 and tells you nothing about whether #3
is right. It will pass, and then production will fail.

Correct test:

1. Upload the AAB to the **Internal testing** track
2. Install it **through the Play Store link** on a real device (this is the build Play
   re-signed — the same one users get)
3. Sign in with Google
4. Sign out, then sign in again with the same account — this also exercises the
   re-login path

If it fails, the error is now visible: the swallow-any-message-containing-"cancel"
filter in `Login.jsx` was fixed, so genuine SDK errors surface instead of leaving the
button silently dead.

---

## Quick checklist

- [ ] Debug SHA-1 registered (`C5:33:…:2F:97`)
- [ ] Release keystore created and backed up
- [ ] Upload-key SHA-1 registered
- [ ] Android OAuth client package name is `in.projectlab.app`
- [ ] First AAB uploaded to Internal testing
- [ ] **Play app-signing SHA-1 registered** ← the one that breaks production
- [ ] Google Sign-In tested from a Play-installed internal-testing build
- [ ] Re-login with the same account tested

---

## If sign-in still fails

Check in this order — it's almost always one of the first three:

1. **Package name mismatch.** Must be `in.projectlab.app`, not the Play listing name.
2. **Missing Play app-signing SHA-1** (step 4). By far the most likely.
3. **Waited long enough?** Console changes take a few minutes.
4. **`VITE_GOOGLE_CLIENT_ID` baked into the build.** It ships in `.env.production`; the
   API verifies against the same value as `GOOGLE_CLIENT_ID`. If the API's env var
   differs from the app's, every token is rejected with "Invalid Google credential".
5. **OAuth consent screen not published.** While in "Testing" mode only accounts on the
   test-users list can sign in. Publish it before production release.
