# Design QA

## Evidence

- Source visual truth: `G:\dnd-character-studio\design\selected-character-studio.png`
- Browser-rendered desktop implementation: `G:\dnd-character-studio\qa\implementation-desktop-final.jpg`
- Browser-rendered mobile implementation: `G:\dnd-character-studio\qa\implementation-mobile.jpg`
- Full-view comparison: `G:\dnd-character-studio\qa\comparison-desktop-final.jpg`
- Focused hero/stat comparison: `G:\dnd-character-studio\qa\comparison-focused-final.jpg`
- State: Vaelithra, level 7 Circle of the Moon Druid, Sheet tab, no modal open.
- Desktop viewport: 1440 x 1024 CSS px, DPR 1. Source is 1487 x 1058 px; it was proportionally normalized onto 1440 x 1024 without cropping. Implementation is 1440 x 1024 px. Combined comparison is 2880 x 1024 px.
- Mobile viewport request: 390 x 844 CSS px, DPR 1. Browser capture is 375 x 812 px after browser viewport insets. DOM reported 390 x 844 with no horizontal overflow.

## Full-view comparison

The implementation preserves the source hierarchy: persistent character rail, top section navigation, portrait-led identity panel, one-line resource band, abilities and core stats workspace, then a prominent next-level action. The palette, glass depth, fine gold borders, serif display hierarchy, dark astronomical imagery, and restrained iconography remain coherent with the selected target. The denser rectangular portrait and more compact hero intentionally combine the simplicity of direction 2 with the mood of direction 3.

## Focused comparison

The focused comparison makes the smallest labels, portrait crop, statistic alignment, border weights, and resource controls readable. The generated portrait is sharp at its rendered size, the Phosphor icons are consistent, and no visual asset is represented by emoji, text glyphs, handcrafted SVG, or CSS illustration. The implementation uses a rectangular portrait crop in place of the mock's circular botanical frame; this is an intentional simplification rather than an accidental asset mismatch.

## Required fidelity surfaces

- Fonts and typography: Georgia/system serif fallbacks preserve the high-contrast fantasy display voice without a runtime font dependency. UI text uses system sans-serif with clear hierarchy, compact uppercase labels, and no observed clipping. Small utility labels are intentionally denser than the mock but remain legible at the target viewport.
- Spacing and layout rhythm: desktop alignment, 18px outer gutter, 14px section rhythm, 22–28px major radii, and horizontal stat bands closely match the selected composition. The 390px layout collapses into a single scroll without horizontal overflow; controls remain reachable through the sticky tab bar and drawer.
- Colors and visual tokens: green-black glass, warm gold actions, cool teal saved-state feedback, thin translucent borders, and the supplied astronomical background match the target's visual balance. Contrast remains usable in the tested states.
- Image quality and asset fidelity: all visible character and background artwork is project-owned raster imagery generated for this app. Desktop and mobile crops are clean, sharp, and correctly proportioned.
- Copy and content: UI copy is concise, in-world, and task-oriented. It avoids leaking the implementation brief into the product. Labels clearly distinguish local storage, SRD 2014 reference data, review-before-commit progression, and backup actions.

## Findings

- [P3] Progression is represented by the next-level card rather than the mock's seven-step timeline.
  - Location: character hero / next-level card.
  - Evidence: the source uses a decorative level track; the implementation prioritizes a simpler identity panel and a functional guided-level card.
  - Impact: slightly less decorative progression context, with no loss of the level-up task.
  - Follow-up: consider a compact class-level timeline when subclass/feature choices become more detailed.

- [P3] Resource availability is numeric rather than duplicated as decorative pips.
  - Location: resource band.
  - Evidence: the source combines numbers with pips; the implementation uses accessible plus/minus steppers and explicit totals.
  - Impact: less ornament, faster interaction and clearer keyboard semantics.
  - Follow-up: add semantic pip visualization only if it does not compete with the stepper controls.

## Comparison history

### Pass 1

- [P2] Mobile-only menu and close controls appeared on the 1440px desktop view because the shared icon-button display rule overrode their hidden state.
- Fix: increased selector specificity for `.mobile-menu.icon-button` and `.mobile-sidebar-close.icon-button`, then restored them only inside the mobile breakpoint.

### Pass 2

- Post-fix evidence: `G:\dnd-character-studio\qa\implementation-desktop-pass2.jpg` and `G:\dnd-character-studio\qa\comparison-desktop-pass2.jpg`.
- Both mobile-only controls computed to `display: none` at 1440px. Desktop body width equaled viewport width. No additional P0/P1/P2 visual findings remained.

