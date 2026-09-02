import { ArrowLeft, ArrowRight, CheckCircle, DiceFive, Heart, Heartbeat, Info, Lightning, Robot } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { Modal } from "../components/Modal.jsx";
import { Stepper } from "../components/Stepper.jsx";
import { ABILITIES, CLASS_RULES, abilityModifier, averageHitDie, totalCharacterLevel } from "../domain/rules.js";
import { commitLevelUp, createLevelUpPreview } from "../domain/character.js";
import { abilityScoreChoiceForLevel } from "../domain/progression.js";
import {
  findSubclassOptionWithContent,
  subclassChoiceForLevelWithContent,
} from "../data/contentCatalog.js";
import { availableFeats, findFeat } from "../domain/feats.js";
import { choiceOptionsForCharacter, dueResolvableClassChoices, replacementOptionsForChoice } from "../domain/classChoices.js";
import { multiclassChoices } from "../domain/multiclass.js";

const steps = ["Class", "Hit points", "Choices", "Review"];
const pendingChoiceErrors = new Set([
  "SUBCLASS_REQUIRED", "COMPANION_NAME_REQUIRED", "ADVANCEMENT_CHOICE_REQUIRED",
  "ABILITY_SCORES_REQUIRED", "ABILITY_SCORE_LIMIT", "FEAT_REQUIRED", "FEAT_INELIGIBLE", "FEAT_ABILITY_REQUIRED",
  "CLASS_CHOICE_REQUIRED",
  "CLASS_CHOICE_REPLACEMENT_REQUIRED",
  "MULTICLASS_CHOICE_REQUIRED",
]);
const abilityLabels = Object.fromEntries(ABILITIES.map((ability) => [ability, ability[0].toUpperCase() + ability.slice(1)]));
const primaryAbility = { artificer: "intelligence", wizard: "intelligence", bard: "charisma", sorcerer: "charisma", warlock: "charisma", paladin: "charisma", cleric: "wisdom", druid: "wisdom", ranger: "wisdom", fighter: "strength", barbarian: "strength", monk: "dexterity", rogue: "dexterity" };

function slotSummary(slots) {
  if (!slots?.length) return "No spell slots";
  const ordinals = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];
  return slots.map((count, index) => `${count} × ${ordinals[index]}`).join(" · ");
}

