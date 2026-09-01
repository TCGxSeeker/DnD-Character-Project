# Verification Plan

## Automated

- Ability, proficiency, XP, HP, Constitution delta, multiclass prerequisites, caster-level, and slot-table tests.
- Versioned store round-trip and import validation tests.
- Production build and Sites compatibility tests.

## Browser behavior

- Create and switch among multiple characters.
- Increment/decrement HP, temp HP, hit dice, spell slots, and class resources.
- Add/remove spells and inventory entries; search reference data when online.
- Complete a level-up with average and rolled HP branches; verify one commit and history entry.
- Reload and confirm persistence; export, alter, and restore from backup.
- Check keyboard focus, hover, modal escape, empty/error/loading states, desktop 1440×1024, laptop, and 390px layout.
- Confirm no console errors.

## Visual gate

Compare `design/selected-character-studio.png` with a 1440×1024 implementation capture in a single visual review. Fix P0/P1/P2 discrepancies. `design-qa.md` must end with `final result: passed`.