### Final regression

- Added functional XP editing and character management without changing the selected Sheet composition.
- Final desktop capture reports 1440 x 1024 viewport, 1440px scroll width, and no vertical overflow on the primary Sheet state.
- Final mobile capture reports no horizontal overflow and a working character drawer.
- Browser console warnings/errors: none.

## Primary interactions tested

- Character switching.
- New-character dialog open/cancel.
- Character manager open/close and duplicate/delete affordances present.
- Guided level-up through Class, Hit Points, Choices, and Review without committing test data.
- Spell tab navigation and live Open5e SRD 2014 search (`fire`, 7 results).
- Inventory, Features, Notes, and History navigation were present in the rendered accessibility tree.
- Mobile character drawer open/close.
- XP field rendered with the correct stored value for an experience-based character.
- Desktop and mobile layout overflow checks.
- Browser console errors and warnings.

## Implementation checklist

- No actionable P0/P1/P2 fidelity issues remain.
- Keep both P3 ideas optional until feature depth warrants the added visual density.
- Re-run this comparison after adding character editing, spell-choice automation, or a native wrapper.

## Character catalog regression — 2026-08-04

- Additional implementation evidence: `G:\dnd-character-studio\qa\ancestry-creator-desktop.jpg` and `G:\dnd-character-studio\qa\ancestry-creator-mobile.jpg`.
- State: Create Character dialog with Warforged selected, Envoy visibly labeled as legacy playtest, and Artificer selected.
- Desktop viewport: 1440 x 1024 CSS px, DPR 1. The four identity fields remain aligned in a single readable row and the modal stays within the viewport.
- Mobile viewport request: 390 x 844 CSS px, DPR 1. Browser capture uses a 375px content width; the identity grid resolves to one 326px column with no horizontal overflow.
- The selected source mock does not depict the creation dialog. This state was judged against the established glass tokens, serif/sans hierarchy, border radii, spacing system, input treatment, and primary/secondary actions already approved in the main screen.
- Dependent selectors are visually distinct, source/version labeling is readable, and long ancestry choices do not clip in the tested Warforged state.
- Browser console warnings/errors: none.
- New interaction checks: ancestry list exposes 53 families; selecting Warforged replaces the dependent options with Published, Envoy, Juggernaut, and Skirmisher; selecting Artificer updates the d8 HP hint; closing the modal leaves no dialog behind.
- No actionable P0/P1/P2 findings were introduced.

## Liquid-glass material refinement — 2026-08-04

- Source visual truth: the pre-refinement implementation at `G:\dnd-character-studio\qa\material-refinement\02-before-main-desktop.jpg` plus the focused visual-material brief.
- Browser-rendered implementation: `G:\dnd-character-studio\qa\material-refinement\03-after-main-desktop-pass1.jpg`.
- Narrow implementation: `G:\dnd-character-studio\qa\material-refinement\04-after-mobile-pass1.jpg`.
- Floating modal evidence: `G:\dnd-character-studio\qa\material-refinement\06-after-level-modal-desktop.jpg`.
- Full-view normalized comparison: `G:\dnd-character-studio\qa\material-refinement\05-comparison-before-after-desktop.jpg`.
- Desktop source and implementation are each 1440 x 1024 px at 1440 x 1024 CSS px and DPR 1. The combined comparison is 2880 x 1024 px with no density normalization required.
- Narrow viewport request was 390 x 844 CSS px at DPR 1; the browser content capture is 375 x 812 px because of browser insets. DOM scroll width was 375px, so no horizontal overflow was present.
- State: Borin Stoneshield, Sheet tab, no modal for the main comparison; level-up Class step for focused floating-surface evidence.

### Material findings and required fidelity surfaces

- Typography and copy: unchanged by scope; display and utility hierarchy remain intact, with no new clipping or wrapping regressions.
- Spacing and layout rhythm: unchanged; desktop composition and mobile single-column sequence match the source state.
- Colors and tokens: the former one-material system was replaced by explicit floating, primary, and inset tokens. Atmospheric artwork reads through more clearly while content contrast remains stable.
- Image quality: existing source artwork and crops are unchanged and remain sharp; no generated placeholder or CSS-drawn asset was introduced.
- Icons and interaction states: the existing icon family is unchanged. Active navigation, selected character, hover, press, focus, and modal states now use material-consistent illumination and depth.
- Accessibility: existing focus-visible rules remain. Reduced transparency, unsupported backdrop-filter, forced colors, and reduced motion all have explicit fallbacks.

