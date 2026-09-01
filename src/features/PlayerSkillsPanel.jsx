import { Check, PencilSimple, ShieldCheck, WarningCircle, X } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { characterSkillRows, setSkillProficiencies } from "../domain/skills.js";
import { formatModifier, proficiencyBonus, totalCharacterLevel } from "../domain/rules.js";

const abilityLabels = { strength: "STR", dexterity: "DEX", constitution: "CON", intelligence: "INT", wisdom: "WIS", charisma: "CHA" };

export function PlayerSkillsPanel({ character, updateCharacter, calculatedRows }) {
  const [editing, setEditing] = useState(false);
  const [draftSkills, setDraftSkills] = useState(character.skills || []);
  const rows = useMemo(() => calculatedRows || characterSkillRows(character), [calculatedRows, character]);
  const selected = new Set(draftSkills.map((name) => name.toLowerCase()));
  const proficiency = proficiencyBonus(totalCharacterLevel(character.classLevels));
  const proficientCount = rows.filter((row) => row.proficiency > 0).length;
  const visibleRows = editing ? rows : rows.filter((row) => row.bonus > 0);

  useEffect(() => {
    setEditing(false);
    setDraftSkills(character.skills || []);
  }, [character.id]);

  function beginEditing() {
    setDraftSkills(character.skills || []);
    setEditing(true);
  }

  function toggleSkill(name) {
    const lower = name.toLowerCase();
    setDraftSkills((current) => current.some((entry) => entry.toLowerCase() === lower)
      ? current.filter((entry) => entry.toLowerCase() !== lower)
      : [...current, name]);
  }

  function cancelEditing() {
    setDraftSkills(character.skills || []);
    setEditing(false);
  }

  function saveSkills() {
    updateCharacter(setSkillProficiencies(character, draftSkills));
    setEditing(false);
  }

  return (
    <section className={`player-skills ${editing ? "editing" : "compact"}`} aria-labelledby="player-skills-heading">
      <header className="player-skills-heading">
        <div><p className="eyebrow">Checks & proficiencies</p><h2 id="player-skills-heading">Skills</h2><span>{proficientCount} proficient · proficiency bonus {formatModifier(proficiency)}</span></div>
        {!editing ? <button className="secondary-action skill-edit-action" onClick={beginEditing}><PencilSimple size={16} /> Edit proficiencies</button> : <div className="skill-edit-actions"><button className="secondary-action" onClick={cancelEditing}><X size={16} /> Cancel</button><button className="primary-action" onClick={saveSkills}><Check size={16} /> Save skills</button></div>}
      </header>
      <div className="player-skill-grid">
        {visibleRows.map((skill) => {
          const isSelected = editing ? selected.has(skill.name.toLowerCase()) : skill.proficiency > 0;
          const disadvantage = skill.disadvantageReasons || [];
          const label = `${skill.name}: ${formatModifier(skill.bonus)} using ${abilityLabels[skill.ability]}${skill.proficiency === 2 ? ", expertise" : skill.proficiency === 1 ? ", proficient" : ""}${disadvantage.length ? `. Disadvantage: ${disadvantage.join("; ")}` : ""}`;
          return editing ? <button key={skill.id} className={isSelected ? "proficient" : ""} aria-pressed={isSelected} aria-label={`${isSelected ? "Remove" : "Add"} proficiency in ${skill.name}`} onClick={() => toggleSkill(skill.name)}><span className="skill-proficiency-mark">{isSelected ? <Check size={13} weight="bold" /> : null}</span><strong>{skill.name}</strong><small>{abilityLabels[skill.ability]}</small><b>{formatModifier(skill.bonus + (isSelected && skill.proficiency === 0 ? proficiency : !isSelected && skill.proficiency > 0 ? -proficiency * skill.proficiency : 0))}</b></button> : <div key={skill.id} className={`${isSelected ? "proficient " : ""}${disadvantage.length ? "disadvantaged" : ""}`} title={label}><span className="skill-proficiency-mark">{skill.proficiency === 2 ? "E" : skill.proficiency === 1 ? <ShieldCheck size={13} weight="fill" /> : null}</span><strong>{skill.name}</strong><small>{abilityLabels[skill.ability]}</small><b>{formatModifier(skill.bonus)}</b>{disadvantage.length ? <WarningCircle className="roll-warning-icon" size={13} weight="fill" /> : null}</div>;
        })}
      </div>
      {!editing && visibleRows.length === 0 && <p className="skill-empty-note">No positive skill bonuses yet. Use Edit proficiencies to configure skills.</p>}
      {editing && <p className="skill-edit-note">Select the proficiencies granted by class, ancestry, background, or training. Save applies them to this character; Cancel discards the draft.</p>}
    </section>
  );
}
