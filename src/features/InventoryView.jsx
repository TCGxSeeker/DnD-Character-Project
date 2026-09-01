import { Backpack, MagnifyingGlass, Plus, SpinnerGap, Trash, WifiHigh } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { searchItems } from "../data/open5e.js";
import { calculateArmorClass, calculateSpeed, equipmentFromOpen5e, equippedArmorRequirements } from "../domain/armor.js";
import { setWeaponUse, weaponProfile, weaponUse } from "../domain/attacks.js";
import { ammunitionSummary, attunementSummary, carryingSummary, consumeAmmunition, itemWeight, setEquipmentAttuned, setEquipmentEquipped, setEquipmentQuantity, setVariantEncumbrance } from "../domain/equipment.js";
import { appendHistoryEvent } from "../domain/history.js";

function InventoryItemRow({ character, item, commit, removeItem }) {
  const [quantity, setQuantity] = useState(String(item.quantity ?? 0));
  useEffect(() => setQuantity(String(item.quantity ?? 0)), [item.quantity]);
  const weapon = weaponProfile(item);
  const use = weapon ? weaponUse(item, weapon) : null;
  const ammunition = weapon ? ammunitionSummary(character, item) : null;
  const requiresAttunement = Boolean(item.requiresAttunement || item.equipment?.requiresAttunement);
  const weight = itemWeight(item);

  function saveQuantity() {
    if (Number(quantity) === Number(item.quantity || 0)) return;
    if (!commit(() => setEquipmentQuantity(character, item.id, Number(quantity)))) setQuantity(String(item.quantity ?? 0));
  }

  return <article className={item.equipped ? "equipped" : ""}>
    <div className="inventory-primary-actions">
      <button className="prepared-toggle" onClick={() => commit(() => setEquipmentEquipped(character, item.id, !item.equipped))} disabled={!item.equipped && Number(item.quantity || 0) < 1} aria-label={`${item.equipped ? "Unequip" : "Equip"} ${item.name}`}>{item.equipped ? "Equipped" : "Equip"}</button>
      {requiresAttunement && <button className={`prepared-toggle ${item.attuned ? "active" : ""}`} onClick={() => commit(() => setEquipmentAttuned(character, item.id, !item.attuned))} disabled={!item.attuned && Number(item.quantity || 0) < 1} aria-label={`${item.attuned ? "End attunement to" : "Attune to"} ${item.name}`}>{item.attuned ? "Attuned" : "Attune"}</button>}
      {item.equipped && ammunition?.required && <button className="prepared-toggle" onClick={() => commit(() => consumeAmmunition(character, item.id))} disabled={ammunition.available < 1} aria-label={`Use one ${ammunition.ammunitionType} for ${item.name}`}>Use 1 {ammunition.ammunitionType}</button>}
    </div>
    <div><strong>{item.name}</strong><span>{item.detail}{weight ? ` · ${weight} lb. each` : ""}{weapon?.properties.length ? ` · ${weapon.properties.join(", ")}` : ""}{ammunition?.required ? ` · ${ammunition.available} ${ammunition.ammunitionType}${ammunition.available === 1 ? "" : "s"} ready` : ""}</span>{item.equipped && weapon && <div className="weapon-use-fields">{(weapon.versatile || weapon.specialRuleId === "lance") && <label>Grip<select value={use.wieldMode} onChange={(event) => commit(() => setWeaponUse(character, item.id, { wieldMode: event.target.value }))}><option value="one-handed">One handed{weapon.specialRuleId === "lance" ? " (mounted)" : ""}</option><option value="two-handed">Two handed{weapon.versatileDamage ? ` (${weapon.versatileDamage})` : ""}</option></select></label>}{weapon.light && weapon.attackType === "melee" && <label>Role<select value={use.role} onChange={(event) => commit(() => setWeaponUse(character, item.id, { role: event.target.value }))}><option value="main">Main hand</option><option value="offhand">Off hand</option></select></label>}{weapon.thrown && weapon.attackType === "melee" && <label>Attack<select value={use.attackMode} onChange={(event) => commit(() => setWeaponUse(character, item.id, { attackMode: event.target.value }))}><option value="melee">Melee</option><option value="thrown">Thrown</option></select></label>}</div>}</div>
    <label>Qty<input type="number" min="0" max="9999" value={quantity} onChange={(event) => setQuantity(event.target.value)} onBlur={saveQuantity} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /></label>
    <button className="icon-button subtle" onClick={() => removeItem(item)} aria-label={`Remove ${item.name}`}><Trash size={17} /></button>
  </article>;
}

