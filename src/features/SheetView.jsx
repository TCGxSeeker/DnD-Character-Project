import {
  Brain, ChatCircle, Eye, Feather, Footprints, Heartbeat, Lightning, Minus,
  Plus, ShieldCheck, Sparkle, Sword, Target, Tree, Wind,
  Camera,
  Campfire,
} from "@phosphor-icons/react";
import { useState } from "react";
import { abilityModifier, CLASS_RULES, formatModifier, proficiencyBonus, totalCharacterLevel, xpToNextLevel } from "../domain/rules.js";
import { calculateCharacterGraph } from "../domain/calculationGraph.js";
import { CompanionPanel } from "./CompanionPanel.jsx";
import { PlayerSkillsPanel } from "./PlayerSkillsPanel.jsx";
import { SpellCompanionLaunchers } from "./SpellCompanionLaunchers.jsx";
import { PortraitEditor } from "./PortraitEditor.jsx";
import { RestWizard } from "./RestWizard.jsx";
import { PlayerAttacksPanel } from "./PlayerAttacksPanel.jsx";
import { Modal } from "../components/Modal.jsx";
import { setCurrentHitPoints, setExperience, setHitDieCurrent, setInspiration, setPactSlotCurrent, setResourceCurrent } from "../domain/mutations.js";

const abilityMeta = {
  strength: { label: "STR", icon: Sword },
  dexterity: { label: "DEX", icon: Feather },
  constitution: { label: "CON", icon: Heartbeat },
  intelligence: { label: "INT", icon: Brain },
  wisdom: { label: "WIS", icon: Eye },
  charisma: { label: "CHA", icon: ChatCircle },
};

function Counter({ value, min = 0, max = 999, onChange, label }) {
  return (
    <div className="counter" aria-label={label}>
      <button onClick={() => onChange(Math.max(min, value - 1))} aria-label={`Decrease ${label}`}><Minus size={14} /></button>
      <strong>{value}</strong>
      <button onClick={() => onChange(Math.min(max, value + 1))} aria-label={`Increase ${label}`}><Plus size={14} /></button>
    </div>
  );
}

function ResourceCell({ icon: Icon, label, value, max, detail, onChange }) {
  return (
    <div className="resource-cell">
      <div className="resource-label"><Icon size={18} /><span>{label}</span></div>
      {onChange ? <Counter value={value} max={max} onChange={onChange} label={label} /> : <strong className="resource-value">{value}{max !== "" && max != null && <small> / {max}</small>}</strong>}
      <small>{detail}</small>
    </div>
  );
}

function CalculationInspector({ calculation, onClose }) {
  const contributions = calculation.node?.sources || [];
  return (
    <Modal title={calculation.label} eyebrow="Calculation details" className="calculation-modal" onClose={onClose}>
      <div className="calculation-body">
        <div className="calculation-result">
          <span>Current value</span>
          <strong>{calculation.displayValue}</strong>
          <small>{calculation.node?.formula || "Stored character value"}</small>
        </div>
        <section aria-labelledby="calculation-sources-heading">
          <div className="calculation-heading">
            <div><p className="section-kicker">Applied effects</p><h3 id="calculation-sources-heading">Source trail</h3></div>
            <span>{contributions.length} {contributions.length === 1 ? "effect" : "effects"}</span>
          </div>
          {contributions.length ? (
            <ol className="calculation-sources">
              {contributions.map((contribution, index) => (
                <li key={`${contribution.source}-${contribution.target}-${index}`}>
                  <span>{index + 1}</span>
                  <div><strong>{contribution.source || "Custom effect"}</strong><small>{contribution.operation} · {contribution.target}</small></div>
                  {contribution.value != null && <b>{typeof contribution.value === "number" && contribution.value > 0 ? "+" : ""}{String(contribution.value)}</b>}
                </li>
              ))}
            </ol>
          ) : <p className="calculation-empty">No typed effect modifies this value. The displayed result comes directly from the base formula above.</p>}
          {!!calculation.reasons?.length && <div className="calculation-warning"><strong>Roll restriction</strong>{calculation.reasons.map((reason) => <span key={reason}>{reason}</span>)}</div>}
        </section>
      </div>
      <footer className="modal-actions"><button className="primary-action" onClick={onClose}>Done</button></footer>
    </Modal>
  );
}

function CoreStat({ icon: Icon, label, value, node, reasons, onInspect }) {
  return (
    <button className={reasons?.length ? "disadvantaged" : ""} onClick={() => onInspect({ label, displayValue: value, node, reasons })} aria-label={`${label}: ${value}. Show calculation details`}>
      <Icon size={20} /><small>{label}</small><strong>{value}</strong><span className="calculation-affordance">Explain</span>
    </button>
  );
}

