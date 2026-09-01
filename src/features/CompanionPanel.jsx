import { CaretDown, CaretUp, Heartbeat, Minus, Plus, Robot, ShieldCheck, Sword, Trash, Wrench } from "@phosphor-icons/react";
import { deriveCompanionStats, patchCompanion } from "../domain/companions.js";
import { abilityModifier, formatModifier } from "../domain/rules.js";
import { appendHistoryEvent } from "../domain/history.js";
import { patchMechanicalCompanion } from "../domain/mutations.js";

const abilityLabels = { strength: "STR", dexterity: "DEX", constitution: "CON", intelligence: "INT", wisdom: "WIS", charisma: "CHA" };

function CompanionCounter({ value, min = 0, max, label, onChange }) {
  return <div className="counter companion-counter" aria-label={label}><button onClick={() => onChange(Math.max(min, value - 1))} aria-label={`Decrease ${label}`}><Minus size={13} /></button><strong>{value}</strong><button onClick={() => onChange(Math.min(max, value + 1))} aria-label={`Increase ${label}`}><Plus size={13} /></button></div>;
}

function StaticCompanionDetails({ stats }) {
  return <>
    <p><strong>Saves</strong> {stats.savesText || "Use source stat block"}</p>
    <p><strong>Skills</strong> {stats.skillsText || "Use source stat block"}</p>
    <p><strong>Senses</strong> {stats.sensesText || "Use source stat block"}</p>
    <p><strong>Defenses</strong> {stats.defensesText || "Use source stat block"}</p>
  </>;
}

export function CompanionPanel({ character, updateCharacter }) {
  if (!(character.companions || []).length) return null;

  function update(companionId, patch) {
    const mechanical = Object.keys(patch).some((key) => ["currentHp", "tempHp", "repairUsesRemaining", "present", "conditions"].includes(key));
    updateCharacter(mechanical ? patchMechanicalCompanion(character, companionId, patch) : patchCompanion(character, companionId, patch));
  }

  function remove(companion) {
    const next = { ...character, companions: character.companions.filter((entry) => entry.id !== companion.id) };
    updateCharacter(appendHistoryEvent(next, { type: "companion-removed", title: `Removed ${companion.name}`, detail: companion.source, changes: { companionsRemoved: [companion.name] } }));
  }

  return (
    <section className="companion-section" aria-labelledby="companions-heading">
      <header className="companion-section-heading">
        <div><p className="eyebrow">Linked game pieces</p><h2 id="companions-heading">Companions</h2></div>
        <span>{character.companions.length} linked</span>
      </header>
      <div className="companion-list">
        {character.companions.map((companion) => {
          const stats = deriveCompanionStats(character, companion);
          const isSteelDefender = companion.type === "steel-defender";
          const currentHp = Math.min(Number(companion.currentHp ?? stats.maxHp), stats.maxHp);
          const repairUses = Math.min(3, Number(companion.repairUsesRemaining ?? 3));
          const expanded = !companion.collapsed;
          return (
            <article key={companion.id} className={`companion-card glass-panel material-primary ${companion.present ? "present" : "absent"}`}>
              <header className="companion-card-header">
                <div className="companion-identity">
                  <div className="companion-mark"><Robot size={26} /></div>
                  <div>
                    <label><span className="sr-only">Companion name</span><input aria-label="Companion name" value={companion.name} maxLength={48} onChange={(event) => update(companion.id, { name: event.target.value })} /></label>
                    <p>{companion.source} · {stats.size || "Medium"} {stats.creatureType || (isSteelDefender ? "construct" : companion.type)}</p>
                  </div>
                </div>
                <div className="companion-controls">
                  <button className={`presence-toggle ${companion.present ? "active" : ""}`} aria-pressed={companion.present} onClick={() => update(companion.id, { present: !companion.present })}>{companion.present ? "Present" : "Not present"}</button>
                  {companion.dismissible && <button className="icon-button" onClick={() => remove(companion)} aria-label={`Remove ${companion.name} from the sheet`}><Trash size={18} /></button>}
                  <button className="icon-button" aria-expanded={expanded} aria-controls={`companion-${companion.id}-details`} aria-label={`${expanded ? "Collapse" : "Expand"} ${companion.name || "companion"} stat block`} onClick={() => update(companion.id, { collapsed: expanded })}>{expanded ? <CaretUp size={19} /> : <CaretDown size={19} />}</button>
                </div>
              </header>

              {expanded && (
                <div id={`companion-${companion.id}-details`} className="companion-details">
                  <div className="companion-vitals">
                    <div><ShieldCheck size={19} /><small>Armor Class</small><strong>{stats.armorClass}</strong></div>
                    <div><Heartbeat size={19} /><small>Hit Points</small><CompanionCounter value={currentHp} max={stats.maxHp} label={`${companion.name} hit points`} onChange={(currentHpValue) => update(companion.id, { currentHp: currentHpValue })} /><span>/ {stats.maxHp}</span></div>
                    <div><Robot size={19} /><small>Speed</small><strong>{stats.speed} ft.</strong></div>
                    {isSteelDefender ? <div><Wrench size={19} /><small>Repair uses</small><CompanionCounter value={repairUses} max={3} label={`${companion.name} repair uses`} onChange={(repairUsesRemaining) => update(companion.id, { repairUsesRemaining })} /><span>/ 3</span></div> : <div><Robot size={19} /><small>Duration</small><strong>{companion.duration || "Persistent"}</strong></div>}
                  </div>

                  <div className="companion-ability-grid">
                    {Object.entries(stats.abilities || {}).map(([ability, score]) => <div key={ability}><small>{abilityLabels[ability]}</small><strong>{score}</strong><span>{formatModifier(abilityModifier(score))}</span></div>)}
                  </div>

                  <div className="companion-stat-columns">
                    <div>
                      <h3>Defenses & senses</h3>
                      {isSteelDefender ? <>
                        <p><strong>Saves</strong> Dex {formatModifier(stats.savingThrows.dexterity)}, Con {formatModifier(stats.savingThrows.constitution)}</p>
                        <p><strong>Skills</strong> Athletics {formatModifier(stats.skills.athletics)}, Perception {formatModifier(stats.skills.perception)}</p>
                        <p><strong>Senses</strong> Darkvision 60 ft. · Passive Perception {stats.passivePerception}</p>
                        <p><strong>Immunities</strong> Poison damage · Charmed, exhaustion, poisoned</p>
                      </> : <StaticCompanionDetails stats={stats} />}
                    </div>
                    <div>
                      <h3>Actions & reactions</h3>
                      {isSteelDefender ? <>
                        <p><Sword size={15} /><strong>Force-Empowered Rend</strong> {stats.rendAttack} to hit · {stats.rendDamage}</p>
                        <p><Wrench size={15} /><strong>Repair (3/day)</strong> Restores {stats.repairHealing} hit points to itself or a nearby construct/object.</p>
                        <p><ShieldCheck size={15} /><strong>Deflect Attack</strong> Reaction protects another nearby creature.</p>
                        <p><strong>Initiative</strong> Acts immediately after {character.name}; other actions require its Battle Smith's bonus action.</p>
                      </> : (stats.actions || [{ name: "Source actions", detail: "Use the linked creature's source stat block." }]).map((action) => <p key={action.name}><Sword size={15} /><strong>{action.name}</strong> {action.detail}</p>)}
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
