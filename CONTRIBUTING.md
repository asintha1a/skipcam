# Contributing

Contributions are welcome. Discuss substantial changes in an issue first. Keep QR data local, preserve safe DOM construction, avoid adding permissions or network services without a clear need, and include focused tests for behavior changes.

Use Node.js 22 or newer, then run `npm ci`, `npm test`, `npm run lint`, and `npm run build`. Follow the manual checklist in [TESTING.md](TESTING.md). Preserve the complete MIT and third-party notices when changing distributed code.

## Branch names

Use a short, task-focused prefix and kebab-case description: `feat/`, `fix/`, `refactor/`, `docs/`, or `release/` (for example, `docs/update-install-guide`). Keep one task per branch and remove merged branches when they are no longer needed.
