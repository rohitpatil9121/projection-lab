# Play Store submission checklist — Financial Blueprint v1.5.0

Status of every item. **DONE** = the file exists in `store-assets/`. **YOU** = needs your
Google account, your password, or a decision only you can make.

| # | Item | Status | Where |
|---|---|---|---|
| 1 | `.aab` file | **YOU** — needs a keystore | see §1 |
| 2 | App icon 512×512 | **DONE** | `store-assets/icon-512.png` |
| 3 | Feature graphic 1024×500 | **DONE** | `store-assets/feature-graphic.png` |
| 4 | Screenshots 9:16 | **DONE** — 6 at 1080×1920 | `store-assets/screenshots/` |
| 5 | Short description (80 char) | **DONE** — 73 chars | `store-assets/listing.md` |
| 6 | Full description (4000 char) | **DONE** — 2,850 chars | `store-assets/listing.md` |
| 7 | Privacy policy | **DONE** — needs public hosting | see §7 |
| 8 | Demo login credentials | **YOU** — required, see §8 | |
| 9 | Play Console account | **YOU** — $25 one-off | see §9 |

---

## §1 — The `.aab` (blocked on a keystore)

**I did not generate the keystore, deliberately.** It is the single most dangerous
credential in an Android project: if you lose it you can never publish an update to
this app again — Google cannot reset it, and the only recovery is publishing a brand
new listing and asking every user to reinstall. It must be created by you, with a
password you choose and store in your own password manager. I should not invent or
hold that password.

Run this yourself, once:

```bash
keytool -genkeypair -v \
  -keystore financial-blueprint-upload.jks \
  -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

It asks for a password and your name/organisation. Then **back the `.jks` file up
somewhere permanent** — not just this laptop.

Build the bundle:

```bash
KEYSTORE_PATH=/absolute/path/to/financial-blueprint-upload.jks \
KEYSTORE_PASSWORD='your-password' \
KEY_ALIAS=upload \
KEY_PASSWORD='your-password' \
npm run aab
```

Output: `FinancialBlueprint-release.aab` in the repo root.

The build now **fails loudly** if those variables are missing. It used to emit an
unsigned bundle silently, which Play rejects at upload with an unhelpful error.

`.gitignore` already covers `*.jks` — do not commit the keystore.

---

## §2–4 — Assets (done)

- `icon-512.png` — 512×512, 5 KB, no alpha. Full-bleed on brand `#377cc8`, because Play
  applies its own rounded mask; shipping the already-rounded source on transparency
  would render doubly-rounded and inset.
- `feature-graphic.png` — 1024×500, 131 KB. Source SVG alongside it if you want edits.
- `screenshots/` — 6 × 1080×1920 (exact 9:16), captured from the real app running the
  HNI sample plan. Play needs at least 2; you can upload all 6.

Regenerate screenshots any time with the dev server running:

```bash
npm run dev -w web        # in one terminal
node scripts/capture-screenshots.mjs
```

---

## §7 — Privacy policy (hosting is the remaining step)

The policy is written and now accurately describes in-app account deletion. It lives at
`apps/web/public/privacy-policy.html` and is served by the API at
`https://projection-lab.onrender.com/privacy-policy.html`.

**Do not submit that URL.** Render's free tier spins the service down after inactivity,
so a reviewer opening a cold link waits 30–60 seconds or times out — a common listing
rejection. Host the file statically instead (GitHub Pages, Netlify, Cloudflare Pages —
all free and always-on) and submit that URL.

Play also asks for a **data deletion URL** separately. A single page explaining
"Settings → Delete my account, or email rohit1817g@gmail.com" satisfies it.

---

## §8 — Demo credentials: YES, you do need them

> **Corrects an earlier version of this file**, which said credentials were unnecessary
> because "Go with sample data" exposes the whole app. That reasoning missed two
> account-only features — one of which Play specifically enforces.

On the **Sign-in details** declaration (formerly "App access"), answer **Yes — part of
the app is restricted**, and supply a working account.

Two things a signed-out reviewer cannot reach:

1. **Cloud backup and sync** — the entire purpose of having accounts.
2. **Settings → Delete my account** — rendered as `{auth && (<Row … />)}` in
   `apps/web/src/pages/Settings.jsx`, so it is *invisible* when signed out.

The second is the reason this matters. Play **requires** in-app account deletion and a
reviewer will look for it; without credentials they cannot see that it exists, and may
reject the app on the very requirement the feature was built to satisfy.

Create the account yourself through the app's normal sign-up against the production API,
then verify you can log in with it. Do not reuse a personal account.

Instructions to paste into the "Any other instructions" box:

```
Most of the app needs no account. On the sign-in screen tap "Go with sample data"
and pick any sample profile to explore every screen fully populated.

These credentials are only needed to review the two account-only features:
1. Cloud backup and sync of the user's plan.
2. Settings > Support > "Delete my account", which permanently deletes the account
   and all server data. This row is only visible when signed in.

Note: deleting the account will invalidate these credentials, so please review that
flow last, or ask us for a fresh account.
```

That last line matters: account deletion genuinely destroys the account, so a reviewer
who tests it and then returns to something else will find the login broken.

---

## §9 — Play Console account (you)

- One-time US$25 registration at <https://play.google.com/console/signup>.
- Individual developers must complete identity verification (government ID + address);
  this can take a few days, so start it before you need it.
- As of 2023 a **personal** developer account also needs 12 testers opted in to a closed
  test for 14 continuous days before you can apply for production. An organisation
  account skips this. Plan for it — it is the longest lead time in this whole list.

---

## Before you upload — the SHA-1 step

Google Sign-In breaks for real users unless three SHA-1 fingerprints are registered:
debug, your upload key, and **Play's app-signing key**. The third can only be obtained
after your first upload, so it is a two-visit job.

**Step-by-step instructions: `store-assets/SHA1-SETUP.md`.**

---

## Pro / paid tier — removed for this release

The "Go Pro" upsell has been taken out entirely (not just the price): the modal,
the sidebar "Upgrade to Pro" card, and the Settings "Subscription" section are gone,
and the server's plan-limit message no longer says "Upgrade to Pro".

Reason: a priced offering with a button that does nothing is a Play "broken
functionality" flag, and you would be declaring *"in-app purchases: No"* while showing
₹149/mo. The app is now unambiguously free, which is also the honest description.

**Answer "No" to both "Contains ads" and "In-app purchases".**

To bring it back when billing is real, restore these from git:
`apps/web/src/components/ProModal.jsx`, the Pro card in `Sidebar.jsx`, and the
Subscription section in `Settings.jsx`. Note the old card claimed "500-run simulation"
— that was already wrong, the app offers up to 1000 runs. Fix that if you reuse it.
