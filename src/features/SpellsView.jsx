import { BookOpen, CaretDown, CaretUp, MagnifyingGlass, Plus, Sparkle, SpinnerGap, Trash, WifiHigh } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { getSpellByName, searchSpells, spellRecordFromOpen5e } from "../data/open5e.js";
import { getCharacterSpells } from "../domain/grantedContent.js";
import { appendHistoryEvent } from "../domain/history.js";
import { spellCapacity, spellUsageByClass } from "../domain/spellCapacity.js";
import { availableCastingOptions, spendCastingSlot, spellcastingStatus } from "../domain/spellcasting.js";
import { CLASS_RULES } from "../domain/rules.js";
import { createFamiliar, createSteed } from "../domain/companions.js";
import { FAMILIAR_FORMS_2014, familiarForm } from "../data/familiarForms2014.js";
import { STEED_FORMS_2014, steedForm } from "../data/steedForms2014.js";
import { patchSpell, setPactSlotCurrent, setSpellSlotUsed } from "../domain/mutations.js";

function levelLabel(level) {
  return Number(level) === 0 ? "Cantrip" : `Level ${level}`;
}

function ordinal(level) {
  return ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"][level] || `${level}th`;
}

function components(spell) {
  return [spell.verbal && "V", spell.somatic && "S", spell.material && "M"].filter(Boolean).join(", ") || "None";
}

function SpellRules({ spell, status }) {
  if (status === "loading") return <div className="spell-detail-status"><SpinnerGap className="spin" size={17} /> Loading licensed SRD details…</div>;
  if (status === "error") return <div className="spell-detail-status error">The complete SRD entry could not be loaded. Check the connection and try again.</div>;
  if (!spell?.desc) return null;
  return <section className="spell-rules" aria-label={`${spell.name} complete spell description`}>
    <dl>
      <div><dt>Casting time</dt><dd>{spell.castingTime || spell.casting_time}{spell.reactionCondition || spell.reaction_condition ? ` — ${spell.reactionCondition || spell.reaction_condition}` : ""}</dd></div>
      <div><dt>Range</dt><dd>{spell.range || spell.range_text}</dd></div>
      <div><dt>Duration</dt><dd>{spell.concentration ? "Concentration, " : ""}{spell.duration || "Instantaneous"}</dd></div>
      <div><dt>Components</dt><dd>{components(spell)}{spell.materialSpecified || spell.material_specified ? ` (${spell.materialSpecified || spell.material_specified})` : ""}</dd></div>
      <div><dt>School</dt><dd>{spell.school?.name || spell.school || "—"}</dd></div>
      <div><dt>Tags</dt><dd>{[spell.ritual && "Ritual", spell.concentration && "Concentration"].filter(Boolean).join(" · ") || "—"}</dd></div>
    </dl>
    <p>{spell.desc}</p>
    {(spell.higherLevel || spell.higher_level) && <div className="higher-level"><strong>At higher levels</strong><p>{spell.higherLevel || spell.higher_level}</p></div>}
    <small>Licensed rules text · {spell.source || spell.document?.display_name || "Open5e SRD 2014"}</small>
  </section>;
}

function SpellPieceControl({ label, forms, formFinder, choice, onChoice, onSummon, blockedReason }) {
  const selectedForm = formFinder(choice?.formId);
  return <section className="spell-companion-control">
    <div><strong>{label} on the Sheet</strong><small>Choose a form and name. Learning or preparing this spell never summons automatically.</small></div>
    <label><span>Form</span><select value={choice?.formId || forms[0].id} onChange={(event) => onChoice({ ...choice, formId: event.target.value })}>{forms.map((form) => <option key={form.id} value={form.id}>{form.name}</option>)}</select></label>
    <label><span>Name</span><input value={choice?.name || ""} onChange={(event) => onChoice({ ...choice, name: event.target.value })} placeholder={selectedForm.name} /></label>
    <button onClick={onSummon} disabled={Boolean(blockedReason)} title={blockedReason || ""}>Send to Sheet</button>
  </section>;
}

