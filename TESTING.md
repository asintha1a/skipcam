# SnipRay testing guide

## Automated checks

Run these from the repository root with Node.js 22 or newer:

```sh
npm ci
npm test
npm run lint
npm run build
```

The Node suite covers QR encoding/decoding, content classification, URL inspection, history behavior, image validation, crop coordinates and extension message validation. `npm run build` produces independent Chromium, Firefox and landing-page outputs under `dist/`.

## Load an extension package

Download a package from the [v1.0.0-beta.1 release](https://github.com/asintha1a/snipray/releases/tag/v1.0.0-beta.1) and extract it first.

### Chrome, Edge or Brave

1. Open the browser's Extensions page (`chrome://extensions` or `edge://extensions`).
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select the extracted Chromium package directory.
4. Pin SnipRay, open a normal webpage, and test the actions below.

### Firefox 140+

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose **Load Temporary Add-on** and select the extracted Firefox package's `manifest.json`.
3. Test on a normal webpage. Firefox temporary extensions are removed on restart; permanent installation requires Mozilla signing.

Browser-store releases are not currently available. Browser compatibility is a build target; complete interactive browser QA is still pending.

## Manual interaction checklist

- Open the popup and confirm its scan, upload, paste, generator, history and settings actions are present.
- Start a screen scan on a normal page, select a QR code, cancel with **Esc**, and check the overlay placement at browser zoom and high display scale.
- Scan an uploaded image, a dropped image and an image pasted after an explicit paste action. Try the image context-menu action.
- Generate each content format: URL, plain text, email, telephone, SMS, Wi-Fi and contact. Check PNG and SVG exports and clipboard copy where supported.
- Inspect a normal HTTPS link and examples using HTTP, a known shortener, an internationalized hostname and embedded credentials. Confirm no URL opens until explicitly selected; dangerous schemes must not offer an open action.
- Enable history in settings, scan eligible content, search and filter, copy and delete entries, clear history, then disable history. Confirm history is off by default and sensitive values are not stored.
- Change system/light/dark themes, test settings persistence, use the keyboard shortcut and check reduced-motion behavior.
- Test invalid, oversized and unsupported images, invalid QR content and pages where browser security disallows extension injection.
- If several QR codes are present, confirm each result can be inspected and copied independently where detection succeeds.
- Check focus visibility, keyboard access, readable warnings, narrow popup sizing and both light and dark appearance.

Record browser name/version, operating system, test result and any console or service-worker errors when reporting issues. Do not describe an untested browser or manual check as verified.
