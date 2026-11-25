# SkipCam privacy policy

Effective November 25, 2026. SkipCam is maintained by [Self Graphic Lab](https://www.selfgraphic.tech/).

## Web app

QR scanning, image cropping, generation, content parsing and URL inspection run locally in your browser. SkipCam does not upload images, screenshots, screen recordings or decoded content, and it has no account, analytics, advertising, backend or database.

Screen capture starts only after you click **Scan screen**. The browser shows its native source chooser. SkipCam previews the selected stream in the current tab, captures a single frame when you request it, and immediately stops the media tracks before decoding. The frame exists in memory for scanning and is not recorded, uploaded or stored.

Clipboard access is event-based when you paste, or uses the Clipboard API after you explicitly choose **Paste image**. SkipCam does not watch the clipboard in the background. If you choose to open a decoded URL, your browser navigates to that destination and its normal network behavior applies.

Optional web history is disabled by default and stored in this browser’s local storage. It saves only eligible public HTTPS homepage URLs without warnings, credentials, paths, query strings or fragments. Other QR values, Wi-Fi credentials, contact details, messages and tokens are excluded. You can search, delete entries, clear history, set retention or turn it off. Turning history off clears saved entries.

The installable PWA caches the application shell, decoder, generator, icons and static product screenshots to support offline use. It does not cache user images, screen captures, video streams or decoded scan results. Cache versions change with app updates so old application shells are removed.

## Browser extension

Image scanning, selection capture, QR generation and URL inspection run locally. A tab screenshot is held in memory long enough to pass it to the results view and stays out of extension storage. Clipboard access follows an explicit read, paste or copy action.

Optional extension history is disabled by default. It stores eligible HTTPS site root addresses and timestamps in extension-local storage. Settings and extension history are separate from web app settings and history. Uninstalling the extension removes its storage according to the browser’s normal behavior.

| Permission | Purpose |
| --- | --- |
| activeTab | Temporary access to the selected tab after your action |
| scripting | Insert the selection overlay or locate the selected image |
| contextMenus | Display the image scan command |
| storage | Store local preferences and optional history |

## Website requests

The website host receives ordinary requests for the page and static application assets. QR content is processed in the browser. URL inspection uses offline heuristics; it does not query a live phishing or malware reputation service and cannot guarantee that a link is safe.

Questions can be sent to [contact@selfgraphic.tech](mailto:contact@selfgraphic.tech).
