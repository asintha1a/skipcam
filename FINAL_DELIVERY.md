# SnipRay beta delivery

Updated: 2026-11-24. This report distinguishes verified outcomes from pending browser and DNS work.

## Published source and packages

- **VERIFIED — GitHub repository:** [asintha1a/snipray](https://github.com/asintha1a/snipray), public. The published implementation is in commit `de89800bcd9feb66a4f597ddf4d49b494db0a816`; the beta archives and delivery report follow on `main`.
- **VERIFIED — Attribution:** SnipRay is an independently maintained, enhanced derivative of [QR Snip](https://github.com/IsaacJoel06/qr-snip). Upstream history, Isaac Joel Mithran's MIT notice and third-party notices are preserved.
- **VERIFIED — Beta release:** [v1.0.0-beta.1](https://github.com/asintha1a/snipray/releases/tag/v1.0.0-beta.1) exists as a prerelease. It is not represented as a stable or fully browser-verified release.
- **BLOCKED — Release attachments:** GitHub's release asset upload host could not resolve from the publishing environment. The tested packages are committed in the public repository and direct download URLs below return HTTP 200.
- **VERIFIED — Chromium package:** [Download ZIP](https://raw.githubusercontent.com/asintha1a/snipray/main/release-assets/v1.0.0-beta.1/snipray-chromium-v1.0.0-beta.1.zip). SHA-256: `c863303ff4c65771bff0fb6522b61b5571ed2893f2c65851f5ea49200f9e1b57`.
- **VERIFIED — Firefox package:** [Download ZIP](https://raw.githubusercontent.com/asintha1a/snipray/main/release-assets/v1.0.0-beta.1/snipray-firefox-v1.0.0-beta.1.zip). SHA-256: `c28b7045b0c15ac4182e5f06dfee902ac1186bbf395feaaa2b8fe91934842a36`.
- **VERIFIED — Package manifests:** Both are Manifest V3; Chromium uses a service worker and Firefox has its separate background scripts and Gecko minimum-version metadata. Browser manifest version remains numeric `1.0.0`; beta labeling is on the release and archive filenames.

## Website and portfolio

- **VERIFIED — Production landing page:** [https://snipray.vercel.app/](https://snipray.vercel.app/), HTTP 200. Canonical URL, Open Graph image, `robots.txt`, and sitemap use this verified domain. Beta download buttons point to the verified ZIP URLs.
- **UNVERIFIED — Interactive landing-page demos:** The page and assets load, but demo interactions were not fully exercised in a browser automation session.
- **BLOCKED — Preferred custom domain:** `snipray.selfgraphic.tech` is attached to the Vercel project but DNS is not configured. Add a Cloudflare record: **CNAME** name `snipray`, target `189cd2e8979e9fb5.vercel-dns-017.com`, proxy disabled (DNS only). Then rerun `vercel domains verify snipray.selfgraphic.tech`. The custom domain was not claimed as live.
- **VERIFIED — Portfolio pull request:** [PR #7](https://github.com/asintha1a/self-graphic-lab-website/pull/7) is open from `feat/snipray-portfolio`. It adds a project entry, case-study route and page, and existing promotional cover artwork with explicit beta and attribution text. It has not been merged or deployed.
- **UNVERIFIED — Portfolio build and tests:** Not run. A fresh sparse clone repeatedly failed to hydrate remote Git blobs; changes were prepared on an isolated branch through GitHub's Git API. The original portfolio checkout was not reset, cleaned, or otherwise modified by these changes.

## Tests and browser verification

- **VERIFIED — Automated extension tests:** `npm test` passed 10/10 tests in the resumed run.
- **VERIFIED — Lint and production builds:** `npm run lint` and `npm run build` completed successfully; Chromium, Firefox, and site build outputs were produced. The clean-clone site build was rerun with the tracked screenshot directory and passed.
- **VERIFIED — Package inspection:** Both ZIPs contain the expected manifest and extension files; SHA-256 checksums are above.
- **BLOCKED — Interactive extension testing:** Chrome is installed. A separate temporary Chrome profile launched without using the personal profile, but Chrome did not expose the extension service worker to the automation harness, so popup and extension interactions could not be verified. No Firefox or Brave executable was found. No personal browser session was closed or inspected.
- **BLOCKED — Product screenshots:** No real extension screenshots were captured. The site and case study use existing promotional art and label it as artwork, not as a product screenshot.

## Manual actions and limitations

1. Add the CNAME record above and verify the custom domain in Vercel.
2. For local extension testing, extract a ZIP. Chromium: open the extensions page, enable Developer mode, select **Load unpacked**, and choose the extracted directory. Firefox: open `about:debugging#/runtime/this-firefox`, select **Load Temporary Add-on**, and choose the extracted `manifest.json`. Firefox temporary installs disappear when the browser closes; permanent installation requires Mozilla signing.
3. Exercise screen-region capture, upload, clipboard and context-menu scans, all generator formats/exports, security warnings, history, settings, themes, keyboard shortcut, zoom and high-DPI behavior. Capture real screenshots after these checks.
4. Run the Self Graphic Lab portfolio build and tests on PR #7 before review/merge. PR #7 remains open; no production portfolio change was pushed.
5. Stable v1.0.0 and browser-store publication remain pending. No Chrome Web Store or Firefox Add-ons listing is claimed.

The beta's URL warnings are offline heuristics, not live reputation checks or a safety guarantee. Browser compatibility is not claimed beyond successful build and manifest validation.