### Comparison history

#### Material pass 1

- Pre-refinement finding: floating chrome, reading panes, and nested controls all computed to the same 76% background opacity and 24px blur, producing an opaque, uniform stack.
- Fix: introduced shared material tokens and modifiers; floating chrome now computes to 46% opacity and 30px blur, primary reading panes to 57% opacity and 21px blur, and inset controls to 24% opacity with no backdrop filter.
- Post-fix visual evidence: normalized desktop comparison plus the narrow and modal captures listed above.
- Result: environmental depth, selected-state glow, edge highlights, and shadow separation are visible without compromising the information hierarchy. No P0/P1/P2 issue remained after the first comparison, so no second visual fix pass was required.

### Focused comparison evidence

The level-up modal capture provides a readable focused view of the floating material, specular edge, dimmed backdrop, inset option cards, stepper states, and gold primary action. Additional crops were unnecessary because these details are legible at the full 1440 x 1024 capture.

### Regression checks

- Primary Sheet state and level-up modal rendered successfully.
- Narrow Sheet retained one-column flow with no horizontal overflow.
- Browser console warnings/errors: none.
- `npm test`: 13 passed.
- `npm run test:sites`: 4 passed.
- `npm run build`: passed.
- No actionable P0/P1/P2 findings remain.

## Derived Armor Class correction — 2026-08-08

- Browser evidence: `G:\dnd-character-studio\qa\armor-class\sheet-desktop-baseline.jpg` and `G:\dnd-character-studio\qa\armor-class\inventory-narrow.jpg`.
- State: MATE-67 (Copy), Warforged Envoy Artificer 3, with existing Scale mail and Shield inventory entries.
- Functional sequence: baseline AC 13; equip Scale mail → AC 17; equip Shield → AC 19 on both Inventory and Sheet; unequip Shield and Scale mail → AC 13 restored.
- Existing equipment state was restored after the test; no test mutation was left on the character.
- Desktop viewport: 1440 x 1024 CSS px with 1440px document width.
- Narrow viewport request: 390 x 844 CSS px; browser content width 375px with 375px document width and no horizontal overflow.
- The Inventory status copy fits the established typography and hierarchy. The Sheet tile layout and visual tokens are unchanged.
- Browser console warnings/errors: none.
- Automated verification: 19 domain/data tests passed, 4 Sites packaging tests passed, and the production build completed.
- No actionable P0/P1/P2 visual or interaction findings remain.

## Guided subclass and linked companion flow — 2026-08-08

- Browser evidence: `G:\dnd-character-studio\qa\guided-level-up\mate-battle-smith-review-desktop.jpg`, `G:\dnd-character-studio\qa\guided-level-up\steel-defender-desktop.jpg`, and `G:\dnd-character-studio\qa\guided-level-up\steel-defender-narrow.jpg`.
- State: disposable duplicate of MATE-67 (Copy), Artificer 3 advancing to Artificer 4 while repairing the missing level-3 specialist selection.
- Functional sequence: Class → HP → Choices exposes Alchemist, Armorer, Artillerist, and Battle Smith; selecting Battle Smith requires a companion name; Review shows the subclass and linked companion before commit.
- Steel Defender result: Rivet appears directly below the owner's core stats with AC 15, HP 26, speed 40 ft., repair uses, fixed ability scores, derived saves/senses, and owner-derived attack values.
- Interaction checks: collapse/expand persisted after reload; Present/Not present persisted after reload; naming remained editable; repeated controls preserved unrelated character state.
- Desktop viewport: 1440 x 1024 CSS px. The companion panel follows the existing sheet rhythm and glass hierarchy without obscuring the next-level action.
- Narrow viewport request: 390 x 844 CSS px; browser content width and document scroll width remained 375px with no horizontal overflow. Companion vitals and ability scores resolve into readable two- and three-column grids.
- The disposable level-4 Battle Smith was deleted after verification. The original MATE-67 (Copy) remains the active level-3 Artificer with no committed subclass or companion mutation.
- Runtime after a clean reload was functional with no new errors. The browser log retained one earlier Vite hot-reload failure for `LevelUpWizard.jsx` from before the corrected module loaded; production build and all live interactions pass.
- Automated verification: 25 domain/data tests passed, 4 Sites packaging tests passed, and the production build completed.
- No actionable P0/P1/P2 visual or interaction findings remain.

