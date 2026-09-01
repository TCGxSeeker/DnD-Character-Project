import { CaretDown, CaretUp, Horse, MagicWand, PlusCircle } from "@phosphor-icons/react";
import { useState } from "react";
import { createFamiliar, createSteed } from "../domain/companions.js";
import { appendHistoryEvent } from "../domain/history.js";
import { availableCompanionSpellRecords } from "../domain/spellCompanionAvailability.js";
import { FAMILIAR_FORMS_2014, familiarForm } from "../data/familiarForms2014.js";
import { STEED_FORMS_2014, steedForm } from "../data/steedForms2014.js";
import { spellcastingStatus } from "../domain/spellcasting.js";

const DEFINITIONS = {
  "find-familiar": { label: "Find Familiar", type: "familiar", forms: FAMILIAR_FORMS_2014, defaultForm: "owl", form: familiarForm, create: createFamiliar, icon: MagicWand },
  "find-steed": { label: "Find Steed", type: "spell-steed", forms: STEED_FORMS_2014, defaultForm: "warhorse", form: steedForm, create: createSteed, icon: Horse },
};

export function availableCompanionSpells(character) {
  return availableCompanionSpellRecords(character).map((entry) => ({ ...entry, definition: DEFINITIONS[entry.key] }));
}

export function SpellCompanionLaunchers({ character, updateCharacter }) {
  const available = availableCompanionSpells(character);
  const [openKey, setOpenKey] = useState(available[0]?.key || "");
  const [choices, setChoices] = useState({});
  const casting = spellcastingStatus(character);
  if (!available.length) return null;

  function summon(entry) {
    const definition = entry.definition;
    const choice = choices[entry.key] || { formId: definition.defaultForm, name: "" };
    const form = definition.form(choice.formId);
    const companion = definition.create(character, entry.spell, form, choice.name || form.name);
    const replaced = (character.companions || []).filter((current) => current.type === definition.type);
    const companions = [...(character.companions || []).filter((current) => current.type !== definition.type), companion];
    const next = { ...character, companions };
    updateCharacter(appendHistoryEvent(next, { type: "companion-summoned", title: `Summoned ${companion.name}`, detail: `${definition.label} · ${form.name}`, changes: { companionsAdded: [companion.name], companionsRemoved: replaced.map((current) => current.name) } }));
  }

  return <section className="spell-piece-launchers glass-panel material-primary" aria-labelledby="spell-pieces-heading">
    <header><div><p className="eyebrow">Prepared companion magic</p><h2 id="spell-pieces-heading">Spell-linked pieces</h2></div><span>Choose what is currently present on the Sheet.</span></header>
    {!casting.allowed && <div className="mechanic-warning compact" role="status"><strong>Spellcasting blocked</strong><span>{casting.reasons.join("; ")}</span></div>}
    {available.map((entry) => { const open = openKey === entry.key; const choice = choices[entry.key] || { formId: entry.definition.defaultForm, name: "" }; const Icon = entry.definition.icon; return <article key={entry.key}>
      <button className="spell-piece-summary" onClick={() => setOpenKey(open ? "" : entry.key)} aria-expanded={open}><Icon size={20} /><span><strong>{entry.definition.label}</strong><small>Known or prepared · no creature is created until confirmed</small></span>{open ? <CaretUp /> : <CaretDown />}</button>
      {open && <div className="spell-piece-controls"><label><span>Form</span><select value={choice.formId} onChange={(event) => setChoices((current) => ({ ...current, [entry.key]: { ...choice, formId: event.target.value } }))}>{entry.definition.forms.map((form) => <option key={form.id} value={form.id}>{form.name}</option>)}</select></label><label><span>Name</span><input value={choice.name} onChange={(event) => setChoices((current) => ({ ...current, [entry.key]: { ...choice, name: event.target.value } }))} placeholder={entry.definition.form(choice.formId).name} /></label><button className="primary-action spell-piece-place" onClick={() => summon(entry)} disabled={!casting.allowed} title={!casting.allowed ? casting.reasons.join("; ") : ""}><PlusCircle size={17} weight="bold" /> Place on Sheet</button></div>}
    </article>; })}
  </section>;
}
