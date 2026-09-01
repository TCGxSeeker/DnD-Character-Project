# Decision Log

- 2026-08-04: Store the complete authored project at `G:\dnd-character-studio`.
- 2026-08-04: Use the combined dark-glass character-sheet mock as visual source of truth.
- 2026-08-04: Use mobile 5e Companion App screenshots as functional reference only.
- 2026-08-04: Ship 2014 SRD first and isolate rulesets for future 2024 support.
- 2026-08-04: Treat Open5e v2 as background/reference data and local pure code as calculation authority.
- 2026-08-04: Keep user state local, versioned, exportable, and separate from provider caches.
# 2026-08-04 — Separate editorial option catalog from runtime reference data

- Character creation uses a bundled, data-driven ancestry/class catalog so dependent lineage choices work offline.
- Open5e remains the only runtime remote provider.
- Non-SRD entries are labeled by setting/version, and the catalog stores factual metadata rather than copied descriptive rules text.
- Ability score inputs remain final scores until a source-aware ASI builder is implemented.