## Guided mechanical choices and grant synchronization — 2026-08-09

- Browser evidence: `G:\dnd-character-studio\qa\progression-depth\level-review-desktop.jpg` and `G:\dnd-character-studio\qa\progression-depth\level-review-mobile.jpg`.
- State: MATE-67 (Copy), level 4 Battle Smith Artificer. The wizard detects and repairs the missing Artificer 4 ASI/feat decision while previewing level 5; no QA level-up was committed.
- Functional sequence: open level-up → Class → Hit points → Choices → choose Feat → choose Tough → Review. Review shows Tough, maximum HP, `4 × 1st · 2 × 2nd` slots, Extra Attack, Branding Smite, and Warding Bond before commit.
- Existing level-4 state now derives 14 Artificer/Battle Smith/Warforged features. Heroism and Shield appear as always-prepared Battle Smith spells and cannot be removed or unprepared.
- Narrow evidence uses a same-origin 390 × 844 QA frame. Its internal app viewport reported 390px width, 375px document width, and no horizontal overflow. The temporary wrapper was removed after capture.
- The app was left on the populated Features view with no modal open. No character progression was committed during QA.
- Browser console warnings/errors: none.
- Automated verification: 33 domain/data tests passed, 4 Sites packaging tests passed, production build passed, and the `dnd-linked-companions` skill validator passed.

## Player skills stat block — 2026-08-09

- Browser evidence: `G:\dnd-character-studio\qa\player-skills\skills-desktop.jpg` and `G:\dnd-character-studio\qa\player-skills\skills-mobile-edit.jpg`.
- State: MATE-67 (Copy), level 4 Battle Smith Artificer. The saved character was restored to its original zero selected skill proficiencies after QA.
- The Sheet now displays all 18 skills beneath ability/core statistics with governing ability, calculated modifier, proficiency marker, and expertise support.
- Edit proficiencies opens an explicit draft mode. Save persisted Arcana and Investigation across reload while preserving HP and unrelated character state; a second save restored the original skill list. Cancel discarded an Athletics draft without changing the character.
- Passive Perception now derives from the Perception skill result. With no selected Perception proficiency, MATE-67 (Copy) correctly displays 10 rather than automatically adding proficiency.
- Desktop pass 1 exposed truncated long skill names in a six-column grid. The final three-column layout keeps Animal Handling and Sleight of Hand readable while preserving the existing glass hierarchy.
- Narrow QA used a 390 × 844 same-origin frame: internal document width was 375px with no horizontal overflow; all skill choices and Save/Cancel controls were reachable. The wrapper itself logged one harness-only MutationObserver error while the inner app remained interactive; the desktop app console had no warnings or errors.
- Automated verification: 35 domain/data tests passed, 4 Sites packaging tests passed, and the production build passed.

final result: passed

## 5e Companion CAH import review — 2026-09-01

- Desktop QA at 1440 × 1024 verified the Alkyn import summary, native-format boundary, compatibility warning hierarchy, complete footer actions, and cancel-without-mutation behavior.
- Narrow QA at 390 × 844 verified the mobile character drawer upload path, single-column review layout, contained scrolling, and reachable confirmation action without horizontal overflow.
- Confirming the sample added one native level 11 Devil Soul Sorcerer with 71/71 HP, 28 spells, six archived notes, the embedded portrait, and preserved source metadata. The imported Sheet, Spells, and Notes views rendered normally.
- Unknown subclass mechanics remained descriptive and did not register executable effects. Browser console warnings/errors: none.
- Automated verification: 167 application tests, 4 Sites tests, 3 portable-server tests, a 260-build matrix, and the production PWA build passed.

final result: passed

## Finalization, provenance, and portable release — 2026-09-01

