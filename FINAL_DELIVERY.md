# SkipCam web application delivery

Updated: 2026-11-25. Statuses reflect checks performed against source, production and release services.

## Product and source

- **VERIFIED — GitHub repository:** [asintha1a/skipcam](https://github.com/asintha1a/skipcam) is public and maintained by Self Graphic Lab. The authenticated GitHub identity is `asintha1a`.
- **VERIFIED — Published source:** The standalone web toolkit and supporting documentation are committed on `main`; see the latest repository history for the current commit. The original QR Snip upstream remains fetch-only, and its MIT license, copyright and provenance remain preserved.
- **VERIFIED — Product architecture:** The web app reuses the extension's decoder, encoder, parser, and URL inspection modules. Website output, Chromium extension, and Firefox extension build independently. The extension source still builds with the shared-module updates.

## Production website

- **VERIFIED — Official production URL:** [https://skipcam.selfgraphic.tech/](https://skipcam.selfgraphic.tech/) responds HTTP 200 and serves the new tool-first SkipCam web application.
- **VERIFIED — Shareable routes:** `/scan/`, `/generate/`, and `/history/` respond HTTP 200. The web manifest, service worker, `robots.txt`, and `sitemap.xml` also respond HTTP 200.
- **VERIFIED — Vercel production deployment:** [Deployment](https://skipcam-5dx5mvmse-asinthadilhara37-collabs-projects.vercel.app/) reached READY. Deployment ID: `dpl_EecK6YmY2eyrC4LnsXPdfLv9xeMn`.
- **VERIFIED — Browser functionality:** 15 automated scenarios passed against the live custom domain in installed Chrome using a temporary isolated profile. Tests cover image upload/decode, all seven formats, PNG/SVG export, clipboard paste, drag-and-drop, crop mapping, multiple QR detection, offline URL warnings, local history, mobile layout, PWA offline operation, and simulated screen capture with immediate stream shutdown. No page or console errors occurred.
- **VERIFIED — Privacy behavior in tested flows:** QR processing is local; history starts disabled; URLs require an explicit open click; user images, scan results and screen streams are not cached by the service worker.
- **COMPLETED BUT UNVERIFIED — Native screen-share chooser:** The `getDisplayMedia()` path and stream shutdown were exercised with an isolated test stream. The actual browser chooser and selecting a real tab/window/display still need a manual browser check.

## Features delivered

- **VERIFIED — Scanner:** Image upload, drag and drop, paste event, explicit paste button, optional crop, browser-approved screen capture, full-frame scan, multi-code results, decoded content classification, copy actions, explicit link opening and offline URL warnings.
- **VERIFIED — Generator:** URL, plain text, email, telephone, SMS, Wi-Fi and contact-card QR formats; live preview; color, size, error correction and quiet-zone controls; PNG/SVG download and image copy when supported.
- **VERIFIED — History:** Optional per-browser local history with search, filtering, copy, per-item delete and clear controls; disabled by default and sensitive values excluded.
- **VERIFIED — PWA:** Installable manifest, app icons, service worker cache versioning, offline app shell and offline generation after first cache. User images, screen captures and decoded values are excluded from the cache.

## Tests and browser coverage

- **VERIFIED — Automated tests:** `npm test` passed all 10 tests.
- **VERIFIED — Lint and builds:** `npm run lint` and `npm run build` completed; Chromium, Firefox and website outputs were generated independently.
- **VERIFIED — Production browser suite:** `SKIPCAM_QA_URL=https://skipcam.selfgraphic.tech npm run test:browser` passed all 15 scenarios in installed Google Chrome with an isolated temporary profile.
- **UNVERIFIED — Native browser and device matrix:** Native screen chooser flow, Firefox/Safari web-app behavior, physical mobile browsers and full interactive extension behavior remain manual checks. The automation simulates screen-share stream acquisition and does not access a personal browser profile.
- **UNVERIFIED — Browser stores:** No Chrome Web Store or Firefox Add-ons listing is claimed. Permanent Firefox installation requires Mozilla signing.

## Releases and downloads

- **VERIFIED — Existing beta release:** [v1.0.0-beta.2](https://github.com/asintha1a/skipcam/releases/tag/v1.0.0-beta.2) and its original Chromium and Firefox package links remain available.
- **UNVERIFIED — Package currency:** The web app work updates shared decoder/generator source. The existing beta.2 release archives were not replaced or republished; build outputs in `dist/` contain the current source. Publish a new clearly labeled extension prerelease before treating the downloadable beta.2 archives as current with these shared-module changes.

## Self Graphic Lab portfolio

- **VERIFIED — Existing PR updated:** [Self Graphic Lab portfolio PR #7](https://github.com/asintha1a/self-graphic-lab-website/pull/7) remains open on `feat/snipray-portfolio`. The branch now describes SkipCam as both a web QR toolkit and browser extension, updates the canonical product URL and SEO copy, and includes three actual scanner/generator/result screenshots.
- **VERIFIED — PR branch commit:** `a2017dd7aec6499f872536508bc91bb96716b5ea`.
- **UNVERIFIED — Portfolio preview/build:** Vercel preview is rebuilding after the update. Portfolio-specific tests/build and a live production case-study route have not been verified. The PR was not merged, so the production portfolio remains unchanged.

## Known limitations and manual actions

1. Manually click **Scan screen**, use the native browser picker to select a real tab/window/display, capture and crop a QR code, then confirm the share indicator stops immediately.
2. Verify the web app in Firefox, Safari and a physical mobile browser; the current browser matrix is Chrome only.
3. Complete popup/context-menu/settings QA for the extension in Chromium and Firefox before calling the extension fully verified.
4. Publish a new beta extension package if the current shared decoder/generator source should be included in downloadable extension archives; beta.2 remains an earlier artifact.
5. Review the updated portfolio preview, run its tests/build, and merge PR #7 if approved.
6. Browser-store listings require separate submissions and approval; Firefox permanent installation requires signing.
