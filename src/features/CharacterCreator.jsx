import { ArrowLeft, ArrowRight, Backpack, DiceFive, Info, UserPlus } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Modal } from "../components/Modal.jsx";
import { Stepper } from "../components/Stepper.jsx";
import { CLASS_RULES, ABILITIES, abilityModifier } from "../domain/rules.js";
import { applyFixedAbilityAdjustments, levelOneHitPoints, pointBuyRemaining, validateCreationAbilities, validatePointBuy } from "../domain/creation.js";
import { ANCESTRY_GROUPS, ancestryDisplayName, findAncestry } from "../data/ancestries.js";
import { BACKGROUNDS_2014, findBackground } from "../data/backgrounds2014.js";
import { ancestryCreationDetails, CLASS_CREATION_DETAILS, equipmentChoicesForClass, startingEquipmentForClass, startingWeaponSubstitutionSlots } from "../data/creationCatalog2014.js";
import { startingSavingThrows } from "../domain/savingThrows.js";
import { pactMagicForClassLevels, syncGrantedClassResources } from "../domain/classResources2014.js";
import { creationChoicesForClass } from "../data/classChoices2014.js";
import { creationResolvableClassChoices, resolveCreationClassChoices } from "../domain/classChoices.js";
import {
  findSubclassOptionWithContent,
  localSubclassFeaturesForLevel,
  subclassRuleForClass,
} from "../data/contentCatalog.js";
import { calculateCharacterMaxHp } from "../domain/derivedMechanics.js";
import { hitDicePools } from "../domain/multiclass.js";
import { startingProficiencies } from "../data/startingProficiencies2014.js";

const steps = ["Identity", "Class & level", "Ability scores"];
const defaultAbilities = { strength: 10, dexterity: 14, constitution: 14, intelligence: 12, wisdom: 16, charisma: 10 };

function Modifier({ amount }) {
  if (!amount) return null;
  return <b className={amount > 0 ? "positive" : "negative"}>{amount > 0 ? "+" : ""}{amount} ancestry</b>;
}