- Refreshed the licensed Open5e `srd-2014` class snapshot: 12 classes, 12 subclasses, 110 class features, and 60 subclass features. The local Artificer/Battle Smith package remains explicitly expanded content.
- Closed the catalog audit from 58/78 to 78/78 ancestry options with authored creation guidance; no option uses the generic manual-confirmation fallback.
- Sheet core-stat cards now open a keyboard-accessible calculation dialog with current value, base formula, every typed-effect contribution, and active roll restrictions. Escape closes the dialog and restores focus to its source card.
- Production code splitting reduced initial JavaScript from 785.40 kB to 305.00 kB (92.79 kB gzip) and removed the oversized-chunk warning. The generated PWA precaches all 28 split application entries.
- The Windows launcher now builds and serves the production application through a loopback-only server with SPA fallback, cache policy, MIME handling, traversal protection, health response, CSP, and focused tests.
- Desktop QA at 1440 × 1000 verified the Sheet hierarchy and calculation dialog. Narrow QA at 390 × 844 verified the responsive hero, resources, core cards, bottom-sheet dialog, lazy-loaded Spells view, and no horizontal overflow (390px viewport; 375px document width).
- Browser console warnings/errors: none. No character data was mutated during QA. Automated verification: 161 application tests, 4 Sites tests, 2 portable-server tests, a 260-build matrix, production build, and complete 78-option catalog audit passed.

final result: passed

## Universal effects, mutation History, and recovery — 2026-08-17

- Desktop QA at 1440 × 1024 verified the calculated Sheet, resource controls, skills, attacks, and source-backed derived values in the established liquid-glass hierarchy.
- A live HP decrement produced one readable categorized History event (`HP 59 → 58`) with no unrelated state change. The 390 × 844 History view kept navigation, event groups, and timeline content within the viewport.
- Browser recovery QA rejected a malformed v2 import without replacing the existing four-character library. A valid v1 fixture migrated to v2, loaded as `Legacy Fixture`, and persisted across reload.
- Browser console warnings/errors: none. Automated verification: 160 application tests and 4 Sites packaging tests passed; production build completed.

final result: passed

## Special weapons and starting substitutions — 2026-08-17

- Character creation now expands each generic simple/martial weapon allowance into its own canonical selector. A Fighter's two-weapon package independently selected Lance and Net and wrote concrete weapon profiles to Inventory.
- Sheet QA verified the lance's one-handed mounted grip, blocked one-handed/unmounted state, 5-foot disadvantage rule, and 10-foot reach. Net QA verified one attack, no damage modifier, target size/form controls, and readable restraint/escape/destruction resolution.
- Desktop viewport: 1440 × 1024. Narrow viewport: 390 × 844. Creation selectors, weapon cards, and expanded Target check stayed within their glass panels without horizontal overflow or clipped controls.
- Visual QA caught and corrected a net display regression that initially rendered `— + 2`; the final card renders `—` and the focused regression locks this behavior.
- Browser console errors: none. Automated verification: 149 application tests and 4 Sites packaging tests passed; production build completed.

final result: passed

## Spell ledger and slot-pip refinement — 2026-08-09

- Browser evidence: `G:\dnd-character-studio\qa\spell-slots\spell-ledger-desktop.jpg` and `G:\dnd-character-studio\qa\spell-slots\spell-ledger-narrow.jpg`.
- State: MATE-67 (Copy), level 4 Battle Smith Artificer. The header reports `2 on sheet · 0/6 prepared · 2 automatically granted · 0/2 cantrips known`.
- The ledger is left-oriented. A slim vertical divider ends the capacity line and introduces the adjacent slot pools on desktop; narrow layout changes this to a horizontal divider above the pools.
- Each slot is represented by an illuminated Phosphor Sparkle button. Available pips use gold edge light and inset depth; spent pips become quiet outlined controls while retaining explicit accessible labels.
- A live interaction spent one 1st-level slot, persisted `2/3` across reload, restored the third pip, and persisted `3/3` across a second reload. No test resource mutation remained.
- Desktop document width matched its 1280px viewport. Narrow QA used a same-origin 390 × 844 frame; its internal document remained 375px wide with no horizontal overflow.
- Desktop console warnings/errors: none. The temporary narrow harness emitted the previously observed MutationObserver instrumentation error; the inner app remained interactive and the harness was removed after capture.
- Automated verification: 43 domain/data tests passed, 4 Sites packaging tests passed, and the production build passed.

## Rules-detail and sheet-density pass — 2026-08-09