export function SpellsView({ character, updateCharacter }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [openSpellId, setOpenSpellId] = useState("");
  const [spellDetails, setSpellDetails] = useState({});
  const [detailStatuses, setDetailStatuses] = useState({});
  const [familiarChoices, setFamiliarChoices] = useState({});
  const [castSpell, setCastSpell] = useState(null);
  const [castOption, setCastOption] = useState("");
  const [sourceClassId, setSourceClassId] = useState(character.classLevels.find((entry) => CLASS_RULES[entry.classId]?.caster !== "none")?.classId || "");
  const spells = useMemo(() => getCharacterSpells(character), [character]);
  const grouped = useMemo(() => spells.reduce((groups, spell) => {
    const label = levelLabel(spell.level);
    groups[label] ||= [];
    groups[label].push(spell);
    return groups;
  }, {}), [spells]);
  const cantripsKnown = spells.filter((spell) => Number(spell.level) === 0).length;
  const automaticallyGranted = spells.filter((spell) => spell.granted && Number(spell.level) > 0).length;
  const chosenLeveledSpells = spells.filter((spell) => !spell.granted && Number(spell.level) > 0).length;
  const capacity = spellCapacity(character);
  const spellUsage = spellUsageByClass(character, spells);
  const castingOptions = castSpell ? availableCastingOptions(character, castSpell.level) : [];
  const castingStatus = spellcastingStatus(character);

  async function runSearch(event) {
    event.preventDefault();
    if (!query.trim()) return;
    setStatus("loading");
    setMessage("");
    try {
      const payload = await searchSpells(query);
      setResults(payload.results);
      setStatus("ready");
      setMessage(payload.fromCache ? "Showing cached SRD results." : `Found ${payload.count} SRD matches.`);
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  }

  function addSpell(spell) {
    if (spells.some((entry) => entry.name.toLowerCase() === spell.name.toLowerCase())) return;
    const casterClasses = capacity.classes.map((entry) => entry.classId);
    const owner = casterClasses.length === 1 ? casterClasses[0] : sourceClassId;
    if (!owner) { setMessage("Choose which class grants this spell before adding it."); return; }
    const next = { ...character, spells: [...(character.spells || []), spellRecordFromOpen5e(spell, { sourceClassId: owner })] };
    updateCharacter(appendHistoryEvent(next, { type: "spell-added", title: `Added ${spell.name}`, detail: "Spellbook updated", changes: { spellsAdded: [spell.name] } }));
  }

  function openCast(spell) {
    const options = availableCastingOptions(character, spell.level);
    setCastSpell(spell);
    setCastOption(options[0] ? `${options[0].pool}:${options[0].level}` : "");
  }

  function confirmCast() {
    const [pool, level] = castOption.split(":");
    updateCharacter(spendCastingSlot(character, { pool, level: Number(level), spellLevel: Number(castSpell.level) }, castSpell.name));
    setCastSpell(null);
  }

  function removeSpell(spell) {
    const next = { ...character, spells: (character.spells || []).filter((entry) => entry.id !== spell.id) };
    updateCharacter(appendHistoryEvent(next, { type: "spell-removed", title: `Removed ${spell.name}`, detail: "Spellbook updated", changes: { spellsRemoved: [spell.name] } }));
  }

  function togglePrepared(spell) {
    if (spell.alwaysPrepared) return;
    const owner = spell.sourceClassId || (capacity.classes.length === 1 ? capacity.classes[0].classId : "");
    const usage = spellUsage.find((entry) => entry.classId === owner);
    if (!usage) { setMessage("Assign this spell to one of the character's classes before preparing it."); return; }
    if (usage.mode === "known") return;
    if (!spell.prepared && usage.used >= usage.limit) { setMessage(`${CLASS_RULES[owner]?.name || owner} already has its maximum prepared spells.`); return; }
    updateCharacter(patchSpell(character, spell.id, { prepared: !spell.prepared }, `${spell.prepared ? "Unprepared" : "Prepared"} ${spell.name}`));
  }

  function assignSpellOwner(spell, owner) {
    updateCharacter(patchSpell(character, spell.id, { sourceClassId: owner, prepared: false }, `Assigned ${spell.name}`));
  }

  function changeSlot(levelIndex, delta) {
    const totals = character.spellSlots || [];
    const used = totals.map((total, index) => Math.min(Number(total), Math.max(0, Number(character.usedSpellSlots?.[index] || 0))));
    used[levelIndex] = Math.min(Number(totals[levelIndex]), Math.max(0, used[levelIndex] + delta));
    updateCharacter(setSpellSlotUsed(character, levelIndex, used[levelIndex]));
  }

  async function toggleSpellDetails(spell) {
    if (openSpellId === spell.id) {
      setOpenSpellId("");
      return;
    }
    setOpenSpellId(spell.id);
    if (spell.desc || spellDetails[spell.id]) return;
    setDetailStatuses((current) => ({ ...current, [spell.id]: "loading" }));
    try {
      const detail = await getSpellByName(spell.name);
      setSpellDetails((current) => ({ ...current, [spell.id]: spellRecordFromOpen5e(detail) }));
      setDetailStatuses((current) => ({ ...current, [spell.id]: "ready" }));
    } catch {
      setDetailStatuses((current) => ({ ...current, [spell.id]: "error" }));
    }
  }

  function isFindFamiliar(spell) {
    return String(spell.canonicalId || spell.id || spell.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").includes("find-familiar");
  }

  function isFindSteed(spell) {
    return String(spell.canonicalId || spell.id || spell.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").includes("find-steed");
  }

  function summonFamiliar(spell) {
    const choice = familiarChoices[spell.id] || { formId: "owl", name: "" };
    const form = familiarForm(choice.formId);
    const familiar = createFamiliar(character, spell, form, choice.name || form.name);
    const replaced = (character.companions || []).filter((entry) => entry.type === "familiar");
    const existing = (character.companions || []).filter((entry) => entry.type !== "familiar");
    const next = { ...character, companions: [...existing, familiar] };
    updateCharacter(appendHistoryEvent(next, { type: "companion-summoned", title: `Summoned ${familiar.name}`, detail: `Find Familiar · ${form.name}`, changes: { companionsAdded: [familiar.name], companionsRemoved: replaced.map((entry) => entry.name) } }));
  }

  function summonSteed(spell) {
    const choice = familiarChoices[spell.id] || { formId: "warhorse", name: "" };
    const form = steedForm(choice.formId);
    const steed = createSteed(character, spell, form, choice.name || form.name);
    const replaced = (character.companions || []).filter((entry) => entry.type === "spell-steed");
    const existing = (character.companions || []).filter((entry) => entry.type !== "spell-steed");
    const next = { ...character, companions: [...existing, steed] };
    updateCharacter(appendHistoryEvent(next, { type: "companion-summoned", title: `Summoned ${steed.name}`, detail: `Find Steed · ${form.name}`, changes: { companionsAdded: [steed.name], companionsRemoved: replaced.map((entry) => entry.name) } }));
  }

  return (
    <div className="collection-view">
      <header className="view-header spell-view-header">
        <div className="spell-heading-copy"><p className="eyebrow">Character library</p><h1>Spells</h1><span className="spell-capacity-line"><b>{spells.length}</b> on sheet <i>·</i> <b>{chosenLeveledSpells}/{capacity.leveledLimit}</b> {capacity.mode} <i>·</i> <b>{automaticallyGranted}</b> automatically granted <i>·</i> <b>{cantripsKnown}/{capacity.cantripLimit}</b> cantrips known</span></div>
        <div className="spell-slot-overview" aria-label="Spell slots">
          {character.spellSlots?.length ? character.spellSlots.map((total, index) => {
            const available = Math.max(0, Number(total) - Number(character.usedSpellSlots?.[index] || 0));
            return <div className="spell-slot-pool" key={index}><div className="slot-pool-label"><small>{ordinal(index + 1)} level</small><strong>{available}<i>/{total}</i></strong></div><div className="slot-pips">{Array.from({ length: Number(total) }, (_, slotIndex) => {
              const isAvailable = slotIndex < available;
              return <button key={slotIndex} className={isAvailable ? "available" : "spent"} onClick={() => changeSlot(index, isAvailable ? 1 : -1)} aria-label={`${isAvailable ? "Spend" : "Restore"} ${ordinal(index + 1)}-level spell slot ${slotIndex + 1}`}><Sparkle size={15} weight={isAvailable ? "fill" : "regular"} /></button>;
            })}</div></div>;
          }) : <div className="no-slots"><BookOpen size={20} /><span>No spell slots</span></div>}
          {character.pactSlots && <div className="spell-slot-pool pact-pool"><div className="slot-pool-label"><small>Pact Magic · {ordinal(character.pactSlots.level)}</small><strong>{character.pactSlots.current}<i>/{character.pactSlots.max}</i></strong></div><div className="slot-pips">{Array.from({ length: Number(character.pactSlots.max) }, (_, index) => { const available = index < character.pactSlots.current; return <button key={index} className={available ? "available" : "spent"} onClick={() => updateCharacter(setPactSlotCurrent(character, available ? character.pactSlots.current - 1 : Math.min(character.pactSlots.max, character.pactSlots.current + 1)))} aria-label={`${available ? "Spend" : "Restore"} Pact Magic slot ${index + 1}`}><Sparkle size={15} weight={available ? "fill" : "regular"} /></button>; })}</div><span className="pool-reset">Short rest · eligible spells from any class</span></div>}
        </div>
      </header>
      {!castingStatus.allowed && <div className="mechanic-warning" role="status"><strong>Spellcasting blocked</strong><span>{castingStatus.reasons.join("; ")}. Unequip it or gain proficiency before casting.</span></div>}
      {spellUsage.length > 0 && <section className="spell-class-capacity" aria-label="Spell capacity by class">{spellUsage.map((part) => <div key={part.classId}><strong>{CLASS_RULES[part.classId]?.name || part.classId} {part.classLevel}</strong><span>{part.used}/{part.limit} {part.mode} · {part.cantrips} cantrips</span></div>)}<p>Known and prepared spells are calculated per class. Spellcasting slots combine by caster level; Pact Magic stays separate.</p></section>}
      <div className="library-layout">
        <section className="glass-panel material-primary collection-list">
          <div className="section-heading"><div><h2>{character.name}'s spellbook</h2><span>Open any spell for its complete licensed rules entry.</span></div></div>
          {Object.entries(grouped).map(([level, levelSpells]) => <div className="grouped-list" key={level}><h3>{level}</h3>{levelSpells.map((spell) => {
            const isOpen = openSpellId === spell.id;
            const detail = spell.desc ? spell : spellDetails[spell.id];
            return <article className={isOpen ? "spell-entry open" : "spell-entry"} key={spell.id}>
              <button className={`prepared-toggle ${spell.prepared ? "active" : ""}`} onClick={() => togglePrepared(spell)} aria-pressed={spell.prepared} disabled={spell.alwaysPrepared || spellUsage.find((entry) => entry.classId === (spell.sourceClassId || (capacity.classes.length === 1 ? capacity.classes[0].classId : "")))?.mode === "known"}>{spell.alwaysPrepared ? "Always prepared" : spellUsage.find((entry) => entry.classId === (spell.sourceClassId || (capacity.classes.length === 1 ? capacity.classes[0].classId : "")))?.mode === "known" ? "Known" : spell.prepared ? "Prepared" : "Prepare"}</button>
              <button className="spell-summary" onClick={() => toggleSpellDetails(spell)} aria-expanded={isOpen}><span><strong>{spell.name}</strong><small>{spell.castingTime} · {spell.range} · {spell.source || "Character spell"}</small></span>{isOpen ? <CaretUp size={17} /> : <CaretDown size={17} />}</button>
              {!spell.granted && capacity.classes.length > 1 && <select className="spell-owner-select" value={spell.sourceClassId || ""} onChange={(event) => assignSpellOwner(spell, event.target.value)} aria-label={`${spell.name} owner class`}><option value="">Choose class</option>{capacity.classes.map((part) => <option key={part.classId} value={part.classId}>{CLASS_RULES[part.classId]?.name || part.classId}</option>)}</select>}
              {!spell.granted && <button className="icon-button subtle" onClick={() => removeSpell(spell)} aria-label={`Remove ${spell.name}`}><Trash size={17} /></button>}
              {Number(spell.level) > 0 && <button className="spell-cast-action" onClick={() => openCast(spell)} disabled={!availableCastingOptions(character, spell.level).length} title={!castingStatus.allowed ? castingStatus.reasons.join("; ") : ""}>Cast</button>}
              {isOpen && <div className="spell-expanded-content">
                <SpellRules spell={detail} status={detailStatuses[spell.id]} />
                {isFindFamiliar(spell) ? <SpellPieceControl label="Familiar" forms={FAMILIAR_FORMS_2014} formFinder={familiarForm} choice={familiarChoices[spell.id]} onChoice={(choice) => setFamiliarChoices((current) => ({ ...current, [spell.id]: choice }))} onSummon={() => summonFamiliar(spell)} blockedReason={!castingStatus.allowed ? castingStatus.reasons.join("; ") : ""} /> : null}
                {isFindSteed(spell) ? <SpellPieceControl label="Steed" forms={STEED_FORMS_2014} formFinder={steedForm} choice={familiarChoices[spell.id]} onChoice={(choice) => setFamiliarChoices((current) => ({ ...current, [spell.id]: choice }))} onSummon={() => summonSteed(spell)} blockedReason={!castingStatus.allowed ? castingStatus.reasons.join("; ") : ""} /> : null}
              </div>}
            </article>;
          })}</div>)}
          {!spells.length && <div className="empty-state"><BookOpen size={32} /><h2>No spells yet</h2><p>Granted spells will appear automatically; searched spells can be added from the catalog.</p></div>}
        </section>
        <aside className="glass-panel material-primary reference-panel">
          <p className="section-kicker">Open5e · SRD 2014</p><h2>Find a spell</h2><p>Search licensed reference data, inspect complete mechanics, then add a result.</p>{capacity.classes.length > 1 && <label className="spell-owner-field"><span>Add spells for</span><select value={sourceClassId} onChange={(event) => setSourceClassId(event.target.value)}>{capacity.classes.map((part) => <option key={part.classId} value={part.classId}>{CLASS_RULES[part.classId]?.name || part.classId}</option>)}</select></label>}
          <form className="reference-search" onSubmit={runSearch}><MagnifyingGlass size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search spell names" /><button type="submit">Search</button></form>
          {status === "loading" && <div className="reference-status"><SpinnerGap className="spin" size={20} /> Contacting Open5e…</div>}
          {message && <div className={`reference-status ${status}`}><WifiHigh size={18} /> {message}</div>}
          <div className="reference-results">{results.map((spell) => <article key={spell.key}><div><strong>{spell.name}</strong><span>{levelLabel(spell.level)} · {spell.school?.name || "Spell"}</span><details className="search-spell-details"><summary>Read description</summary><p>{spell.desc}</p>{spell.higher_level && <p><strong>At higher levels:</strong> {spell.higher_level}</p>}</details></div><button onClick={() => addSpell(spell)} disabled={spells.some((entry) => entry.name.toLowerCase() === spell.name.toLowerCase())}><Plus size={16} /> Add</button></article>)}</div>
        </aside>
      </div>
      {castSpell && <div className="modal-backdrop" role="presentation"><section className="modal-shell material-floating spell-cast-dialog" role="dialog" aria-modal="true" aria-labelledby="cast-heading"><header className="modal-header"><div><p className="eyebrow">Spend a slot</p><h2 id="cast-heading">Cast {castSpell.name}</h2></div><button className="icon-button" onClick={() => setCastSpell(null)} aria-label="Close casting dialog">×</button></header><div className="wizard-body"><p className="form-hint">Choose either eligible pool. Pact Magic and Spellcasting remain independently tracked.</p>{castingOptions.length ? <div className="casting-options">{castingOptions.map((option) => { const value = `${option.pool}:${option.level}`; return <button key={value} className={castOption === value ? "selected" : ""} onClick={() => setCastOption(value)}><strong>{option.label}</strong><small>{option.available} available · casts at level {option.level}</small></button>; })}</div> : <div className="error-banner">No eligible slot is available.</div>}</div><footer className="modal-actions"><button className="secondary-action" onClick={() => setCastSpell(null)}>Cancel</button><button className="primary-action" disabled={!castOption} onClick={confirmCast}>Cast spell</button></footer></section></div>}
    </div>
  );
}
