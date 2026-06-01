# Polardex — App Store listing pack

Everything needed to submit Polardex to the App Store as an **unlisted** app.
Copy/paste the text below into App Store Connect. Items marked **TODO** need a
value from you.

---

## 0. Before you start
- **Privacy policy** lives at `public/privacy.html`. Two things to do:
  1. Replace `CONTACT_EMAIL` in that file with a real support email (**TODO**).
  2. Deploy the web app (`npm run build && firebase deploy --only hosting`) so the
     page goes live at **https://polardex-prod.web.app/privacy.html**
     (or your custom domain if you have one).
- Make sure the latest **production build** (with auth + OTA) is uploaded and shows
  in App Store Connect.

---

## 1. App information (App Store Connect → App Information)
- **Name:** Polardex
- **Subtitle** (≤30 chars): `Your Pokémon TCG Pokédex`
- **Privacy Policy URL:** `https://polardex-prod.web.app/privacy.html`
- **Category:** Primary **Utilities**, Secondary **Reference**
- **Content Rights:** Does not contain, show, or access third-party content (your
  card data comes from public APIs; you're not redistributing protected content).

## 2. Pricing
- **Free.** No in-app purchases.

## 3. Age rating
- Answer **None / No** to every question in the questionnaire → rating **4+**.

## 4. Version information (the 1.0.0 version page)

**Promotional text** (≤170 chars):
```
Scan a card to add it in a tap. Track your sets, see what you're still missing, and watch your collection grow — a fast, beautiful Pokédex for your pocket.
```

**Description:**
```
Polardex is the fastest, most delightful way to track your Pokémon TCG collection.

SCAN TO ADD
Point your camera at a card and Polardex identifies it on-device and adds it in a
single tap — no typing, no fuss. Perfect for adding cards while you're at the store.

BROWSE EVERY SET
Explore the full set list with live completion progress, and see exactly which cards
you still need with Owned / Missing filters.

YOUR COLLECTION, BEAUTIFULLY
Search and sort your whole collection, track quantities and variants, and keep an eye
on its value. A clean overview shows your stats and top sets at a glance.

BUILT TO FEEL GREAT
A modern "liquid glass" interface, thoughtful motion, light and dark themes, and
Face ID to keep your collection yours.

Polardex is unofficial and not affiliated with Nintendo or The Pokémon Company.
```

**Keywords** (≤100 chars, comma-separated):
```
pokemon,tcg,cards,collection,tracker,pokedex,scan,sets,trading,binder,checklist
```

**Support URL:** `https://polardex-prod.web.app` (**TODO**: confirm this loads; Apple
requires a reachable support page. The privacy page URL also works.)

**Marketing URL** (optional): leave blank or your site.

**What's New in This Version:**
```
First release — scan cards to add them instantly, browse every set, track your
collection and its value, switch light/dark, and unlock with Face ID.
```

**Copyright:** `2026 Ashley Bronca` (**TODO**: confirm name)

---

## 5. App Privacy (App Store Connect → App Privacy) — exact answers
Click "Get Started" and answer:

- **Do you collect data from this app?** → **Yes**

Add these data types:
| Data type | Collected? | Linked to user? | Used for tracking? | Purpose |
|---|---|---|---|---|
| **Identifiers → User ID** | Yes | Yes | No | App Functionality |
| **User Content → Other User Content** (the collection + notes) | Yes | Yes | No | App Functionality |

Everything else → **not collected**, specifically:
- **Camera / Photos:** NOT collected — scanning runs on-device; images are never
  stored or transmitted (only recognised text is sent to the public card API).
- Contact Info, Location, Health, Financial, Browsing/Search history, Diagnostics,
  Purchases, Usage Data → **None**.
- **Tracking:** **No** — the app does not track users across apps/websites.

---

## 6. Screenshots (required — at least 1)
Apple now requires the **6.9" iPhone** size: **1320 × 2868** portrait.

Easiest capture:
1. `cd mobile && npx expo start`, press `i` to open the **iPhone 16 Pro Max**
   simulator (a 6.9" device) running a dev/preview build — or take them on a real
   6.9" phone.
2. Navigate to a screen, then in the simulator: **File → Save Screen** (`⌘S`), or
   Device → Trigger Screenshot. They save at the correct resolution.

Suggested 5 shots (great story order):
1. **Collection** grid full of cards
2. **Sets** list with completion progress bars
3. A **Set detail** 3-col grid with owned ticks
4. **Scan** — the match card rising over the camera
5. **Overview** dashboard (value + top sets)

(Login screen is a nice optional 6th.)

---

## 7. Make it Unlisted
Unlisted apps don't appear in search, charts, or category browsing — only people
with the direct link can install them. Steps:

1. Finish the metadata above and **submit the app for review** as normal (unlisted
   apps still go through review).
2. Request unlisted distribution here:
   **https://developer.apple.com/contact/request/unlisted-app-distribution/**
   - App name: Polardex
   - **Apple ID (App Store Connect app ID): 6775181038**
   - Reason: personal/limited-audience app shared via direct link.
3. Apple reviews the request and, once granted, the app is delivered via a private
   App Store link you can share. (You can submit this request before or after the
   review finishes; granting it switches distribution to unlisted.)

---

## 8. Final submit checklist
- [ ] `CONTACT_EMAIL` replaced in `public/privacy.html`, web redeployed, URL loads
- [ ] Latest production build uploaded & selected on the version page
- [ ] Description, keywords, promo text, what's-new filled
- [ ] Support URL + Privacy Policy URL set and reachable
- [ ] App Privacy answered (User ID + User Content; tracking = No)
- [ ] Age rating completed (4+)
- [ ] 5 screenshots (1320×2868) uploaded
- [ ] Submit for Review
- [ ] Submit the Unlisted distribution request (#7)