export function SheetView({ character, updateCharacter, avatar, avatarMap, onLevelUp }) {
  const [portraitOpen, setPortraitOpen] = useState(false);
  const [restOpen, setRestOpen] = useState(false);
  const [calculation, setCalculation] = useState(null);
  const level = totalCharacterLevel(character.classLevels);
  const graph = calculateCharacterGraph(character);
  const usedSlots = character.usedSpellSlots?.reduce((sum, value) => sum + value, 0) || 0;
  const totalSlots = character.spellSlots?.reduce((sum, value) => sum + value, 0) || 0;
  const availableSlots = totalSlots - usedSlots;
  const primaryClass = character.classLevels[0]?.classId;
  const castingAbility = ({ artificer: "intelligence", wizard: "intelligence", bard: "charisma", sorcerer: "charisma", warlock: "charisma", paladin: "charisma", cleric: "wisdom", druid: "wisdom", ranger: "wisdom" })[primaryClass] || "wisdom";
  const spellcastingModifier = abilityModifier(character.abilities[castingAbility]);
  const spellDc = 8 + proficiencyBonus(level) + spellcastingModifier;
  const xpRemaining = xpToNextLevel(character.experience);
  const armorClass = graph.armorClass.value;
  const speed = graph.speed.value;
  const pactSlots = character.pactSlots;
  const armorRestrictions = graph.restrictions.armor;

  const updateResource = (id, value) => updateCharacter(setResourceCurrent(character, id, value));
  const hitDicePools = character.hitDicePools || { [`d${CLASS_RULES[primaryClass]?.hitDie || 8}`]: { current: character.hitDiceRemaining, max: level } };
  const updateHitDice = (die, current) => updateCharacter(setHitDieCurrent({ ...character, hitDicePools }, die, current));

  return (
    <div className="sheet-view">
      <section className="character-hero glass-panel material-primary">
        <button className="hero-portrait-button" onClick={() => setPortraitOpen(true)} aria-label={`Change ${character.name}'s portrait`}><img className="hero-portrait" src={avatar} alt={`${character.name} portrait`} /><span><Camera size={18} /> Change portrait</span></button>
        <div className="hero-copy">
          <p className="eyebrow">Active character</p>
          <h1>{character.name}</h1>
          <p className="hero-class">Level {level} · {character.classLevels.map((entry) => `${entry.subclass || ""} ${CLASS_RULES[entry.classId]?.name || entry.classId}`).join(" / ")}</p>
          <p className="hero-meta">{character.ancestry} <span>·</span> {character.background}</p>
        </div>
        <div className="hero-summary">
          <div><small>Proficiency</small><strong>{formatModifier(proficiencyBonus(level))}</strong><span>Bonus</span></div>
          <button className={`inspiration-orb ${character.inspiration ? "active" : ""}`} onClick={() => updateCharacter(setInspiration(character, !character.inspiration))} aria-pressed={character.inspiration}>
            <Sparkle size={22} weight={character.inspiration ? "fill" : "regular"} />
            <span>Inspiration</span>
          </button>
          <div><small>{character.advancement === "milestone" ? "Advancement" : "Experience"}</small>{character.advancement === "milestone" ? <><strong className="mode-value">Milestone</strong><span>Story based</span></> : <><input className="xp-input" aria-label="Experience points" type="number" min="0" max="355000" step="50" value={character.experience} onChange={(event) => updateCharacter(setExperience(character, event.target.value))} /><span>{xpRemaining ? `${xpRemaining.toLocaleString()} to next level` : "Maximum level"}</span></>}</div>
        </div>
      </section>

      <section className="resource-strip glass-panel material-primary">
        <div className="resource-cell hp-cell">
          <div className="resource-label"><Heartbeat size={18} /><span>Hit points</span></div>
          <div className="hp-controls"><Counter value={character.hp} max={character.maxHp} onChange={(hp) => updateCharacter(setCurrentHitPoints(character, hp))} label="hit points" /><span>/ {character.maxHp}</span></div>
          <small>Temporary HP {character.tempHp || "—"}</small>
        </div>
        {Object.entries(hitDicePools).map(([die, pool]) => <ResourceCell key={die} icon={Target} label={`Hit dice · ${die}`} value={pool.current} max={pool.max} detail="Class-level pool" onChange={(current) => updateHitDice(die, current)} />)}
        {totalSlots > 0 && <ResourceCell icon={Lightning} label="Spell slots" value={availableSlots} max={totalSlots} detail={`${totalSlots} total slots`} />}
        {pactSlots && <ResourceCell icon={Lightning} label={`Pact slots · ${pactSlots.level}${pactSlots.level === 1 ? "st" : pactSlots.level === 2 ? "nd" : pactSlots.level === 3 ? "rd" : "th"}`} value={pactSlots.current} max={pactSlots.max} detail={pactSlots.reset} onChange={(current) => updateCharacter(setPactSlotCurrent(character, current))} />}
        {(character.resources || []).map((resource, index) => <ResourceCell key={resource.id} icon={index % 2 === 0 ? Tree : Wind} label={resource.name} value={resource.current} max={resource.max} detail={`${resource.detail ? `${resource.detail} · ` : ""}${resource.reset}`} onChange={(value) => updateResource(resource.id, value)} />)}
        <ResourceCell icon={Sparkle} label="Spellcasting" value={armorRestrictions.spellcastingAllowed ? `DC ${spellDc}` : "Blocked"} max="" detail={armorRestrictions.spellcastingAllowed ? `Attack ${formatModifier(proficiencyBonus(level) + spellcastingModifier)}` : armorRestrictions.reason} />
      </section>

      <section className="stat-workspace glass-panel material-primary">
        <div className="ability-section">
          <p className="section-kicker">Ability scores</p>
          <div className="ability-grid">
            {Object.entries(character.abilities).map(([key, score]) => {
              const Icon = abilityMeta[key].icon;
              const saveProficient = graph.saves[key].proficient;
              const saveBonus = graph.saves[key].value;
              return <div className={key === castingAbility ? "primary-ability" : ""} key={key}>
                <Icon size={20} />
                <small>{abilityMeta[key].label}</small>
                <strong>{score}</strong>
                <span className="ability-mod">{formatModifier(abilityModifier(score))}</span>
                <span className={`save-bonus ${saveProficient ? "proficient" : ""} ${graph.saves[key].disadvantageReasons.length ? "disadvantaged" : ""}`} title={`${abilityMeta[key].label} saving throw${saveProficient ? ", proficient" : ""}${graph.saves[key].disadvantageReasons.length ? `. Disadvantage: ${graph.saves[key].disadvantageReasons.join("; ")}` : ""}`}>
                  <ShieldCheck size={11} weight={saveProficient ? "fill" : "regular"} /> Save {formatModifier(saveBonus)}
                </span>
              </div>;
            })}
          </div>
        </div>
        <div className="core-section">
          <p className="section-kicker">Core stats</p>
          <div className="core-grid">
            <CoreStat icon={ShieldCheck} label="Armor Class" value={armorClass} node={graph.armorClass} onInspect={setCalculation} />
            <CoreStat icon={Footprints} label="Initiative" value={formatModifier(graph.initiative.value)} node={graph.initiative} reasons={graph.initiative.disadvantageReasons} onInspect={setCalculation} />
            <CoreStat icon={Wind} label="Speed" value={`${speed} ft.`} node={graph.speed} onInspect={setCalculation} />
            <CoreStat icon={Eye} label="Passive Perception" value={graph.passivePerception.value} node={graph.passivePerception} onInspect={setCalculation} />
            <CoreStat icon={Sparkle} label="Darkvision" value={graph.senses.darkvision.value ? `${graph.senses.darkvision.value} ft.` : "None"} node={graph.senses.darkvision} onInspect={setCalculation} />
            <div title={graph.languages.join(", ")}><ChatCircle size={20} /><small>Languages</small><strong>{graph.languages.length > 2 ? `${graph.languages.slice(0, 2).join(", ")} +${graph.languages.length - 2}` : graph.languages.join(", ")}</strong></div>
          </div>
        </div>
        <PlayerSkillsPanel character={character} updateCharacter={updateCharacter} calculatedRows={Object.values(graph.skills)} />
      </section>

      <PlayerAttacksPanel key={character.id} character={character} graph={graph} />

      <SpellCompanionLaunchers character={character} updateCharacter={updateCharacter} />
      <CompanionPanel character={character} updateCharacter={updateCharacter} />

      <section className="level-cta glass-panel material-primary">
        <div className="level-emblem"><Tree size={34} /></div>
        <div><p className="eyebrow">Next level</p><h2>Level {Math.min(20, level + 1)}</h2><span>{character.advancement === "milestone" ? "Milestone ready" : "Review experience and choices"}</span></div>
        <div className="pending-copy"><strong>Guided choices</strong><span>Choose a class, resolve HP, review the change, then commit.</span></div>
        <div className="sheet-actions"><button className="secondary-action" onClick={() => setRestOpen(true)}><Campfire size={20} /> Rest</button><button className="primary-action" onClick={onLevelUp} disabled={level >= 20}><Lightning size={22} /> Level up</button></div>
      </section>
      {portraitOpen && <PortraitEditor character={character} avatarMap={avatarMap} fallback={avatar} onClose={() => setPortraitOpen(false)} onSave={(patch) => { updateCharacter({ ...character, ...patch }); setPortraitOpen(false); }} />}
      {restOpen && <RestWizard character={character} onClose={() => setRestOpen(false)} onCommit={(next) => { updateCharacter(next); setRestOpen(false); }} />}
      {calculation && <CalculationInspector calculation={calculation} onClose={() => setCalculation(null)} />}
    </div>
  );
}