export function LevelUpWizard({ character, targetLevel, activePacks = [], onClose, onCommit }) {
  const initialClass = character.classLevels[0].classId;
  const initialAbility = primaryAbility[initialClass] || "constitution";
  const [step, setStep] = useState(0);
  const [featQuery, setFeatQuery] = useState("");
  const [inspectedFeatId, setInspectedFeatId] = useState("");
  const [draft, setDraft] = useState({
    classId: initialClass,
    subclassId: "",
    companionName: "Steel Defender",
    hpMethod: "average",
    hpRoll: 1,
    advancementType: "",
    asiFirst: initialAbility,
    asiSecond: initialAbility,
    featId: "",
    featAbility: "",
    classChoiceSelections: {},
    classChoiceReplacements: {},
    multiclassChoiceSelections: {},
    note: "",
  });
  const [error, setError] = useState("");
  const targetRule = CLASS_RULES[draft.classId];
  const subclassChoice = subclassChoiceForLevelWithContent(character, draft.classId, activePacks);
  const subclassOption = findSubclassOptionWithContent(draft.classId, draft.subclassId, activePacks);
  const abilityChoice = abilityScoreChoiceForLevel(character, draft.classId);
  const dueClassChoices = dueResolvableClassChoices(character, draft.classId, draft.classChoiceSelections);
  const dueMulticlassChoices = multiclassChoices(character, draft.classId);
  const featOptions = useMemo(() => availableFeats(character), [character]);
  const filteredFeats = featOptions.filter((candidate) => [candidate.name, candidate.summary, ...(candidate.benefits || [])].join(" ").toLowerCase().includes(featQuery.trim().toLowerCase()));
  const selectedFeat = findFeat(draft.featId);
  const inspectedFeat = findFeat(inspectedFeatId) || selectedFeat;
  const preview = useMemo(() => {
    try { return createLevelUpPreview(character, draft, activePacks); }
    catch (previewError) { return { error: previewError }; }
  }, [character, draft, activePacks]);
  const currentLevel = totalCharacterLevel(character.classLevels);

  function chooseClass(classId) {
    const ability = primaryAbility[classId] || "constitution";
    setDraft((current) => ({ ...current, classId, subclassId: "", companionName: "Steel Defender", hpRoll: 1, advancementType: "", asiFirst: ability, asiSecond: ability, featId: "", featAbility: "", classChoiceSelections: {}, classChoiceReplacements: {}, multiclassChoiceSelections: {} }));
    setError("");
  }

  function chooseFeat(candidate) {
    setInspectedFeatId(candidate.id);
    if (!candidate.eligibility.eligible) return;
    setDraft((current) => ({ ...current, featId: candidate.id, featAbility: candidate.abilityChoices?.length === 1 ? candidate.abilityChoices[0] : "" }));
    setError("");
  }

  function toggleClassChoice(choice, option) {
    setDraft((current) => {
      const selected = current.classChoiceSelections[choice.id] || [];
      const next = selected.includes(option)
        ? selected.filter((entry) => entry !== option)
        : choice.count === 1 ? [option] : [...selected, option].slice(-choice.count);
      return { ...current, classChoiceSelections: { ...current.classChoiceSelections, [choice.id]: next } };
    });
    setError("");
  }

  function toggleMulticlassChoice(choice, option) {
    setDraft((current) => {
      const selected = current.multiclassChoiceSelections[choice.id] || [];
      const next = selected.includes(option) ? selected.filter((entry) => entry !== option) : choice.count === 1 ? [option] : [...selected, option].slice(-choice.count);
      return { ...current, multiclassChoiceSelections: { ...current.multiclassChoiceSelections, [choice.id]: next } };
    });
    setError("");
  }

  function toggleClassChoiceReplacement(choice, token) {
    setDraft((current) => {
      const selected = current.classChoiceReplacements[choice.id] || [];
      const count = Number(choice.replacement?.count || 1);
      const next = selected.includes(token) ? selected.filter((entry) => entry !== token) : count === 1 ? [token] : [...selected, token].slice(-count);
      return { ...current, classChoiceReplacements: { ...current.classChoiceReplacements, [choice.id]: next } };
    });
    setError("");
  }

  function next() {
    if (preview.error && !(step < 2 && pendingChoiceErrors.has(preview.error.code))) {
      setError(preview.error.message);
      return;
    }
    setError("");
    setStep((current) => Math.min(3, current + 1));
  }

  function commit() {
    try { onCommit(commitLevelUp(character, draft, activePacks)); onClose({ committed: true }); }
    catch (commitError) { setError(commitError.message); }
  }

  return (
    <Modal title={`Advance ${character.name}`} eyebrow={targetLevel ? `Creation progression · Level ${currentLevel} → ${currentLevel + 1} · Target ${targetLevel}` : `Level ${currentLevel} → ${currentLevel + 1}`} onClose={onClose} className="level-modal">
      <Stepper steps={steps} current={step} />
      <div className="wizard-body">
        {step === 0 && (
          <div className="wizard-step">
            <h3>Which class gains this level?</h3>
            <p>Continue your current path or add a class when all multiclass prerequisites are met.</p>
            <div className="class-options">
              {Object.entries(CLASS_RULES).map(([id, rule]) => {
                const current = character.classLevels.find((entry) => entry.classId === id);
                return <button key={id} className={draft.classId === id ? "selected" : ""} onClick={() => chooseClass(id)}><span>{rule.name}</span><small>{current ? `Current level ${current.level}${current.subclass ? ` · ${current.subclass}` : ""}` : "Multiclass"} · d{rule.hitDie}</small></button>;
              })}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="wizard-step">
            <h3>Choose hit point gain</h3>
            <p>Your Constitution modifier of {abilityModifier(character.abilities.constitution) >= 0 ? "+" : ""}{abilityModifier(character.abilities.constitution)} is applied automatically.</p>
            <div className="hp-choice-grid">
              <button className={draft.hpMethod === "average" ? "selected" : ""} onClick={() => setDraft({ ...draft, hpMethod: "average" })}><Heartbeat size={26} /><span>Take average</span><strong>{averageHitDie(targetRule.hitDie)} base HP</strong><small>Reliable d{targetRule.hitDie} average</small></button>
              <button className={draft.hpMethod === "roll" ? "selected" : ""} onClick={() => setDraft({ ...draft, hpMethod: "roll" })}><DiceFive size={26} /><span>Record a roll</span><strong>d{targetRule.hitDie}</strong><small>Enter the physical die result</small></button>
              <button className={draft.hpMethod === "maximum" ? "selected" : ""} onClick={() => setDraft({ ...draft, hpMethod: "maximum" })}><Heart size={26} /><span>Take maximum</span><strong>{targetRule.hitDie} base HP</strong><small>Uses the highest d{targetRule.hitDie} result</small></button>
            </div>
            {draft.hpMethod === "roll" && <label className="roll-field"><span>Die result</span><input type="number" min="1" max={targetRule.hitDie} value={draft.hpRoll} onChange={(event) => setDraft({ ...draft, hpRoll: Number(event.target.value) })} /></label>}
          </div>
        )}

        {step === 2 && (
          <div className="wizard-step">
            <h3>Resolve level choices</h3>
            <p>Every required mechanical decision is resolved here before review.</p>
            <div className="choice-checklist">
              <div><CheckCircle size={22} weight="fill" /><span><strong>Class level</strong><small>{targetRule.name} {((character.classLevels.find((entry) => entry.classId === draft.classId)?.level) || 0) + 1}</small></span></div>
              <div><CheckCircle size={22} weight="fill" /><span><strong>Hit points</strong><small>{draft.hpMethod === "average" ? `Average ${averageHitDie(targetRule.hitDie)}` : draft.hpMethod === "maximum" ? `Maximum ${targetRule.hitDie}` : `Rolled ${draft.hpRoll}`} + Constitution</small></span></div>
            </div>

            {subclassChoice ? (
              <section className="required-choice" aria-labelledby="subclass-choice-heading">
                <p className="section-kicker">Required choice</p>
                <h4 id="subclass-choice-heading">Choose {subclassChoice.label.toLowerCase()}</h4>
                <p>{subclassChoice.nextClassLevel > subclassChoice.level ? `This level repairs the missing level ${subclassChoice.level} choice before advancement.` : `This class chooses at level ${subclassChoice.level}.`}</p>
                <div className="subclass-options">
                  {subclassChoice.options.map((option) => <button key={option.id} className={draft.subclassId === option.id ? "selected" : ""} onClick={() => setDraft({ ...draft, subclassId: option.id, companionName: option.companionType ? draft.companionName || "Steel Defender" : draft.companionName })}><strong>{option.name}</strong><small>{option.source || "2014 core"}</small>{option.companionType && <span><Robot size={15} /> Adds a linked companion</span>}</button>)}
                </div>
              </section>
            ) : <div className="choice-complete"><CheckCircle size={20} weight="fill" /> No new subclass choice is due for this class level.</div>}

            {subclassOption?.companionType && <label className="companion-name-field"><span>Companion name <small>Required · editable later on the Sheet</small></span><input value={draft.companionName} maxLength={48} onChange={(event) => setDraft({ ...draft, companionName: event.target.value })} placeholder="Name your Steel Defender" /></label>}

            {dueClassChoices.map((choice) => <section className="required-choice class-choice" key={choice.id}><p className="section-kicker">{choice.parentId ? "Dependent class choice" : "Required class choice"}</p><h4>{choice.label}</h4><p>Select {choice.count} {choice.count === 1 ? "option" : "options"}. This selection is saved to the character and History.</p>{choice.replacement && <div className="subclass-options">{replacementOptionsForChoice(character, choice).map((option) => <button key={option.token} className={(draft.classChoiceReplacements[choice.id] || []).includes(option.token) ? "selected" : ""} onClick={() => toggleClassChoiceReplacement(choice, option.token)}><strong>Replace {option.label}</strong><small>Existing selection</small></button>)}</div>}<div className="subclass-options">{choiceOptionsForCharacter(character, choice, draft.classChoiceSelections).map((option) => { const selected = (draft.classChoiceSelections[choice.id] || []).includes(option); return <button key={option} className={selected ? "selected" : ""} onClick={() => toggleClassChoice(choice, option)}><strong>{option}</strong><small>{choice.kind === "expertise" ? "Double proficiency bonus" : `${choice.label} option`}</small></button>; })}</div></section>)}
            {dueMulticlassChoices.map((choice) => <section className="required-choice class-choice" key={choice.id}><p className="section-kicker">New-class proficiency</p><h4>{choice.label}</h4><p>Multiclassing grants a reduced proficiency package. Choose {choice.count} before review.</p><div className="subclass-options">{choice.options.map((option) => <button key={option} className={(draft.multiclassChoiceSelections[choice.id] || []).includes(option) ? "selected" : ""} onClick={() => toggleMulticlassChoice(choice, option)}><strong>{option}</strong><small>Multiclass proficiency</small></button>)}</div></section>)}

            {abilityChoice && (
              <section className="required-choice advancement-choice" aria-labelledby="advancement-choice-heading">
                <p className="section-kicker">Required mechanical choice</p>
                <h4 id="advancement-choice-heading">Ability Score Improvement or feat</h4>
                <p>{abilityChoice.repair ? `Resolve the missing ${targetRule.name} ${abilityChoice.classLevel} choice before advancing.` : `${targetRule.name} ${abilityChoice.classLevel} grants this choice.`}</p>
                <div className="advancement-mode-options">
                  <button className={draft.advancementType === "asi" ? "selected" : ""} onClick={() => setDraft({ ...draft, advancementType: "asi", featId: "", featAbility: "" })}><strong>Improve abilities</strong><small>+2 to one score or +1 to two scores</small></button>
                  <button className={draft.advancementType === "feat" ? "selected" : ""} onClick={() => setDraft({ ...draft, advancementType: "feat" })}><strong>Choose a feat</strong><small>Use the optional 2014 feat rule</small></button>
                </div>
                {draft.advancementType === "asi" && <div className="ability-choice-fields"><label><span>First +1</span><select value={draft.asiFirst} onChange={(event) => setDraft({ ...draft, asiFirst: event.target.value })}>{ABILITIES.map((ability) => <option key={ability} value={ability}>{abilityLabels[ability]} ({character.abilities[ability]})</option>)}</select></label><label><span>Second +1</span><select value={draft.asiSecond} onChange={(event) => setDraft({ ...draft, asiSecond: event.target.value })}>{ABILITIES.map((ability) => <option key={ability} value={ability}>{abilityLabels[ability]} ({character.abilities[ability]})</option>)}</select></label></div>}
                {draft.advancementType === "feat" && <div className="feat-picker"><label className="feat-search"><span>Find a feat</span><input value={featQuery} onChange={(event) => setFeatQuery(event.target.value)} placeholder="Search names or mechanics" /></label><div className="feat-options" role="list" aria-label="Available 2014 feats">{filteredFeats.map((candidate) => <button role="listitem" key={candidate.id} className={`${draft.featId === candidate.id ? "selected" : ""} ${!candidate.eligibility.eligible ? "unavailable" : ""}`} onClick={() => chooseFeat(candidate)} aria-label={`${candidate.name}. ${candidate.summary}. ${candidate.eligibility.eligible ? "Eligible" : candidate.eligibility.reasons.join(", ")}`}><strong>{candidate.name}</strong><small>{candidate.prerequisite || "No prerequisite"}{candidate.eligibility.reasons.length ? ` · ${candidate.eligibility.reasons.join(", ")}` : candidate.requiresReview ? " · confirm proficiency" : ""}</small><span>{candidate.summary}</span></button>)}</div>{inspectedFeat && <section className="feat-detail" aria-live="polite"><header><Info size={17} /><div><small>{inspectedFeat.source}</small><h5>{inspectedFeat.name}</h5></div>{!featOptions.find((entry) => entry.id === inspectedFeat.id)?.eligibility.eligible && <b>Unavailable</b>}</header><p>{inspectedFeat.summary}</p><ul>{inspectedFeat.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul>{inspectedFeat.requiresReview && <div className="rules-notice">This choice depends on an armor proficiency the app cannot yet verify automatically. Confirm it on your sheet before committing.</div>}</section>}{selectedFeat?.abilityChoices?.length > 1 && <label className="feat-ability-field"><span>{selectedFeat.name} ability increase</span><select value={draft.featAbility} onChange={(event) => setDraft({ ...draft, featAbility: event.target.value })}><option value="">Choose an ability</option>{selectedFeat.abilityChoices.map((ability) => <option key={ability} value={ability}>{abilityLabels[ability]} ({character.abilities[ability]})</option>)}</select></label>}</div>}
              </section>
            )}

            {!abilityChoice && <div className="choice-complete"><CheckCircle size={20} weight="fill" /> No Ability Score Improvement or feat is due at this class level.</div>}
            <label className="level-note-field"><span>Story note <small>Optional narrative context only</small></span><textarea value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="Record a story event, training scene, or other narrative note…" /></label>
          </div>
        )}

        {step === 3 && (
          <div className="wizard-step">
            <h3>Review before committing</h3>
            <p>Nothing changes until you confirm this transaction.</p>
            {preview.error ? <div className="error-banner">{preview.error.message}</div> : <>
              <div className="review-grid">
                <div><small>Total level</small><strong>{currentLevel} → {currentLevel + 1}</strong></div>
                <div><small>Class</small><strong>{targetRule.name} {((character.classLevels.find((entry) => entry.classId === draft.classId)?.level) || 0) + 1}</strong></div>
                {subclassOption && <div><small>{subclassChoice.label}</small><strong>{subclassOption.name}</strong></div>}
                {subclassOption?.companionType && <div><small>Linked companion</small><strong>{draft.companionName}</strong></div>}
                {abilityChoice && <div><small>Level choice</small><strong>{preview.choiceSummary}</strong></div>}
                {preview.changes.classChoicesAdded?.length > 0 && <div><small>Class choices</small><strong>{preview.changes.classChoicesAdded.join(" · ")}</strong></div>}
                <div><small>Maximum HP</small><strong>{character.maxHp} → {preview.maxHp}</strong></div>
                <div><small>Spell slots after level</small><strong>{slotSummary(preview.spellSlots)}</strong><span className="review-help">These are the character's castable slots; multiclass casters share this pool.</span></div>
              </div>
              {(preview.changes.featuresAdded.length > 0 || preview.changes.spellsAdded.length > 0) && <div className="change-preview"><h4>Automatically added to the sheet</h4>{preview.changes.featuresAdded.length > 0 && <p><strong>Features</strong>{preview.changes.featuresAdded.join(" · ")}</p>}{preview.changes.spellsAdded.length > 0 && <p><strong>Always-prepared spells</strong>{preview.changes.spellsAdded.join(" · ")}</p>}</div>}
            </>}
          </div>
        )}
        {error && <div className="error-banner">{error}</div>}
      </div>
      <footer className="modal-actions">
        <button className="secondary-action" onClick={() => step === 0 ? onClose() : setStep(step - 1)}>{step > 0 && <ArrowLeft size={17} />}{step === 0 ? "Cancel" : "Back"}</button>
        {step < 3 ? <button className="primary-action" onClick={next}>Continue <ArrowRight size={17} /></button> : <button className="primary-action" onClick={commit} disabled={Boolean(preview.error)}><Lightning size={18} /> Commit level {currentLevel + 1}{targetLevel && currentLevel + 1 < targetLevel ? " & continue" : ""}</button>}
      </footer>
    </Modal>
  );
}
