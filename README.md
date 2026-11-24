<div align="center">
  <a href="https://snipray.vercel.app/"><img src="assets/brand/social-preview.png" alt="SnipRay — See it. Snip it. Scan it. Promotional brand artwork" width="100%"></a>

  <h1>SnipRay</h1>
  <p><strong>See it. Snip it. Scan it.</strong></p>
  <p>A privacy-first browser utility to scan, generate and inspect QR codes without leaving your browser.</p>
  <p><strong>By Self Graphic Lab</strong></p>

  <p>
    <a href="https://github.com/asintha1a/snipray/releases/tag/v1.0.0-beta.1"><img alt="Latest beta" src="https://img.shields.io/github/v/tag/asintha1a/snipray/v1.0.0-beta.1?label=latest%20beta&color=B9FF66&labelColor=101312"></a>
    <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/github/license/asintha1a/snipray?color=B9FF66&labelColor=101312"></a>
    <img alt="Manifest V3" src="https://img.shields.io/badge/Manifest-V3-B9FF66?labelColor=101312">
    <img alt="Privacy-first" src="https://img.shields.io/badge/Privacy-local%20processing-B9FF66?labelColor=101312">
  </p>

  <p><a href="https://snipray.vercel.app/">Website</a> · <a href="https://github.com/asintha1a/snipray/releases/tag/v1.0.0-beta.1">Download beta</a> · <a href="https://www.selfgraphic.tech/">Self Graphic Lab</a></p>
</div>

## A QR toolkit, right where you need it

Scan a region in the active tab, decode an image, or make a QR code for something you want to share. SnipRay processes content on your device and asks before opening any decoded link.

> **Beta:** Automated tests and production builds pass. Full interactive browser verification is still pending. Treat this as an evaluation release, not a stable browser compatibility claim. No browser-store listing is available.

## What you can do

- **Scan the screen:** select a visible area with the toolbar action or <kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>Q</kbd>.
- **Scan images:** upload, drop, paste or right-click an image to decode it locally.
- **Generate QR codes:** create URLs, text, email, telephone, SMS, Wi-Fi and contact codes; export PNG or SVG.
- **Understand results:** identify common content types, inspect destinations and see offline URL warnings before deciding what to do.
- **Keep a private history:** optionally save eligible results locally. History is off by default; sensitive values are excluded.
- **Set your workspace:** choose system, light or dark appearance and adjust history and generation defaults.

SnipRay does not send scans to a service, check live phishing or malware reputation, or automatically connect to Wi-Fi, send messages, place calls or open links. URL checks are offline heuristics and cannot guarantee safety. Read [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).

## Browser packages

Build targets are Chromium-based browsers (Chrome, Edge and Brave) and Firefox 140+. Interactive compatibility testing is pending.

| Package | Download | Install for evaluation |
| --- | --- | --- |
| Chromium | [ZIP](https://raw.githubusercontent.com/asintha1a/snipray/main/release-assets/v1.0.0-beta.1/snipray-chromium-v1.0.0-beta.1.zip) | Extract, open the extensions page, enable Developer mode and choose **Load unpacked**. |
| Firefox 140+ | [ZIP](https://raw.githubusercontent.com/asintha1a/snipray/main/release-assets/v1.0.0-beta.1/snipray-firefox-v1.0.0-beta.1.zip) | Extract, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, then select `manifest.json`. |

Firefox temporary add-ons are removed when the browser closes. Permanent installation requires Mozilla signing. Official Chrome Web Store and Firefox Add-ons publication are separate processes and have not occurred.

## Build and test

Requires Node.js 22 or newer.

```sh
npm ci
npm test
npm run lint
npm run build
```

Packages are generated in `dist/`. Use [TESTING.md](TESTING.md) for the current manual checklist. The landing page and its local demos are in `site/`.

## Attribution and license

SnipRay is an independently maintained product by Self Graphic Lab and an enhanced derivative of [QR Snip](https://github.com/IsaacJoel06/qr-snip), originally authored by Isaac Joel Mithran. The original Git history and MIT notice remain intact in [LICENSE](LICENSE); Self Graphic Lab's notice covers SnipRay modifications where applicable. Component licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Because the original commit history is intentionally preserved, GitHub may show upstream contributors in the repository's **Contributors** section. That reflects authorship of historical commits; it does not mean Self Graphic Lab authored those commits. Published history has not been rewritten.

SnipRay is distributed under the MIT License. Maintained by [Self Graphic Lab](https://www.selfgraphic.tech/) · [contact@selfgraphic.tech](mailto:contact@selfgraphic.tech).
