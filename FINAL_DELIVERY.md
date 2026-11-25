# SkipCam delivery report

Updated: 2026-11-25. Statuses describe what was checked, not what is merely present in source.

## Product and source

- **VERIFIED — Repository:** [asintha1a/skipcam](https://github.com/asintha1a/skipcam) is public. Authenticated GitHub CLI identity is `asintha1a`. Description, homepage, and topics identify SkipCam and Self Graphic Lab.
- **VERIFIED — Published commit:** `4094f11c0e9a1ff91ec68f68f733ea2f8e666839` on `main`; local checkout is clean after this report is committed.
- **VERIFIED — Remotes and history:** `origin` points to the renamed repository. The original QR Snip repository remains the fetch-only `upstream`; no upstream pushes or history rewrites were made.
- **VERIFIED — Legal attribution:** The full MIT license and Isaac Joel Mithran copyright remain intact. Third-party notices retain the necessary upstream acknowledgment. GitHub's Contributors view reflects historical commits and identities; no authorship was reassigned.
- **VERIFIED — Branding audit:** Current interface, manifests, site, release packages, and documentation use SkipCam. Remaining SnipRay text is limited to preserved legacy-domain redirects, historical beta.1 packages, the original license/provenance, and compatibility identifiers kept to avoid disrupting existing installations or in-progress extension state.
- **VERIFIED — Secret-file audit:** No tracked environment files, private keys, or credential files were found. Local Vercel configuration is ignored.

## Brand assets

- **VERIFIED — Brand source and exports:** `assets/brand/` contains the SkipCam logo symbol, wordmark and lockup, black/white and transparent exports, extension icons, marketing icons, favicon, social preview, portfolio cover, and identity sheet.
- **UNVERIFIED — GitHub social preview setting:** The preview artwork is present at `assets/brand/social-preview.png` and the site serves its Open Graph image. GitHub still shows its generated repository card; repository settings did not open in the available browser session, so the image has not been confirmed as uploaded in GitHub Settings → Social preview.

## Release and verification

- **VERIFIED — Beta release:** [v1.0.0-beta.2](https://github.com/asintha1a/skipcam/releases/tag/v1.0.0-beta.2) is published as a prerelease; beta.1 remains available as historical release. No stable release or browser-store listing is claimed.
- **VERIFIED — Chromium package:** [Download SkipCam for Chromium](https://github.com/asintha1a/skipcam/releases/download/v1.0.0-beta.2/skipcam-chromium-v1.0.0-beta.2.zip). Local SHA-256: `3472073378e6604c0688c5551f9e38b81bdfbf940b1d69a7b9b46da34b2553e3`.
- **VERIFIED — Firefox package:** [Download SkipCam for Firefox](https://github.com/asintha1a/skipcam/releases/download/v1.0.0-beta.2/skipcam-firefox-v1.0.0-beta.2.zip). Local SHA-256: `be770ed48b08b6d888c2ed8da2368dbe80dc7b355b9a50db2912a69f0e3d8d13`.
- **VERIFIED — Package contents:** Both archives pass ZIP integrity checks and include the SkipCam Manifest V3 name, expected files, and browser-specific manifest configuration. Extension manifest version is valid `1.0.0`; beta designation is carried in release tag and package names. Both download URLs returned HTTP 200.
- **VERIFIED — Automated checks:** `npm test` passed 10/10; `npm run lint` and `npm run build` completed successfully on 2026-11-25.
- **UNVERIFIED — Extension browser QA:** Full interactive popup, capture, context-menu, history, and settings behavior has not been verified in an installed browser. The beta release remains evaluation-only. Do not infer browser compatibility from successful builds alone.
- **UNVERIFIED — Store availability:** No Chrome Web Store or Firefox Add-ons publication is claimed. Firefox permanent installation requires a signed add-on; the ZIP is suitable for temporary testing through `about:debugging`.

## Website and legacy links

- **VERIFIED — Production site:** [https://skipcam.vercel.app/](https://skipcam.vercel.app/) returned HTTP 200. Live title, canonical URL, Open Graph image, beta.2 download references, `robots.txt`, and `sitemap.xml` were checked.
- **VERIFIED — Landing-page interaction checks:** Local browser QA exercised the sample QR scanner and generator; the sample decoded to `https://example.org/`, generated output appeared, a 390px mobile viewport had no horizontal overflow, and no page errors were observed.
- **VERIFIED — Old Vercel URL redirect:** `https://snipray.vercel.app/` and a nested path return permanent redirects to `https://skipcam.vercel.app/`.
- **BLOCKED — Custom domain:** `skipcam.selfgraphic.tech` does not resolve yet. Add a Cloudflare DNS-only CNAME: name `skipcam`, target `189cd2e8979e9fb5.vercel-dns-017.com.`, then verify the domain in Vercel. DNS was not modified.
- **UNVERIFIED — Old custom-domain redirect:** The redirect is configured, but the old `snipray.selfgraphic.tech` hostname is not verified because its DNS is not configured.

## Portfolio

- **VERIFIED — Portfolio change prepared:** [Self Graphic Lab PR #7](https://github.com/asintha1a/self-graphic-lab-website/pull/7) remains open, mergeable, and on its existing feature branch. It replaces the SnipRay project entry with SkipCam, adds the `/work/skipcam` case study and new cover, and redirects the old case-study route.
- **VERIFIED — Preview route:** The PR preview's `/work/skipcam` route returned HTTP 200 with SkipCam metadata; `/work/snipray` returned HTTP 308 to the new route.
- **UNVERIFIED — Portfolio tests/build and production listing:** The portfolio's full test suite and production build have not been run locally. PR #7 has not been merged, so the production portfolio does not yet include this case study.

## Remaining manual actions

1. Upload `assets/brand/social-preview.png` in repository **Settings → Social preview**.
2. Add the custom-domain CNAME above, then verify it in Vercel.
3. Run the portfolio test suite/build on PR #7 and merge after review.
4. Install the beta in Chromium and Firefox to complete interactive extension QA. Keep it labeled beta until that verification is complete.
5. Submit to browser stores separately if store distribution is desired.
