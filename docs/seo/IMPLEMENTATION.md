# Search implementation notes

**Product:** SkipCam web toolkit and browser extension
**Production URL:** <https://skipcam.selfgraphic.tech/>
**Owner:** Self Graphic Lab

## Changes in this work

- Added a source-controlled route registry at `site/routes.json`. The website build now emits 13 static route documents with unique titles, descriptions, H1 headings, useful page copy, canonical URLs, Open Graph and Twitter metadata, and valid JSON-LD.
- Added task pages for scanning from images, scanning without a phone, Wi-Fi QR creation, troubleshooting, product details, privacy, security, and help. These pages use the same web application and shared QR logic; the generator route can open with Wi-Fi selected.
- Kept `/history/` available to users, marked it `noindex,follow`, and removed it from the XML sitemap. The page describes the actual opt-in storage behavior.
- Added a static 404 page and changed Vercel routing to one trailing-slash policy. Legacy `skipcam.vercel.app` and `snipray` host redirects now point at the official custom domain.
- Added a generated-output validator and expanded browser QA to visit each page directly. The service worker now precaches the static pages for offline navigation after an online visit.
- Kept structured data to factual `Organization`, `WebSite`, and `WebPage` entities. No rating, review, download count, security guarantee, or browser-store availability is asserted.

## Validation

Run `npm test`, `npm run lint`, `npm run build`, `npm run seo:validate`, and `npm run test:browser`. The static SEO validator checks route uniqueness, one H1 per page, canonical URLs, parseable JSON-LD, internal links, index directives, sitemap membership, and the 404 document. Browser QA uses a temporary isolated Chromium profile and tests direct routes as well as core QR app flows.

Use the documented result from each run. Local validation does not establish search indexing, rich-result eligibility, traffic, ranking, or crawler access from verified bot networks.

## Measurement setup still needed

No Search Console, Bing Webmaster, analytics, or SEO reporting account was connected during the audit. An owner should verify the custom-domain properties, submit `https://skipcam.selfgraphic.tech/sitemap.xml`, and review indexing and query reports after crawl. Avoid adding analytics solely to measure SEO if the privacy model is to remain tracker-free.

PageSpeed Insights returned HTTP 429 for both mobile and desktop requests during the baseline audit. No Lighthouse or field performance result is claimed. Re-run PSI or Lighthouse later and record the date, URL, device category, and tool version with each result.

## Current official guidance consulted

- Google says its AI search features use existing SEO fundamentals and do not require special AI markup or a separate optimization file: [AI features and your website](https://developers.google.com/search/docs/appearance/ai-features), [AI search optimization guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).
- Google’s `SoftwareApplication` result eligibility calls for pricing and rating data. SkipCam has no basis for invented ratings, so this implementation uses general site entities only: [Software app structured data](https://developers.google.com/search/docs/appearance/structured-data/software-app).
- Google documents `robots.txt` and `nosnippet` controls for generative AI features: [Generative AI content controls](https://developers.google.com/search/docs/fundamentals/gen-ai-controls). The current wildcard allow policy was preserved; no training-crawler preference was inferred.
- OpenAI documents the separate purposes of OAI-SearchBot, GPTBot, and ChatGPT-User: [OpenAI crawlers](https://developers.openai.com/api/docs/bots). A spoofed user-agent request is not verified crawler access.
- IndexNow acceptance is a notification, not proof of crawling or indexing: [IndexNow protocol](https://www.indexnow.org/documentation), [Bing IndexNow guidance](https://www.bing.com/webmasters/help/indexnow-0z209wby).
- Vercel and Cloudflare publish their bot management and verified-bot behavior: [Vercel bot management](https://vercel.com/docs/bot-management), [Cloudflare verified bots](https://developers.cloudflare.com/bots/concepts/bot/verified-bots/). Account-level settings were not changed during this work.