export function CharacterCreator({ activePacks = [], onClose, onCreate }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", ancestryId: "human", ancestryOptionId: "standard", backgroundId: "acolyte", classId: "druid", subclassId: "", advancement: "milestone", startingLevel: 1, abilityMethod: "manual", equipmentSelections: {}, weaponSubstitutions: {}, classSkills: ["Arcana", "Animal Handling"], classChoiceSelections: {}, abilities: defaultAbilities });
  const rule = CLASS_RULES[form.classId];
  const classDetails = CLASS_CREATION_DETAILS[form.classId];
  const ancestryRule = findAncestry(form.ancestryId);
  const ancestryOption = ancestryRule.options.find((entry) => entry.id === form.ancestryOptionId);
  const ancestryDetails = useMemo(() => ancestryCreationDetails(ancestryRule, ancestryOption), [ancestryRule, ancestryOption]);
  const background = findBackground(form.backgroundId);
  const classChoices = creationChoicesForClass(form.classId);
  const subclassRule = subclassRuleForClass(form.classId, activePacks);
  const levelOneSubclass = subclassRule?.level === 1 ? subclassRule : null;
  const availableClassSkills = classChoices.skills.options.filter((skill) => !background.skills.includes(skill));
  const finalAbilities = applyFixedAbilityAdjustments(form.abilities, ancestryDetails.fixedAdjustments);
  const pointBuyValid = form.abilityMethod !== "point-buy" || validatePointBuy(form.abilities);
  const abilitiesValid = pointBuyValid && validateCreationAbilities(form.abilities, ancestryDetails.fixedAdjustments);
  const pointsRemaining = pointBuyRemaining(form.abilities);
  const equipmentChoices = equipmentChoicesForClass(form.classId);
  const weaponSubstitutionSlots = startingWeaponSubstitutionSlots(form.classId, form.equipmentSelections);
  const equipment = startingEquipmentForClass(form.classId, form.equipmentSelections, form.weaponSubstitutions);
  const startingSkills = [...new Set([...background.skills, ...form.classSkills])];
  const levelOneChoices = creationResolvableClassChoices(form.classId, startingSkills, form.classChoiceSelections);
  const creationChoicesComplete = levelOneChoices.every((choice) => (form.classChoiceSelections[choice.id] || []).length === choice.count);
  const subclassComplete = !levelOneSubclass || Boolean(form.subclassId);

  function selectAncestry(ancestryId) {
    const next = findAncestry(ancestryId);
    setForm((current) => ({ ...current, ancestryId, ancestryOptionId: next.options[0]?.id || "" }));
  }

  function selectClass(classId) {
    const nextChoices = creationChoicesForClass(classId);
    const available = nextChoices.skills.options.filter((skill) => !background.skills.includes(skill));
    setForm((current) => ({ ...current, classId, subclassId: "", equipmentSelections: {}, weaponSubstitutions: {}, classSkills: available.slice(0, nextChoices.skills.count), classChoiceSelections: {} }));
  }

  function selectBackground(backgroundId) {
    const nextBackground = findBackground(backgroundId);
    const available = classChoices.skills.options.filter((skill) => !nextBackground.skills.includes(skill));
    setForm((current) => ({ ...current, backgroundId, classSkills: current.classSkills.filter((skill) => available.includes(skill)).concat(available.filter((skill) => !current.classSkills.includes(skill))).slice(0, classChoices.skills.count) }));
  }

  function selectClassSkill(index, skill) {
    setForm((current) => ({ ...current, classSkills: current.classSkills.map((entry, currentIndex) => currentIndex === index ? skill : entry) }));
  }

  function toggleCreationChoice(choice, option) {
    setForm((current) => {
      const selected = current.classChoiceSelections[choice.id] || [];
      const next = selected.includes(option) ? selected.filter((entry) => entry !== option) : choice.count === 1 ? [option] : [...selected, option].slice(-choice.count);
      return { ...current, classChoiceSelections: { ...current.classChoiceSelections, [choice.id]: next } };
    });
  }

  function submit(event) {
    event.preventDefault();
    if (step < 2) { setStep((current) => current + 1); return; }
    const name = form.name.trim();
    if (!name || !abilitiesValid || !creationChoicesComplete || !subclassComplete) return;
    const now = new Date().toISOString();
    const resolvedCreationChoices = resolveCreationClassChoices(form.classId, startingSkills, form.classChoiceSelections);
    const localSubclassFeatures = form.subclassId
      ? localSubclassFeaturesForLevel(
          form.classId,
          form.subclassId,
          1,
          activePacks,
        )
      : [];
    const baseMaxHp = levelOneHitPoints(rule.hitDie, finalAbilities.constitution);
    const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
    const createdCharacter = {
      id, name, ancestry: ancestryDisplayName(form.ancestryId, form.ancestryOptionId), ancestryId: form.ancestryId, ancestryOptionId: form.ancestryOptionId,
      background: background.name, backgroundId: background.id, backgroundFeature: background.feature, alignment: "Unaligned", avatar: "vaelithra",
      advancement: form.advancement, experience: 0,
      classLevels: [{ classId: form.classId, level: 1, ...(form.subclassId ? { subclassId: form.subclassId, subclass: findSubclassOptionWithContent(form.classId, form.subclassId, activePacks)?.name } : {}) }],
      levelHistory: [{ level: 1, classId: form.classId, baseHp: rule.hitDie, hpMethod: "maximum", createdAt: now }],
      abilities: finalAbilities, hp: baseMaxHp, maxHp: baseMaxHp, tempHp: 0,
      armorClass: 10 + abilityModifier(finalAbilities.dexterity) + (ancestryRule.armorClassBonus || 0),
      unarmoredArmorClass: 10 + abilityModifier(finalAbilities.dexterity) + (ancestryRule.armorClassBonus || 0),
      armorClassBonuses: { ancestry: ancestryRule.armorClassBonus || 0, misc: 0 }, speed: ancestryDetails.speed || ancestryRule.speed,
      inspiration: false, hitDiceRemaining: 1, hitDicePools: hitDicePools([{ classId: form.classId, level: 1 }]), spellSlots: rule.levelOneSlots || (rule.caster === "full" ? [2] : []), usedSpellSlots: (rule.levelOneSlots || (rule.caster === "full" ? [2] : [])).map(() => 0), pactSlots: pactMagicForClassLevels([{ classId: form.classId, level: 1 }]), resources: syncGrantedClassResources([], [{ classId: form.classId, level: 1 }], finalAbilities),
      skills: startingSkills, saves: startingSavingThrows(form.classId), proficiencies: startingProficiencies(form.classId, background), languages: ["Common", ...background.languages], spells: [], inventory: equipment, companions: [],
      classChoices: resolvedCreationChoices,
      expertise: resolvedCreationChoices.filter((choice) => choice.kind === "expertise").flatMap((choice) => choice.selections || []),
      features: [
        ...resolvedCreationChoices
          .filter((choice) => choice.kind !== "expertise")
          .map((choice) => ({
            id: `class-choice-${choice.id}`,
            name: choice.label,
            source: `${rule.name} 1`,
            detail: choice.selections.join(", "),
            benefits: choice.selections.map((entry) => `Selected: ${entry}.`),
          })),
        ...localSubclassFeatures,
      ],
      notes: "", sessionEntries: [], personality: "", ideals: "", bonds: "", flaws: "",
      history: [{ id: `created-${Date.now()}`, type: "created", title: "Character created", detail: `${rule.name} · ${background.name} · guided target level ${form.startingLevel}`, changes: { itemsAdded: equipment.map((item) => item.name) }, createdAt: now }],
      createdAt: now, updatedAt: now,
    };
    const maxHp = calculateCharacterMaxHp(createdCharacter);
    onCreate({ ...createdCharacter, hp: maxHp, maxHp }, Number(form.startingLevel));
    onClose();
  }

  return (
    <Modal title="Create a character" eyebrow="New local character" onClose={onClose} className="creator-modal">
      <Stepper steps={steps} current={step} />
      <form className="creator-form" onSubmit={submit}>
        {step === 0 && <section className="creator-step form-section">
          <div><p className="section-kicker">Step 1 · Who are they?</p><h3>Identity</h3><p className="form-intro">Choose an ancestry, lineage option, and background. Their complete creation effects stay visible while you decide.</p></div>
          <div className="form-grid two"><label><span>Name</span><input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Character name" /></label><label><span>Background</span><select value={form.backgroundId} onChange={(event) => selectBackground(event.target.value)}>{BACKGROUNDS_2014.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label><label><span>Ancestry</span><select value={form.ancestryId} onChange={(event) => selectAncestry(event.target.value)}>{ANCESTRY_GROUPS.map((group) => <optgroup key={group.id} label={group.label}>{group.ancestries.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</optgroup>)}</select></label>{ancestryRule.options.length > 0 && <label><span>Lineage option</span><select value={form.ancestryOptionId} onChange={(event) => setForm({ ...form, ancestryOptionId: event.target.value })}>{ancestryRule.options.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}{entry.source !== "Published" ? ` — ${entry.source}` : ""}</option>)}</select></label>}</div>
          <div className="creation-reference-grid">
            <article className="choice-reference"><header><span>Ancestry</span><strong>{ancestryDisplayName(form.ancestryId, form.ancestryOptionId)}</strong></header><p>{ancestryDetails.optionSummary || ancestryDetails.summary}</p><dl><div><dt>Body</dt><dd>{ancestryRule.size} · {ancestryDetails.speed || ancestryRule.speed} ft.</dd></div><div><dt>Source</dt><dd>{ancestryOption?.source || ancestryRule.source}</dd></div></dl><h4>Inherited features</h4><ul>{ancestryDetails.traits.map((trait) => <li key={trait}>{trait}</li>)}</ul>{ancestryDetails.access.length > 0 && <><h4>Training & access</h4><ul>{ancestryDetails.access.map((entry) => <li key={entry}>{entry}</li>)}</ul></>}</article>
            <article className="choice-reference"><header><span>Background</span><strong>{background.name}</strong></header><p>{background.roleplay}</p><dl><div><dt>Skills granted</dt><dd>{background.skills.join(", ")}</dd></div><div><dt>Tools</dt><dd>{background.tools.join(", ") || "None"}</dd></div><div><dt>Languages</dt><dd>{background.languages.join(", ") || "None"}</dd></div></dl><h4>{background.feature.name}</h4><p>{background.feature.summary}</p></article>
          </div>
        </section>}

        {step === 1 && <section className="creator-step form-section">
          <div><p className="section-kicker">Step 2 · How do they begin?</p><h3>Starting class & advancement</h3><p className="form-intro">The app creates a rules-valid level 1 character, then opens guided level-up once for every level needed to reach your target.</p></div>
          <div className="form-grid three"><label><span>Class</span><select value={form.classId} onChange={(event) => selectClass(event.target.value)}>{Object.entries(CLASS_RULES).map(([id, entry]) => <option key={id} value={id}>{entry.name} · d{entry.hitDie}</option>)}</select></label><label><span>Advancement</span><select value={form.advancement} onChange={(event) => setForm({ ...form, advancement: event.target.value })}><option value="milestone">Milestone</option><option value="experience">Experience points</option></select></label><label><span>Starting level target</span><select value={form.startingLevel} onChange={(event) => setForm({ ...form, startingLevel: Number(event.target.value) })}>{Array.from({ length: 20 }, (_, index) => <option key={index + 1} value={index + 1}>Level {index + 1}</option>)}</select></label></div>
          {classChoices.skills.count > 0 && <div className="class-skill-choices"><div><span>Starting class skills</span><small>Background skills are excluded automatically.</small></div>{Array.from({ length: classChoices.skills.count }, (_, index) => <label key={index}><span>Skill {index + 1}</span><select value={form.classSkills[index] || ""} onChange={(event) => selectClassSkill(index, event.target.value)}>{availableClassSkills.filter((skill) => skill === form.classSkills[index] || !form.classSkills.includes(skill)).map((skill) => <option key={skill} value={skill}>{skill}</option>)}</select></label>)}</div>}
          {levelOneSubclass && <div className="class-skill-choices"><div><span>{levelOneSubclass.label}</span><small>This level-one subclass choice is required before creation.</small></div><label><span>Choose option</span><select value={form.subclassId} onChange={(event) => setForm({ ...form, subclassId: event.target.value })}><option value="">Select {levelOneSubclass.label.toLowerCase()}</option>{levelOneSubclass.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label></div>}
          {levelOneChoices.map((choice) => <div className="class-skill-choices" key={choice.id}><div><span>{choice.label}</span><small>{choice.parentId ? "Unlocked by the preceding selection. " : ""}Choose {choice.count}; saved permanently to the character.</small></div>{(choice.kind === "expertise" ? startingSkills : choice.options).map((rawOption) => { const option = typeof rawOption === "string" ? rawOption : rawOption.id || rawOption.value || rawOption.label; return <button type="button" key={option} className={(form.classChoiceSelections[choice.id] || []).includes(option) ? "selected" : ""} onClick={() => toggleCreationChoice(choice, option)}>{typeof rawOption === "string" ? rawOption : rawOption.label || rawOption.name || option}</button>; })}</div>)}
          <div className="creation-reference-grid">
            <article className="choice-reference"><header><span>Class briefing</span><strong>{rule.name}</strong></header><p>{classDetails.summary}</p><dl><div><dt>Hit die</dt><dd>d{rule.hitDie}</dd></div><div><dt>Primary ability</dt><dd>{classDetails.primary}</dd></div><div><dt>Saving throws</dt><dd>{classDetails.saves}</dd></div><div><dt>Spellcasting</dt><dd>{rule.caster === "none" ? "None at level 1" : rule.caster}</dd></div></dl><p className="form-hint"><DiceFive size={17} /> Level 1 uses maximum d{rule.hitDie} HP plus final Constitution.</p></article>
            <article className="choice-reference equipment-preview">
              <header><span>Starting items</span><strong><Backpack size={18} /> Class package</strong></header>
              <p>Resolve available class choices here. The resulting items are added directly to Inventory.</p>
              {(equipmentChoices.length > 0 || weaponSubstitutionSlots.length > 0) && <div className="equipment-choice-fields">
                {equipmentChoices.map((choice) => <label key={choice.id}><span>{choice.label}</span><select value={form.equipmentSelections[choice.id] || choice.options[0].id} onChange={(event) => setForm({ ...form, equipmentSelections: { ...form.equipmentSelections, [choice.id]: event.target.value } })}>{choice.options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>)}
                {weaponSubstitutionSlots.map((slot) => <label key={slot.id}><span>{slot.label}</span><select value={form.weaponSubstitutions[slot.id] || slot.options[0].id} onChange={(event) => setForm({ ...form, weaponSubstitutions: { ...form.weaponSubstitutions, [slot.id]: event.target.value } })}>{slot.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>)}
              </div>}
              <ul>{equipment.map((entry) => <li key={entry.id}><span>{entry.name}</span><small>{entry.quantity > 1 ? `×${entry.quantity}` : entry.detail}</small></li>)}</ul>
            </article>
          </div>
          {form.startingLevel > 1 && <div className="creation-progress-note"><Info size={20} /><div><strong>Guided progression: level 1 → {form.startingLevel}</strong><span>After creation, resolve HP, subclass, ASI/feat, spells, and companion choices one level at a time. You can pause safely by closing the wizard.</span></div></div>}
        </section>}

        {step === 2 && <section className="creator-step form-section">
          <div><p className="section-kicker">Step 3 · Set the foundation</p><h3>Ability scores</h3><p className="form-intro">Enter pre-ancestry scores. Fixed ancestry adjustments are applied automatically and shown as a final preview.</p></div>
          <div className="ability-method-options" role="group" aria-label="Ability score method"><button type="button" className={form.abilityMethod === "manual" ? "selected" : ""} onClick={() => setForm({ ...form, abilityMethod: "manual" })}><strong>Manual scores</strong><small>Enter rolled, array, or house-rule values</small></button><button type="button" className={form.abilityMethod === "point-buy" ? "selected" : ""} onClick={() => setForm({ ...form, abilityMethod: "point-buy", abilities: { strength: 8, dexterity: 8, constitution: 8, intelligence: 8, wisdom: 8, charisma: 8 } })}><strong>2014 point buy</strong><small>27 points; scores cost more above 13</small></button></div>
          {form.abilityMethod === "point-buy" && <div className={`point-buy-status ${pointsRemaining < 0 ? "invalid" : ""}`}><strong>{pointsRemaining} / 27 points remaining</strong><span>Scores must be 8-15 before ancestry adjustments. Costs: 8/0, 9/1, 10/2, 11/3, 12/4, 13/5, 14/7, 15/9.</span></div>}
          <div className="ability-adjustment-banner"><div><strong>Fixed adjustments</strong><span>{Object.entries(ancestryDetails.fixedAdjustments).length ? Object.entries(ancestryDetails.fixedAdjustments).map(([ability, amount]) => `${ability.slice(0, 3).toUpperCase()} ${amount >= 0 ? "+" : ""}${amount}`).join(" · ") : "None automated for this option"}</span></div>{ancestryDetails.flexible && <div className="manual-adjustment"><strong>Manual choice required</strong><span>{ancestryDetails.flexible}. Add this directly to the base fields below; the app will not choose abilities for you.</span></div>}</div>
          <div className="ability-inputs creation-abilities">{ABILITIES.map((ability) => { const adjustment = Number(ancestryDetails.fixedAdjustments[ability] || 0); const finalScore = finalAbilities[ability]; return <label key={ability}><span>{ability.slice(0, 3).toUpperCase()}</span><input aria-label={`${ability} base score`} type="number" min={form.abilityMethod === "point-buy" ? 8 : 3} max={form.abilityMethod === "point-buy" ? 15 : 20} value={form.abilities[ability]} onChange={(event) => setForm({ ...form, abilities: { ...form.abilities, [ability]: Number(event.target.value) } })} /><Modifier amount={adjustment} /><strong>Final {finalScore}</strong><small>Modifier {abilityModifier(finalScore) >= 0 ? "+" : ""}{abilityModifier(finalScore)}</small></label>; })}</div>
          {!abilitiesValid && <div className="error-banner">{form.abilityMethod === "point-buy" && !pointBuyValid ? "Point-buy scores must stay from 8 to 15 and cannot exceed the 27-point budget." : "Every final score must be between 3 and 20. Lower a base score that exceeds the limit after its fixed adjustment."}</div>}
          <div className="creation-summary"><span>{background.name} grants <strong>{background.skills.join(" and ")}</strong>.</span><span>{rule.name} grants <strong>{form.classSkills.join(", ")}</strong>.</span><span>{equipment.length} distinct starting items will be added.</span><span>{form.startingLevel > 1 ? `${form.startingLevel - 1} guided level-up transactions will follow.` : "The character will begin at level 1."}</span></div>
        </section>}

        <footer className="modal-actions"><button type="button" className="secondary-action" onClick={() => step === 0 ? onClose() : setStep((current) => current - 1)}>{step > 0 && <ArrowLeft size={17} />}{step === 0 ? "Cancel" : "Back"}</button>{step < 2 ? <button type="submit" className="primary-action" disabled={(step === 0 && !form.name.trim()) || (step === 1 && (!creationChoicesComplete || !subclassComplete))}>Continue <ArrowRight size={17} /></button> : <button type="submit" className="primary-action" disabled={!form.name.trim() || !abilitiesValid || !creationChoicesComplete || !subclassComplete}><UserPlus size={18} /> Create level 1{form.startingLevel > 1 ? ` & advance to ${form.startingLevel}` : ""}</button>}</footer>
      </form>
    </Modal>
  );
}
