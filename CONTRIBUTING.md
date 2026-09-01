# Contributing

Arcane Observatory uses Node.js 20 or newer and npm.

1. Create a branch from `main`.
2. Run `npm install`.
3. Keep deterministic rules in `src/domain` and remote Open5e access in `src/data/open5e.js`.
4. Add coverage to the closest broad behavioral test suite rather than creating a one-file-per-module test.
5. Run `npm test`, `npm run build`, and `npm run test:packaging` before opening a pull request.

Do not submit copied proprietary rules prose, personal character exports, generated build output, caches, or dependencies.
