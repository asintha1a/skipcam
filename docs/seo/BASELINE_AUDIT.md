# SkipCam SEO baseline

**Observed:** 2026-11-25 · **Property:** `https://skipcam.selfgraphic.tech/` · **Scope:** current production and committed static site build. This is a technical baseline, not an indexing or ranking report.

## How this was checked

- Read the source and generated output for `site/index.html`, `site/app.js`, `scripts/build.mjs`, `site/service-worker.js`, `site/manifest.webmanifest`, `vercel.json`, and the root documentation.
- Fetched public routes, redirect chains, robots, sitemap, manifest, unknown URLs, and selected pages with `curl`. Tried Googlebot, bingbot, OAI-SearchBot, ChatGPT-User, GPTBot, and PerplexityBot user-agent strings. These requests used ordinary client IPs and do not verify behavior for authenticated crawler IP ranges.
- Ran the search-visibility skill's bounded HTML audit against `dist/site` in offline mode. It found no parser-level findings in the sampled HTML. It does not check a live browser, schema policies, indexing, or CWV.
- Queried the public PageSpeed Insights API for mobile and desktop. Both requests returned HTTP 429, quota exceeded. No Lighthouse or field performance score is claimed.
- A connected Search Console, Bing Webmaster, analytics, or SEO metrics account was not available. Search snippets and competitor pages were researched qualitatively; no keyword volume, rankings, traffic, backlinks, or indexing state are known.

## Verified baseline observations

| Area | Evidence | Finding |
| --- | --- | --- |
| Availability | Production GETs | `/`, `/scan/`, `/generate/`, `/history/`, `/extension/`, `robots.txt`, `sitemap.xml`, and the manifest returned HTTP 200. An arbitrary missing path returned HTTP 404. |
| Canonical variants | GET `/scan` and `/scan/`; `/generate` and `/generate/` | Both slash variants returned 200 with no redirect. The canonical points to the slash version, leaving a duplicate fetchable URL. |
| Route HTML | `dist/site/{index,scan,generate,history,extension}/index.html` | Titles and descriptions vary by route, but every route has the same brand-only H1 and repeated marketing body. Important instructions and QR controls are rendered by JavaScript after load. |
| Search metadata | Generated root HTML | The homepage title is slogan-led rather than descriptive. OG title/description and canonical exist. Twitter title/description are not independently declared. No JSON-LD is present. |
| Sitemap | `https://skipcam.selfgraphic.tech/sitemap.xml` | Valid-looking XML lists five URLs, including `/history/`. The local scan history route should be `noindex` and excluded from the public sitemap. No `lastmod` is supplied, which avoids fabricated dates. |
| Robots | `https://skipcam.selfgraphic.tech/robots.txt` | `User-agent: *` allows crawling and names the production sitemap. This currently also covers AI search and training crawlers unless a platform-specific control overrides it. No training-specific preference is recorded. |
| Legacy Vercel host | `skipcam.vercel.app` | Serves a stale 200 response. `snipray.vercel.app` redirects to that host, where a nested path returned 404. Existing Vercel aliases show both names belong to the SkipCam deployment. |
| Legacy custom host | `snipray.selfgraphic.tech` | DNS lookup failed during this audit; no HTTP redirect can be verified. Do not claim that hostname redirects until DNS resolves. |
| Crawler response | User-agent header requests | The six tested strings received HTTP 200 from the main production URL. This only proves user-agent spoofing did not trigger a block; it does not prove access for verified crawler IPs or a crawler's indexing decision. |
| Rendering and mobile | Existing isolated Chrome QA from the product work | The actual scanner/generator UI and a 390px layout were exercised. No native browser screen-sharing chooser test or physical mobile test is recorded. |
| Performance | PSI API | Mobile and desktop API calls returned 429 quota exceeded. Core Web Vitals, Lighthouse, and CrUX results remain unknown. |
| Search Console and Bing | Connected tools discovery | OpenSEO was available but not installed. No Search Console or Bing Webmaster account integration was connected. Organic query, indexing, and AI citation data remain unavailable. |

## Prioritized issues

1. **High, verified:** all route documents share one H1/body and defer tool content to JS. Static, route-specific useful copy is needed before rendering.
2. **High, verified:** `/history/` is discoverable in the sitemap and has no `noindex` directive.
3. **High, verified:** `skipcam.vercel.app` serves stale content and the legacy `snipray.vercel.app` path redirects to it instead of the official custom domain.
4. **Medium, verified:** slash and non-slash route variants both return 200. Establish one permanent trailing-slash format.
5. **Medium, verified:** homepage title/H1 do not describe the online QR scanner and generator.
6. **Medium, verified:** no structured data is present. Add only accurate site/organization entities; do not invent ratings or reviews.
7. **Medium, unverified:** actual crawler/WAF treatment from verified IP ranges is unknown. Inspect Cloudflare and Vercel settings/logs before changing bot rules.
8. **Requires external access:** Search Console, Bing Webmaster, analytics, live field performance, indexing, and search visibility cannot be assessed from current connected accounts.

## Limits

Search results shown by the research tool are not a reproducible, location-specific Google or Bing browser SERP. Public PageSpeed quota prevented scoring. A 200 response to a crawler user-agent string is not proof of verified crawler access. No traffic, rank, citation, or indexing claims are made.
