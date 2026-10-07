# Sano Bir rebrand — implementation (7 Oct 2026)

**Chosen by owner:** “ok lets go with little hero, do it” (7 Oct 2026). Brand: **Sano Bir / सानो वीर** — "little hero", hero-star mark from the brand-identity round (see `DELIVERY/t1d-saathi-branding/`).

## What changed

- **app.json** — display name “Sano Bir”; regenerated icon paths; Android `adaptiveIcon` background #F2604A (foreground/background/monochrome images); web `themeColor` #0B4F4A + description; iOS camera/photo usage strings; image-picker permission strings; notifications icon → monochrome star, color #F2604A; **splash config updated** in `app.config.js` (splash tile on deep-teal #0B4F4A; camera permission string renamed).
  - Unchanged on purpose: slug `T1d-sathi`, scheme, `com.t1dsaathi.app` package/bundle IDs, EAS projectId (no store-breaking changes).
- **assets/** — regenerated from the approved SVG: `icon.png` (1024, full-bleed coral hero star), `android-icon-foreground.png` (safe-zone scaled), `android-icon-background.png`, `android-icon-monochrome.png`, `splash-icon.png` (rounded tile on transparent), `favicon.png` (96).
- **UI strings** — login (name + tagline “Every child is brave / हरेक बच्चा वीर छ”), onboarding, home header, settings (version + medical disclaimer), low-glucose alert texts (EN/NE), invite messages, reminder default title, PDF report header, supabase log tag, i18n `appName` + tagline. Comments updated in utils/theme.
- **PWA icons + manifest** — `public/icons/*` regenerated (192 / 512 / maskable / apple-touch), manifest name/short_name/colors updated, service-worker cache bumped, apple title updated.
- **Invite codes** — new prefix `SB-` (was `T1D-`); older `T1D-…` codes remain valid (codes stored as plain strings server-side; no format validation).
- **README + clinician portal** (`portal/`: page title, `<h1>`, header logo text) updated.
- **Kept clinical “T1D” wording** where it refers to the condition (education content, “Date of T1D Diagnosis”) — per brand rules the disease name never becomes the brand.

## Verification (all on this change set)

- `tsc --noEmit` → exit 0.
- `npm run validate` (repo safety validator) → pass.
- `jest` → 43/43 tests pass.
- Web export rebuilt + served (:8080); screenshots: `docs/screenshots/2026-10-07/rebrand-{login,home,settings,home-mobile}.png`; **zero page errors**; body text confirms the new name on login/home/settings (EN + mobile).
- Leftover scan: no `T1D Saathi` / `T1D साथी` strings remain in app surfaces (only `docs/` history, the repo folder name, and clinical `T1D` mentions).

## Notes / follow-ups

- Native splash, adaptive-icon masks and the notification icon appear on the **next EAS build** (owner-triggered; not run in this round).
- Device test recommended for native splash/mask rendering; confirm Play Store listing name at publish time.
- Trademark / company-registry check remains recommended before public launch (as per brand review).
- Cross-device photo upload and other backlog items are unaffected by this change.
