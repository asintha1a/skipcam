# SkipCam testing guide

## Automated checks

Run these from the repository root with Node.js 22 or newer:

    npm ci
    npm test
    npm run lint
    npm run build
    npm run test:browser

The Node suite covers QR encoding and decoding, content classification, URL inspection, history behavior, image validation, crop coordinates and extension message validation. The build produces independent Chromium, Firefox and website outputs under dist/.

The browser suite uses an installed Google Chrome executable in a temporary isolated profile. It does not open or read a personal browser profile. Set CHROME_EXECUTABLE if Chrome is installed elsewhere. By default it tests the local production build; set `SKIPCAM_QA_URL=https://skipcam.selfgraphic.tech` to run the same suite against production. It exercises the app UI, seven generator formats, PNG/SVG downloads, image upload, clipboard paste, drag-and-drop, crop mapping, screen-capture lifecycle and track shutdown, URL warnings, inert malicious text, multi-QR images, mobile width and offline PWA generation.

Verified on November 25, 2026: `npm test` passed 10/10, lint and independent Chromium, Firefox and website production builds completed, and 15 browser scenarios passed against the deployed production site in installed Chrome. This was an automated app-level screen-capture simulation. The native screen-sharing chooser and actual user-selected tab/window/display still require a manual check. The website has not been verified in Firefox or Safari or on a physical mobile device.

## Web app manual checks

1. Open https://skipcam.selfgraphic.tech/ and follow the browser’s install prompt if available. Visit /scan/, /generate/ and /history/ directly and refresh each route.
2. Upload, drop and paste an image; try an actual screenshot from the operating system clipboard. Use crop selection and compare the marked region with the decoded result.
3. Click **Scan screen** and confirm the native chooser appears only after the click. Select a tab, window or display, capture one still frame and verify sharing stops immediately. Cancel the dialog, end sharing from the browser controls, and test a restricted browser page.
4. Generate URL, plain text, Wi-Fi, email, telephone, SMS and contact codes. Change colors, size, correction level and quiet zone. Export PNG and SVG, copy an image where supported, and scan the exported code.
5. Check URL warnings for HTTP, a known shortener, an internationalized hostname and embedded credentials. Confirm dangerous protocols have no open action and no decoded destination opens without a click.
6. Enable history, scan a public HTTPS homepage, search, filter, copy and delete it, clear the list, then disable history. Confirm history starts off and sensitive content is never retained.
7. Load once while online, then disconnect and visit the scanner and generator routes. Confirm the app shell works offline and user images/results are not cached.
8. Check keyboard operation, screen reader labels, high zoom, high-DPI imagery, narrow desktop widths and a physical mobile browser.

## Load an extension package

Download a package from the [v1.0.0-beta.2 release](https://github.com/asintha1a/skipcam/releases/tag/v1.0.0-beta.2) and extract it first.

### Chrome, Edge or Brave

1. Open the browser’s Extensions page (chrome://extensions or edge://extensions).
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select the extracted Chromium package directory.
4. Pin SkipCam, open a normal webpage and test the popup, selection overlay and image context-menu action.

### Firefox 140+

1. Open about:debugging#/runtime/this-firefox.
2. Choose **Load Temporary Add-on** and select the extracted Firefox package’s manifest.json.
3. Test on a normal webpage. Firefox temporary extensions are removed on restart; permanent installation requires Mozilla signing.

No browser-store release is available. The web app browser suite passed in Chrome; full interactive extension QA and the Firefox web-app matrix remain pending. Record the browser/version, operating system, result and any console or service-worker errors when reporting issues.
