# SnipRay

**See it. Snip it. Scan it.** A privacy-first browser utility to scan, generate, and inspect QR codes without leaving your browser.

SnipRay is an independently maintained, enhanced open-source derivative of [QR Snip](https://github.com/IsaacJoel06/qr-snip) by Isaac Joel Mithran. Self Graphic Lab preserves the upstream MIT license and attribution. SnipRay is not the original upstream project.

## Features

- Scan a region of the active tab, uploaded or pasted images, and images from the context menu.
- Generate QR codes for URLs, text, email, telephone, SMS, Wi-Fi, and contact details; export PNG or SVG.
- Inspect decoded content locally, with offline URL heuristics and explicit open-link actions.
- Optional local history, disabled by default; sensitive content is excluded.
- Light and dark themes, keyboard shortcut (Alt+Shift+Q), and multiple QR detection when codes are spatially separable.
- No analytics, external processing, account, or backend.

## Status

**v1.0.0-beta.1.** Automated Node tests and production builds pass. Full interactive browser testing is pending. This prerelease is for evaluation and is not a claim of stable browser compatibility. No Chrome Web Store or Firefox Add-ons listing is available.

## Install for evaluation

Download a browser ZIP from [GitHub Releases](https://github.com/asintha1a/snipray/releases/tag/v1.0.0-beta.1), extract it, then:

- **Chrome, Edge, Brave:** open the browser's extensions page, enable Developer mode, choose **Load unpacked**, and select the extracted Chromium folder.
- **Firefox 140+:** open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, then select the extracted Firefox `manifest.json`. Temporary installs are removed when Firefox closes. Permanent installation requires Mozilla signing; no store listing is currently published.

## Development

Requires Node.js 22 or newer.

```sh
npm ci
npm test
npm run lint
npm run build
```

Build output is in `dist/`. See [TESTING.md](TESTING.md) for the manual browser checklist. The separate Vercel landing page is in `site/`.

## Privacy and security

QR decoding and generation happen locally. URL warnings are offline heuristics, not a malware reputation service and cannot guarantee safety. SnipRay never opens a decoded destination automatically. See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).

## Attribution and license

SnipRay is an independently maintained derivative of [QR Snip](https://github.com/IsaacJoel06/qr-snip). Upstream Git history and the complete original MIT notice, including Isaac Joel Mithran's copyright, are preserved. New SnipRay modifications are copyright Self Graphic Lab where applicable. Third-party notices are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Distributed under the MIT License.

Maintained by [Self Graphic Lab](https://www.selfgraphic.tech/) · [contact@selfgraphic.tech](mailto:contact@selfgraphic.tech).
