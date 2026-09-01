import { useState } from "react";
import { CaretDown, ShieldCheck, Sword, Target, WarningCircle } from "@phosphor-icons/react";
import { evaluateAttackContext2014 } from "../domain/attackContext2014.js";

const signed = (value) => `${value >= 0 ? "+" : "−"}${Math.abs(value)}`;

function attackDistance(attack) {
  if (attack.range) return `${attack.range.normal}/${attack.range.long} ft.`;
  if (attack.reach) return `${attack.reach} ft. reach`;
  return "5 ft. reach";
}

const initialContext = (attack) => ({ distance: attack.range ? Math.min(30, attack.range.normal) : attack.reach || 5, cover: "none", hostileWithin5: false, attackerCanSeeTarget: true, targetCanSeeAttacker: true, targetProne: false, attackerMounted: false, targetSize: "medium", targetFormless: false });

export function PlayerAttacksPanel({ character, graph }) {
  const attacks = graph.attacks.attacks;
  const reactions = graph.attacks.reactions || [];
  const [expandedAttack, setExpandedAttack] = useState("");
  const [contexts, setContexts] = useState({});
  const patchContext = (attack, patch) => setContexts((current) => ({ ...current, [attack.id]: { ...(current[attack.id] || initialContext(attack)), ...patch } }));
  return <section className="player-attacks glass-panel material-primary" aria-labelledby="player-attacks-heading">
    <header>
      <div><p className="section-kicker">Combat actions</p><h2 id="player-attacks-heading">Attacks</h2><span>{graph.attacks.attacksPerAction} attack{graph.attacks.attacksPerAction === 1 ? "" : "s"} per Attack action</span></div>
      <Target size={26} />
    </header>
    {attacks.length ? <div className="attack-card-grid">{attacks.map((attack) => { const context = contexts[attack.id] || initialContext(attack); const result = evaluateAttackContext2014(character, attack, context); const expanded = expandedAttack === attack.id; return <article key={attack.id} className={attack.available ? "" : "unavailable"}>
      <header><Sword size={18} /><div><strong>{attack.name}</strong><span>{attack.actionType} · {attack.use.wieldMode.replace("-", " ")}{attack.use.role === "offhand" ? " · off hand" : ""}</span></div>{!attack.available && <WarningCircle size={18} />}</header>
      <div className="attack-numbers"><div><small>To hit</small><strong>{signed(attack.attackBonus)}</strong></div><div><small>Damage</small><strong>{attack.damage} {attack.damageType}</strong></div><div><small>Range</small><strong>{attackDistance(attack)}</strong></div><div><small>Per action</small><strong>{attack.maximumAttacks}</strong></div></div>
      {attack.ammunition.required && <p>{attack.ammunition.available} {attack.ammunition.ammunitionType}{attack.ammunition.available === 1 ? "" : "s"} ready</p>}
      {attack.disadvantageReasons.map((reason) => <p className="attack-warning" key={reason}><WarningCircle size={13} /> Disadvantage: {reason}</p>)}
      {attack.rules.map((rule) => <p className="attack-rule" key={rule}>{rule}</p>)}
      <button type="button" className="target-check-toggle" aria-expanded={expanded} onClick={() => setExpandedAttack(expanded ? "" : attack.id)}><Target size={14} /> Target check <CaretDown size={13} /></button>
      {expanded && <div className="target-context-panel">
        <div className="target-context-fields">
          <label><span>Distance</span><span className="distance-input"><input type="number" min="0" value={context.distance ?? ""} onChange={(event) => patchContext(attack, { distance: event.target.value })} /> ft.</span></label>
          <label><span>Cover</span><select value={context.cover} onChange={(event) => patchContext(attack, { cover: event.target.value })}><option value="none">None</option><option value="half">Half</option><option value="three-quarters">Three-quarters</option><option value="total">Total</option></select></label>
          <label><span>Visibility</span><select value={`${context.attackerCanSeeTarget ? "seen" : "unseen"}:${context.targetCanSeeAttacker ? "seen" : "unseen"}`} onChange={(event) => { const [target, attacker] = event.target.value.split(":"); patchContext(attack, { attackerCanSeeTarget: target === "seen", targetCanSeeAttacker: attacker === "seen" }); }}><option value="seen:seen">Both visible</option><option value="unseen:seen">Target unseen</option><option value="seen:unseen">Attacker unseen</option><option value="unseen:unseen">Both unseen</option></select></label>
          {attack.special?.id === "net" && <label><span>Target size</span><select value={context.targetSize} onChange={(event) => patchContext(attack, { targetSize: event.target.value })}>{["tiny", "small", "medium", "large", "huge", "gargantuan"].map((size) => <option value={size} key={size}>{size[0].toUpperCase() + size.slice(1)}</option>)}</select></label>}
        </div>
        <div className="target-context-toggles"><label><input type="checkbox" checked={context.hostileWithin5} onChange={(event) => patchContext(attack, { hostileWithin5: event.target.checked })} /> Hostile within 5 ft.</label><label><input type="checkbox" checked={context.targetProne} onChange={(event) => patchContext(attack, { targetProne: event.target.checked })} /> Target prone</label>{attack.special?.id === "lance" && <label><input type="checkbox" checked={context.attackerMounted} onChange={(event) => patchContext(attack, { attackerMounted: event.target.checked })} /> Attacker mounted</label>}{attack.special?.id === "net" && <label><input type="checkbox" checked={context.targetFormless} onChange={(event) => patchContext(attack, { targetFormless: event.target.checked })} /> Target formless</label>}</div>
        <div className={`target-context-result ${result.canAttack ? result.rollState : "blocked"}`}><strong>{result.canAttack ? result.rollState : "Cannot attack"}</strong><span>{result.rangeBand.replaceAll("-", " ")}{result.coverArmorClassBonus ? ` · target +${result.coverArmorClassBonus} AC/Dex saves` : ""}</span></div>
        {[...result.unavailableReasons, ...result.advantageReasons.map((reason) => `Advantage: ${reason}`), ...result.disadvantageReasons.map((reason) => `Disadvantage: ${reason}`), ...result.ignoredRules].map((reason) => <p className="target-context-reason" key={reason}>{reason}</p>)}
        {result.specialResolution?.id === "net-restrain" && <p className="target-context-reason">{result.specialResolution.status === "applies" ? "On hit: restrained · escape action DC 10 Strength · net AC 10, destroyed by 5 slashing damage" : result.specialResolution.reason || "Choose a target size to resolve the net's effect."}</p>}
      </div>}
    </article>; })}</div> : <p className="empty-copy">Equip a weapon in Inventory to place its calculated attack here.</p>}
    {reactions.length > 0 && <div className="attack-reactions">{reactions.map((reaction) => <article key={reaction.id}><ShieldCheck size={18} /><div><strong>{reaction.name}</strong><span>{reaction.detail}</span></div></article>)}</div>}
  </section>;
}
