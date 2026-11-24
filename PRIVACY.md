# SkipCam privacy policy

Effective November 24, 2026. SkipCam is maintained by [Self Graphic Lab](https://www.selfgraphic.tech/).

SkipCam has no telemetry, advertising, account, synchronization or backend. Image scanning, cropping, QR generation and URL inspection run on the device. Context-menu scanning reads visible tab pixels. It does not fetch the source image again. A tab screenshot is held in memory long enough to pass it to the result window and stays out of browser extension storage. Clipboard access follows an explicit read, paste or copy action. If you open a link, your browser navigates to that destination and its normal network behavior applies.

Optional history is disabled by default. When enabled it stores eligible HTTPS site root addresses and timestamps locally. QR text, Wi-Fi passwords, contact details, messages and URLs with credentials, paths, queries, fragments or warnings are skipped. Clear individual entries, clear history, set retention or turn it off in Settings. Expired entries are removed when SkipCam next accesses history. Settings and history use extension-local storage. Removing the extension clears its storage according to the browser's uninstall behavior.

| Permission | Purpose |
| --- | --- |
| activeTab | Temporary access to the selected tab after your action |
| scripting | Insert the selection overlay or locate the selected image |
| contextMenus | Display the image scan command |
| storage | Store local preferences and optional history |

The landing page demos run locally in the page and do not send QR data to the host. The website host receives ordinary requests for the page and its assets.

Questions can be sent to contact@selfgraphic.tech.
