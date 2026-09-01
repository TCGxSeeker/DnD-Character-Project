import { ArrowsClockwise, Campfire, DiceFive, Minus, MoonStars, MusicNotes, Plus, X } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { abilityModifier, formatModifier } from "../domain/rules.js";
import { legacyHitDicePools } from "../domain/multiclass.js";
import { spendHitDie, takeLongRest, takeShortRest } from "../domain/rests.js";
import { availableSpecialRecoveries, songOfRestDie } from "../domain/restRecovery2014.js";

function poolsFor(character) {
  return character.hitDicePools && Object.keys(character.hitDicePools).length
    ? character.hitDicePools
    : legacyHitDicePools(character.classLevels, character.hitDiceRemaining);
}

export function RestWizard({ character, onClose, onCommit }) {
  const [mode, setMode] = useState("short");
  const [working, setWorking] = useState(character);
  const [rolls, setRolls] = useState({});
  const [spent, setSpent] = useState([]);
  const [recoveryFirst, setRecoveryFirst] = useState(Object.keys(poolsFor(character))[0] || "");
  const [slotRecoveries, setSlotRecoveries] = useState({});
  const [songRoll, setSongRoll] = useState("");
  const [error, setError] = useState("");
  const pools = useMemo(() => poolsFor(working), [working]);
  const conModifier = abilityModifier(character.abilities?.constitution || 10);
  const specialRecoveries = useMemo(() => availableSpecialRecoveries(character), [character]);
  const songDie = songOfRestDie(character);

  function selectMode(nextMode) {
    setMode(nextMode);
    setWorking(character);
    setSpent([]);
    setSlotRecoveries({});
    setSongRoll("");
    setError("");
  }

  function changeSlotRecovery(feature, level, change) {
    setSlotRecoveries((current) => {
      const featureSelections = current[feature.id] || {};
      const selected = Number(featureSelections[level] || 0);
      const spentSlotCount = Number(character.usedSpellSlots?.[level - 1] || 0);
      const usedBudget = Object.entries(featureSelections).reduce((sum, [slotLevel, count]) => sum + (Number(slotLevel) * Number(count || 0)), 0);
      const next = Math.max(0, Math.min(spentSlotCount, selected + change));
      if (change > 0 && usedBudget + level > feature.budget) return current;
      return { ...current, [feature.id]: { ...featureSelections, [level]: next } };
    });
    setError("");
  }

  function useHitDie(die) {
    try {
      const roll = Number(rolls[die]);
      setWorking(spendHitDie(working, die, roll));
      setSpent((current) => [...current, `${die} roll ${roll} (${formatModifier(conModifier)} Constitution)`]);
      setError("");
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  function commit() {
    try {
      const specialRecoveryRequests = specialRecoveries.flatMap((feature) => Object.values(slotRecoveries[feature.id] || {}).some((count) => Number(count) > 0)
        ? [{ featureId: feature.id, selections: slotRecoveries[feature.id] }]
        : []);
      const next = mode === "short"
        ? takeShortRest(working, { hpBefore: character.hp, hitDiceSpent: spent, songOfRestRoll: songRoll ? Number(songRoll) : 0, specialRecoveries: specialRecoveryRequests })
        : takeLongRest(character, recoveryFirst ? [recoveryFirst] : []);
      onCommit(next, mode);
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-shell material-floating rest-wizard" role="dialog" aria-modal="true" aria-labelledby="rest-heading">
        <header className="modal-header">
          <div><p className="eyebrow">Recovery</p><h2 id="rest-heading">Take a rest</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close rest dialog"><X size={21} /></button>
        </header>
        <div className="rest-mode-options" role="tablist" aria-label="Rest type">
          <button className={mode === "short" ? "selected" : ""} onClick={() => selectMode("short")} role="tab" aria-selected={mode === "short"}><Campfire size={23} /><span><strong>Short rest</strong><small>Spend Hit Dice; restore short-rest resources and Pact Magic.</small></span></button>
          <button className={mode === "long" ? "selected" : ""} onClick={() => selectMode("long")} role="tab" aria-selected={mode === "long"}><MoonStars size={23} /><span><strong>Long rest</strong><small>Restore HP, spell slots, resources, and half your Hit Dice.</small></span></button>
        </div>
        <div className="wizard-body rest-body">
          {mode === "short" ? <>
            <div className="rest-summary"><span>Hit points</span><strong>{working.hp} / {working.maxHp}</strong><small>Constitution modifier {formatModifier(conModifier)} per die</small></div>
            <section className="hit-die-spender" aria-labelledby="hit-die-heading">
              <div><p className="section-kicker">Optional healing</p><h3 id="hit-die-heading">Spend Hit Dice</h3></div>
              {Object.entries(pools).map(([die, pool]) => <div className="hit-die-row" key={die}>
                <DiceFive size={22} /><div><strong>{die}</strong><small>{pool.current} / {pool.max} remaining</small></div>
                <input type="number" min="1" max={Number(die.slice(1))} value={rolls[die] || ""} onChange={(event) => setRolls((current) => ({ ...current, [die]: event.target.value }))} aria-label={`${die} roll result`} placeholder={`1-${die.slice(1)}`} />
                <button className="secondary-action" onClick={() => useHitDie(die)} disabled={!pool.current || working.hp >= working.maxHp}>Spend</button>
              </div>)}
              {!Object.keys(pools).length && <p className="empty-state">No Hit Dice are available.</p>}
            </section>
            {songDie > 0 && spent.length > 0 && <label className="song-of-rest-field"><MusicNotes size={20} /><span><strong>Song of Rest</strong><small>Optionally record the Bard's d{songDie} result for extra healing.</small></span><input type="number" min="1" max={songDie} value={songRoll} onChange={(event) => setSongRoll(event.target.value)} aria-label={`Song of Rest d${songDie} result`} placeholder={`1-${songDie}`} /></label>}
            {specialRecoveries.length > 0 && <section className="special-recovery-section" aria-labelledby="special-recovery-heading">
              <div><p className="section-kicker">Optional magic recovery</p><h3 id="special-recovery-heading">Recover expended spell slots</h3></div>
              {specialRecoveries.map((feature) => { const selections = slotRecoveries[feature.id] || {}; const usedBudget = Object.entries(selections).reduce((sum, [level, count]) => sum + (Number(level) * Number(count || 0)), 0); return <article className={`special-recovery-card ${!feature.available ? "unavailable" : ""}`} key={feature.id}>
                <header><ArrowsClockwise size={21} /><div><strong>{feature.name}</strong><small>{feature.available ? `${feature.budget - usedBudget} of ${feature.budget} recovery levels remaining` : "Already used; restored by a long rest"}</small></div></header>
                {feature.available && feature.eligibleSlots.length > 0 ? <div className="slot-recovery-grid">{feature.eligibleSlots.map((slot) => <div key={slot.level}><span>Level {slot.level}<small>{slot.expended} expended</small></span><div className="mini-counter"><button onClick={() => changeSlotRecovery(feature, slot.level, -1)} disabled={!Number(selections[slot.level] || 0)} aria-label={`Recover one fewer level ${slot.level} slot`}><Minus size={13} /></button><strong>{Number(selections[slot.level] || 0)}</strong><button onClick={() => changeSlotRecovery(feature, slot.level, 1)} disabled={Number(selections[slot.level] || 0) >= slot.expended || usedBudget + slot.level > feature.budget} aria-label={`Recover one more level ${slot.level} slot`}><Plus size={13} /></button></div></div>)}</div> : feature.available && <p>No eligible 1st–5th-level spell slots are currently expended.</p>}
              </article>; })}
            </section>}
          </> : <>
            <div className="rest-summary"><span>Long-rest result</span><strong>{character.maxHp} HP</strong><small>Spell slots and eligible resources refill.</small></div>
            {Object.keys(poolsFor(character)).length > 1 && <label className="rest-recovery-order">Recover this Hit Die first <select value={recoveryFirst} onChange={(event) => setRecoveryFirst(event.target.value)}>{Object.keys(poolsFor(character)).map((die) => <option key={die}>{die}</option>)}</select><small>2014 rules restore up to half your total character level (minimum one).</small></label>}
          </>}
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
        <footer className="modal-actions"><button className="secondary-action" onClick={onClose}>Cancel</button><button className="primary-action" onClick={commit}>{mode === "short" ? <Campfire size={18} /> : <MoonStars size={18} />} Complete {mode} rest</button></footer>
      </section>
    </div>
  );
}