- Browser evidence: `G:\dnd-character-studio\qa\rules-details\feat-details-desktop.jpg`, `spell-details-desktop.jpg`, `feature-details-desktop.jpg`, `compact-skills-desktop.jpg`, `feat-details-narrow.jpg`, `spell-details-narrow.jpg`, `spell-header-narrow.jpg`, and `compact-skills-narrow.jpg`.
- Feats: all 42 catalog entries have an original summary and complete mechanical bullet list. Search covers names and mechanics; ineligible entries remain inspectable while blocked from selection. Weapon Master exposes its +1 ability choice and four weapon proficiencies.
- Spells: Heroism resolved its exact Open5e SRD 2014 record and displayed casting time, range, duration, concentration, V/S/M components, school, tags, full description, and source. Search results also expose descriptions before Add.
- Spell resources: the header reports cantrips known and per-level available/total slots. A live use/restore check round-tripped MATE-67 (Copy)'s 1st-level slots from 3/3 to 2/3 and back to 3/3; no resource mutation remained.
- Features: Magical Tinkering expanded to show available properties, action/lifetime behavior, and the Intelligence-based active-object limit. The same expandable treatment covers every currently modeled Artificer, Battle Smith, and Warforged feature.
- Sheet density: normal view moved Skills into the stat workspace and showed nine bonuses above zero. Edit proficiencies still exposed all 18 skills; Cancel returned to the compact state without mutation.
- Narrow QA used a same-origin 390 × 844 frame. Internal document width remained 375px with no horizontal overflow; the Heroism detail panel measured 333px and feat/skill details remained readable.
- Desktop browser console warnings/errors: none. The temporary narrow harness emitted the previously observed MutationObserver instrumentation error; the inner app remained interactive and the harness was removed after capture.
- Automated verification: 40 domain/data tests passed, 4 Sites packaging tests passed, and the production build passed.

## Saving throws in ability cards — 2026-08-09

- The Sheet places each saving throw immediately beneath its matching ability modifier and visibly marks proficient saves with a filled shield and teal treatment.
- Values are calculated from ability modifier, level-scaled proficiency, original-class save proficiencies, Resilient, and explicit adjustments. Legacy characters with an empty saved list are repaired through first-class inference without rewriting their stored record.
- New-character creation persists the selected starting class's two saving-throw proficiencies; multiclass levels do not add another pair.
- Browser evidence: `G:\dnd-character-studio\qa\saving-throws\saving-throws-desktop.jpg` and `G:\dnd-character-studio\qa\saving-throws\saving-throws-narrow.jpg`.
- State: MATE-67 (Copy), level 4 Battle Smith Artificer. The visible totals are STR -1, DEX +2, CON +5, INT +6, WIS +0, and CHA +0; Constitution and Intelligence are visibly marked proficient.
- Desktop viewport: 1280 × 720 CSS px. Every card remained 80px wide and 118px tall with the complete save label visible; the document stayed within the viewport width.
- Narrow QA used a same-origin 390 × 844 frame. The internal app document measured 375px wide with no horizontal overflow; cards resolved to a readable 3 × 2 grid at 106px square.
- The desktop app console had no warnings or errors. The temporary narrow wrapper reported the previously observed harness-only MutationObserver error; the inner app remained rendered and interactive, and the wrapper was removed after capture.
- Automated verification: 39 domain/data tests passed, 4 Sites packaging tests passed, and the production build passed.

## Situational attack context — 2026-08-17

- The Sheet attack card now exposes one compact, collapsible Target check for distance, cover, mutual visibility, a nearby hostile, and a prone target.
- Desktop QA verified a normal Quarterstaff state, prone-within-5-feet advantage, half-cover target defense, and a blocked target beyond reach. Narrow QA at 390 × 844 kept every field, explanation, and result inside the single-column card without horizontal overflow.
- Target checks remained transient and caused no character or History mutation. Browser console errors: none.
- Automated verification: 144 domain/data tests passed, 4 Sites packaging tests passed, and the production build completed.

final result: passed

## Dated session archive and catch-up dialog — 2026-09-01

- Replaced the single overwritable Session Notes area with a persistent new-session draft, Session Date picker, and disabled-until-complete Save Session action.
- Saving appends a dated immutable recap, clears only the draft, and preserves personality traits, ideals, bonds, flaws, and older sessions. Schema v2 notes migrate into the first v3 archive entry without prose loss.
- Previous sessions appear below the profile notes as concise dated cards. Selecting a card opens a focused reading dialog with preserved line breaks and saved timestamp.
- Desktop QA at 1440 × 1000 verified composer hierarchy, migrated archive presentation, modal focus, and corrected root-level dialog stacking. Narrow QA at 390 × 844 verified the stacked date field, full-width save action, readable archive dialog, and no horizontal overflow.
- No session entry was created for QA. MATE-67 was restored as the active character. Browser console warnings/errors: none.
- Automated verification: 164 application tests, 4 Sites tests, 2 portable-server tests, a 260-build matrix, and the production PWA build passed.

final result: passed