export function InventoryView({ character, updateCharacter }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [inventoryError, setInventoryError] = useState("");
  const carrying = carryingSummary(character);
  const attunement = attunementSummary(character);
  const armorRequirements = equippedArmorRequirements(character);

  function commit(action) {
    try {
      const next = action();
      updateCharacter(next);
      setInventoryError("");
      return true;
    } catch (error) {
      setInventoryError(error.message);
      return false;
    }
  }

  async function runSearch(event) {
    event.preventDefault();
    if (!query.trim()) return;
    setStatus("loading"); setMessage("");
    try {
      const payload = await searchItems(query);
      setResults(payload.results); setStatus("ready");
      setMessage(payload.fromCache ? "Showing cached SRD results." : `Found ${payload.count} SRD matches.`);
    } catch (error) { setStatus("error"); setMessage(error.message); }
  }

  function addItem(item) {
    if (character.inventory.some((entry) => entry.id === item.key)) return;
    const next = { ...character, inventory: [...character.inventory, equipmentFromOpen5e(item)] };
    updateCharacter(appendHistoryEvent(next, { type: "item-added", title: `Obtained ${item.name}`, detail: "Inventory updated", changes: { itemsAdded: [item.name] } }));
  }

  function removeItem(item) {
    const next = { ...character, inventory: character.inventory.filter((entry) => entry.id !== item.id) };
    updateCharacter(appendHistoryEvent(next, { type: "item-removed", title: `Removed ${item.name}`, detail: "Inventory updated", changes: { itemsRemoved: [item.name] } }));
  }

  return (
    <div className="collection-view">
      <header className="view-header"><div><p className="eyebrow">Carried and equipped</p><h1>Inventory</h1><span>{character.inventory.length} distinct items</span></div><Backpack size={34} /></header>
      <div className="library-layout">
        <section className="glass-panel material-primary collection-list">
          <div className="section-heading inventory-summary"><div><h2>Equipment</h2><span>AC {calculateArmorClass(character)} · Speed {calculateSpeed(character)} ft. · Carrying {carrying.weight.toFixed(1).replace(".0", "")} / {carrying.capacity} lb. · Attunement {attunement.current}/{attunement.max}</span><small>{carrying.variantEnabled ? `Variant status: ${carrying.variantStatus.replaceAll("-", " ")}${carrying.speedPenalty ? ` · speed −${carrying.speedPenalty} ft.` : ""}` : "Standard carrying rules. Armor Strength requirements apply."}</small>{armorRequirements.entries.map((entry) => <small key={entry.itemId} className={!entry.strengthMet || entry.proficient === false ? "requirement-warning" : ""}>{entry.name}: {entry.category || "armor"}{entry.strengthRequirement ? ` · STR ${entry.strengthRequirement}${armorRequirements.armorStrengthIgnored ? " ignored by variant encumbrance" : entry.strengthMet ? " met" : " not met · speed −10 ft."}` : ""}{entry.proficient === false ? " · not proficient" : ""}{entry.stealthDisadvantage ? " · Stealth disadvantage" : ""}</small>)}</div><button type="button" className={`rule-option-toggle ${carrying.variantEnabled ? "active" : ""}`} aria-pressed={carrying.variantEnabled} onClick={() => commit(() => setVariantEncumbrance(character, !carrying.variantEnabled))}><span>Variant encumbrance</span><strong>{carrying.variantEnabled ? "On" : "Off"}</strong></button></div>
          {inventoryError && <p className="form-error" role="alert">{inventoryError}</p>}
          <div className="inventory-table">{character.inventory.map((item) => <InventoryItemRow key={item.id} character={character} item={item} commit={commit} removeItem={removeItem} />)}</div>
        </section>
        <aside className="glass-panel material-primary reference-panel">
          <p className="section-kicker">Open5e · SRD 2014</p><h2>Find equipment</h2><p>Search the SRD item catalog and add entries to this character.</p>
          <form className="reference-search" onSubmit={runSearch}><MagnifyingGlass size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search item names" /><button type="submit">Search</button></form>
          {status === "loading" && <div className="reference-status"><SpinnerGap className="spin" size={20} /> Contacting Open5e…</div>}
          {message && <div className={`reference-status ${status}`}><WifiHigh size={18} /> {message}</div>}
          <div className="reference-results">{results.map((item) => <article key={item.key}><div><strong>{item.name}</strong><span>{item.category?.name || "Item"}{item.cost ? ` · ${item.cost} gp` : ""}</span></div><button onClick={() => addItem(item)} disabled={character.inventory.some((entry) => entry.id === item.key)}><Plus size={16} /> Add</button></article>)}</div>
        </aside>
      </div>
    </div>
  );
}
