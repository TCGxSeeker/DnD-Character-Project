# Open5e Data Contract

- Documentation: https://open5e.com/api-docs
- API root: `https://api.open5e.com/v2/`
- Default source: `document__key__in=srd-2014`
- Edition label: 5e 2014 Rules / SRD 5.1

Open5e v1 is deprecated; use v2. Request only needed fields and paginate explicitly. Character-relevant endpoints include `classes`, `species`, `backgrounds`, `spells`, `feats`, `items`, `weapons`, `armor`, and `rules`.

The API is reference content, not trusted calculated character state. Normalize provider keys into `{sourceKey, resourceKey}` identifiers. Cache successful list results with a timestamp and retain the last good result when offline. Time out requests, distinguish network/HTTP/parse failures, and never erase user character data after a provider error.

Spell searches request the complete playable SRD record rather than preview-only fields. Newly added spells persist normalized descriptions and casting metadata; older or automatically granted spells resolve their exact-name SRD entry on demand and use the same seven-day cache.

Third-party documents must remain opt-in and visibly sourced. Do not silently mix `srd-2014`, `srd-2024`, `open5e`, A5E, or publisher sources.
