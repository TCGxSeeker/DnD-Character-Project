// Consolidated behavioral suite. Source comments retain the former test boundaries for review.

// src/domain/armor.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { armorProficiencyRestrictions, calculateArmorClass, calculateSpeed, equipmentFromOpen5e, equippedArmorRequirements, normalizeArmorCharacter } = await import("./armor.js");


  const character = { ancestry: "Warforged — Envoy", abilities: { dexterity: 14 }, armorClass: 13, inventory: [] };

  test("stored AC remains the baseline when no tracked armor is equipped", () => {
    assert.equal(calculateArmorClass(normalizeArmorCharacter(character)), 13);
  });

  test("legacy miscellaneous bonuses are not counted twice", () => {
    const normalized = normalizeArmorCharacter({ ...character, armorClass: 15, armorClassBonuses: { ancestry: 1, misc: 2 } });
    assert.equal(calculateArmorClass(normalized), 15);
  });

  test("equipped armor applies Dexterity caps and ancestry bonuses", () => {
    const normalized = normalizeArmorCharacter(character);
    normalized.inventory = [{ id: "srd_half-plate-armor", name: "Half Plate Armor", quantity: 1, equipped: true }];
    assert.equal(calculateArmorClass(normalized), 18);
  });

  test("heavy armor ignores Dexterity and only one shield applies", () => {
    const normalized = normalizeArmorCharacter(character);
    normalized.inventory = [
      { id: "srd_plate-armor", name: "Plate Armor", quantity: 1, equipped: true },
      { id: "shield-one", name: "Shield", quantity: 1, equipped: true },
      { id: "shield-two", name: "Shield", quantity: 1, equipped: true },
    ];
    assert.equal(calculateArmorClass(normalized), 21);
  });

  test("unequipped and zero-quantity items do not change AC", () => {
    const normalized = normalizeArmorCharacter(character);
    normalized.inventory = [
      { id: "srd_plate-armor", name: "Plate Armor", quantity: 1, equipped: false },
      { id: "srd_shield", name: "Shield", quantity: 0, equipped: true },
    ];
    assert.equal(calculateArmorClass(normalized), 13);
  });

  test("Open5e armor and shields retain calculation metadata", () => {
    const armor = equipmentFromOpen5e({ key: "hide", name: "Hide Armor", category: { key: "armor", name: "Armor" }, armor: { ac_base: 12, ac_display: "12 + Dex modifier (max 2)", ac_add_dexmod: true, ac_cap_dexmod: 2 } });
    const shield = equipmentFromOpen5e({ key: "shield", name: "Shield", category: { key: "shield", name: "Shield" } });
    assert.deepEqual(armor.equipment, { kind: "armor", acBase: 12, addDexterity: true, dexterityCap: 2, acBonus: 0, category: "medium", strengthRequirement: null, stealthDisadvantage: false });
    assert.deepEqual(shield.equipment, { kind: "shield", acBonus: 2 });
  });

  test("Open5e weapons retain conditional 2014 property metadata", () => {
    const weapon = equipmentFromOpen5e({ key: "longbow", name: "Longbow", category: { key: "weapon" }, weapon: { name: "Longbow", damage_dice: "1d8", damage_type: { name: "Piercing" }, properties: [{ property: { name: "Ammunition" }, detail: "150/600" }, { property: { name: "Heavy" } }, { property: { name: "Two-Handed" } }], is_martial: true } });
    assert.equal(weapon.equipment.attackType, "ranged");
    assert.equal(weapon.equipment.heavy, true);
    assert.equal(weapon.equipment.twoHanded, true);
    assert.deepEqual(weapon.equipment.range, { normal: 150, long: 600, unit: "feet" });
  });

  test("heavy armor Strength requirements reduce speed and expose proficiency warnings", () => {
    const fighter = { ancestryId: "human", abilities: { strength: 12 }, speed: 30, proficiencies: { armor: ["Light armor"] }, inventory: [{ id: "chain", name: "Chain Mail", quantity: 1, equipped: true }] };
    const requirements = equippedArmorRequirements(fighter);
    assert.equal(calculateSpeed(fighter), 20);
    assert.equal(requirements.entries[0].strengthRequirement, 13);
    assert.equal(requirements.entries[0].strengthMet, false);
    assert.equal(requirements.hasProficiencyViolation, true);
  });

  test("armor restrictions include shields and recover original-class proficiency for legacy characters", () => {
    const wizard = { classLevels: [{ classId: "wizard", level: 3 }], inventory: [{ id: "shield", name: "Shield", quantity: 1, equipped: true }] };
    assert.deepEqual(armorProficiencyRestrictions(wizard).disadvantagedAbilities, ["strength", "dexterity"]);
    assert.equal(armorProficiencyRestrictions(wizard).spellcastingAllowed, false);
    const fighter = { ...wizard, classLevels: [{ classId: "fighter", level: 3 }] };
    assert.equal(armorProficiencyRestrictions(fighter).active, false);
  });

  test("dwarves ignore heavy armor speed penalties", () => {
    const dwarf = { ancestryId: "dwarf", abilities: { strength: 8 }, speed: 25, inventory: [{ id: "plate", name: "Plate Armor", quantity: 1, equipped: true }] };
    assert.equal(calculateSpeed(dwarf), 25);
    assert.equal(equippedArmorRequirements(dwarf).entries[0].strengthMet, true);
  });

  test("variant encumbrance replaces rather than stacks with armor Strength rules", () => {
    const character = { ancestryId: "human", abilities: { strength: 10 }, speed: 30, rulesOptions: { variantEncumbrance: true }, inventory: [{ id: "chain", name: "Chain Mail", quantity: 1, equipped: true, weight: 55 }] };
    assert.equal(calculateSpeed(character), 20);
    assert.equal(equippedArmorRequirements(character).armorStrengthIgnored, true);
    assert.equal(equippedArmorRequirements(character).speedPenalty, 0);
  });

  test("class armor formulas and Defense style share equipped inventory state", () => {
    const barbarian = { abilities: { dexterity: 14, constitution: 16, wisdom: 12 }, classLevels: [{ classId: "barbarian", level: 5 }], inventory: [], speed: 30, unarmoredArmorClass: 12, armorClassBonuses: { ancestry: 0, misc: 0 } };
    assert.equal(calculateArmorClass(barbarian), 15);
    assert.equal(calculateSpeed(barbarian), 40);
    const fighter = { ...barbarian, classLevels: [{ classId: "fighter", level: 1 }], classChoices: [{ id: "fighter-style", selections: ["Defense"] }], inventory: [{ name: "Chain Mail", quantity: 1, equipped: true }] };
    assert.equal(calculateArmorClass(fighter), 17);
  });

  test("Monk speed and unarmored defense turn off when equipment disallows them", () => {
    const monk = { abilities: { dexterity: 16, wisdom: 16, constitution: 10 }, classLevels: [{ classId: "monk", level: 6 }], inventory: [], speed: 30, unarmoredArmorClass: 13, armorClassBonuses: { ancestry: 0, misc: 0 } };
    assert.equal(calculateArmorClass(monk), 16);
    assert.equal(calculateSpeed(monk), 45);
    const armored = { ...monk, inventory: [{ name: "Leather Armor", quantity: 1, equipped: true }] };
    assert.equal(calculateSpeed(armored), 30);
  });
}

// src/domain/attackContext2014.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { evaluateAttackContext2014, normalizeAttackContext } = await import("./attackContext2014.js");


  const ranged = { id: "longbow", available: true, range: { normal: 150, long: 600 }, reach: null, disadvantageReasons: [] };
  const melee = { id: "glaive", available: true, range: null, reach: 10, disadvantageReasons: [] };
  const withFeat = (id) => ({ features: [{ id: `feat-${id}` }] });

  test("context normalization is safe and does not invent an unknown distance", () => {
    assert.deepEqual(normalizeAttackContext({ distance: -10, cover: "impossible" }), { distance: null, cover: "none", hostileWithin5: false, hostileCanSeeAttacker: true, hostileIncapacitated: false, attackerCanSeeTarget: true, targetCanSeeAttacker: true, targetProne: false, attackerMounted: false, targetSize: "unknown", targetFormless: false });
  });

  test("range bands impose long-range disadvantage and reject unreachable targets", () => {
    assert.equal(evaluateAttackContext2014({}, ranged, { distance: 100 }).rollState, "normal");
    assert.equal(evaluateAttackContext2014({}, ranged, { distance: 200 }).rollState, "disadvantage");
    assert.deepEqual(evaluateAttackContext2014({}, ranged, { distance: 601 }).unavailableReasons, ["Target is beyond long range"]);
    assert.equal(evaluateAttackContext2014({}, melee, { distance: 10 }).canAttack, true);
    assert.equal(evaluateAttackContext2014({}, melee, { distance: 15 }).canAttack, false);
  });

  test("partial and total cover expose target defenses while Sharpshooter ignores only partial cover", () => {
    assert.equal(evaluateAttackContext2014({}, ranged, { cover: "half" }).coverArmorClassBonus, 2);
    assert.equal(evaluateAttackContext2014({}, ranged, { cover: "three-quarters" }).coverDexteritySaveBonus, 5);
    const ignored = evaluateAttackContext2014(withFeat("sharpshooter"), ranged, { distance: 200, cover: "three-quarters" });
    assert.equal(ignored.rollState, "normal");
    assert.equal(ignored.coverArmorClassBonus, 0);
    assert.equal(evaluateAttackContext2014(withFeat("sharpshooter"), ranged, { cover: "total" }).canAttack, false);
  });

  test("close combat, visibility, and prone contribute reasons before normal cancellation", () => {
    assert.equal(evaluateAttackContext2014({}, ranged, { hostileWithin5: true }).rollState, "disadvantage");
    assert.equal(evaluateAttackContext2014(withFeat("crossbow-expert"), ranged, { hostileWithin5: true }).rollState, "normal");
    assert.equal(evaluateAttackContext2014({}, melee, { distance: 5, targetProne: true }).rollState, "advantage");
    const cancelled = evaluateAttackContext2014({}, ranged, { attackerCanSeeTarget: false, targetCanSeeAttacker: false });
    assert.equal(cancelled.rollState, "normal");
    assert.equal(cancelled.advantageReasons.length, 1);
    assert.equal(cancelled.disadvantageReasons.length, 1);
  });

  test("existing attack constraints participate in the contextual result", () => {
    const constrained = { ...ranged, disadvantageReasons: ["Heavy weapon used by a Small creature"] };
    assert.equal(evaluateAttackContext2014({}, constrained, {}).rollState, "disadvantage");
    assert.equal(evaluateAttackContext2014({}, { ...ranged, available: false }, {}).canAttack, false);
  });

  test("lance context enforces close-range disadvantage and its mounted grip exception", () => {
    const lance = { ...melee, id: "lance", use: { wieldMode: "one-handed" }, special: { id: "lance", closeRangeDisadvantage: 5, requiresTwoHandsUnlessMounted: true } };
    const unmounted = evaluateAttackContext2014({}, lance, { distance: 5 });
    assert.equal(unmounted.canAttack, false);
    assert.match(unmounted.unavailableReasons[0], /requires two hands/);
    assert.equal(unmounted.rollState, "disadvantage");
    const mounted = evaluateAttackContext2014({}, lance, { distance: 10, attackerMounted: true });
    assert.equal(mounted.canAttack, true);
    assert.equal(mounted.rollState, "normal");
    assert.equal(mounted.specialResolution.status, "mounted");
  });

  test("net context reports restraint and ineligible target resolution without mutating attack availability", () => {
    const net = { ...ranged, id: "net", range: { normal: 5, long: 15 }, special: { id: "net", onHit: { escape: { action: "action", ability: "strength", dc: 10 }, destroy: { armorClass: 10, damage: 5, damageType: "slashing" } } } };
    const medium = evaluateAttackContext2014({}, net, { distance: 5, targetSize: "medium" });
    assert.equal(medium.specialResolution.status, "applies");
    assert.equal(medium.specialResolution.effect, "restrained");
    assert.equal(medium.specialResolution.escape.dc, 10);
    const huge = evaluateAttackContext2014({}, net, { distance: 5, targetSize: "huge" });
    assert.equal(huge.canAttack, true);
    assert.equal(huge.specialResolution.status, "no-effect");
    assert.match(huge.specialResolution.reason, /Huge or larger/);
    assert.equal(evaluateAttackContext2014({}, net, { distance: 5, targetSize: "small", targetFormless: true }).specialResolution.status, "no-effect");
  });
}

// src/domain/attacks.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { attackSummary, setWeaponUse, weaponProfile } = await import("./attacks.js");

  const weapon = (name, ranged = false) => ({ id: name, name, quantity: 1, equipped: true, weapon: { name, damage_dice: "1d8", damage_type: { name: ranged ? "Piercing" : "Slashing" }, properties: ranged ? [{ property: { name: "Ammunition" } }] : [{ property: { name: "Versatile" }, detail: "1d10" }], is_martial: true } });
  const fighter = { abilities: { strength: 18, dexterity: 16 }, classLevels: [{ classId: "fighter", level: 5 }], proficiencies: { weapons: ["Simple weapons", "Martial weapons"] }, classChoices: [{ id: "fighter-style", selections: ["Archery"] }], inventory: [weapon("Longsword"), weapon("Longbow", true)] };
  test("Open5e and legacy weapon profiles retain playable metadata", () => {
    assert.equal(weaponProfile(fighter.inventory[0]).versatileDamage, "1d10");
    assert.deepEqual(weaponProfile({ equipment: { kind: "weapon", name: "Longbow", properties: ["ammunition"] } }).range, { normal: 150, long: 600, unit: "feet" });
    assert.equal(weaponProfile({ name: "Quarterstaff" }).versatileDamage, "1d8");
  });
  test("attacks share ability, proficiency, style, and Extra Attack math", () => {
    const result = attackSummary(fighter);
    assert.equal(result.attacksPerAction, 2);
    assert.deepEqual(result.attacks.map((entry) => [entry.attackBonus, entry.damage]), [[7, "1d8 + 4"], [8, "1d8 + 3"]]);
  });
  test("legacy characters derive missing weapon proficiencies from their original class", () => {
    const legacyFighter = { abilities: { strength: 12, dexterity: 16 }, classLevels: [{ classId: "fighter", level: 5 }], inventory: [weapon("Longbow", true)] };
    const legacyDruid = { abilities: { strength: 14, dexterity: 10 }, classLevels: [{ classId: "druid", level: 7 }], inventory: [{ id: "staff", name: "Quarterstaff", quantity: 1, equipped: true }] };
    assert.equal(attackSummary(legacyFighter).attacks[0].attackBonus, 6);
    assert.equal(attackSummary(legacyDruid).attacks[0].attackBonus, 5);
  });
  test("ammunition weapons report whether an attack is currently available", () => {
    const noArrows = attackSummary(fighter).attacks[1];
    assert.equal(noArrows.available, false);
    const withArrows = attackSummary({ ...fighter, inventory: [...fighter.inventory, { id: "arrows", name: "Arrows", quantity: 20 }] }).attacks[1];
    assert.equal(withArrows.available, true);
    assert.equal(withArrows.ammunition.available, 20);
  });

  const configuredWeapon = (id, name, properties, options = {}) => ({
    id, name, quantity: 1, equipped: true, weaponUse: options.weaponUse,
    weapon: { name, damage_dice: options.damageDice || "1d6", damage_type: { name: options.damageType || "Slashing" }, properties: properties.map((entry) => typeof entry === "string" ? { property: { name: entry } } : entry), is_simple: options.simple ?? false, is_martial: options.martial ?? true },
  });

  test("thrown melee weapons retain their melee ability while darts remain ranged weapons", () => {
    const character = { abilities: { strength: 18, dexterity: 10 }, classLevels: [{ classId: "fighter", level: 1 }], proficiencies: { weapons: ["Simple weapons", "Martial weapons"] }, inventory: [
      configuredWeapon("handaxe", "Handaxe", [{ property: { name: "Thrown" }, detail: "20/60" }, "Light"], { simple: true }),
      configuredWeapon("dart", "Dart", [{ property: { name: "Thrown" }, detail: "20/60" }, "Finesse"], { simple: true, martial: false, damageType: "Piercing" }),
    ] };
    const attacks = attackSummary(character).attacks;
    assert.equal(attacks[0].ability, "strength");
    assert.equal(attacks[1].ability, "dexterity");
    assert.equal(attacks[0].reach, 5);
    const thrown = setWeaponUse({ ...character, history: [] }, "handaxe", { attackMode: "thrown" });
    assert.deepEqual(attackSummary(thrown).attacks[0].range, { normal: 20, long: 60, unit: "feet" });
  });

  test("Dueling and Great Weapon Fighting follow the configured wield mode", () => {
    const longsword = configuredWeapon("longsword", "Longsword", [{ property: { name: "Versatile" }, detail: "1d10" }], { damageDice: "1d8" });
    const baseCharacter = { abilities: { strength: 18, dexterity: 10 }, classLevels: [{ classId: "fighter", level: 1 }], proficiencies: { weapons: ["Martial weapons"] }, inventory: [longsword] };
    const duelist = attackSummary({ ...baseCharacter, classChoices: [{ id: "fighter-style", selections: ["Dueling"] }] }).attacks[0];
    assert.equal(duelist.damage, "1d8 + 6");
    const twoHandedState = setWeaponUse({ ...baseCharacter, history: [] }, "longsword", { wieldMode: "two-handed" });
    const greatWeapon = attackSummary({ ...twoHandedState, classChoices: [{ id: "fighter-style", selections: ["Great Weapon Fighting"] }] }).attacks[0];
    assert.equal(greatWeapon.damage, "1d10 + 4");
    assert.match(greatWeapon.rules[0], /reroll/);
    assert.equal(twoHandedState.history[0].type, "equipment-changed");
  });

  test("off-hand attacks enforce light weapons and Two-Weapon Fighting damage", () => {
    const main = configuredWeapon("main", "Scimitar", ["Finesse", "Light"]);
    const offhand = configuredWeapon("off", "Shortsword", ["Finesse", "Light"], { damageType: "Piercing", weaponUse: { wieldMode: "one-handed", role: "offhand" } });
    const baseCharacter = { abilities: { strength: 10, dexterity: 16 }, classLevels: [{ classId: "fighter", level: 1 }], proficiencies: { weapons: ["Martial weapons"] }, inventory: [main, offhand] };
    const withoutStyle = attackSummary(baseCharacter).attacks[1];
    assert.equal(withoutStyle.actionType, "bonus action");
    assert.equal(withoutStyle.damage, "1d6");
    const withStyle = attackSummary({ ...baseCharacter, classChoices: [{ id: "fighter-style", selections: ["Two-Weapon Fighting"] }] }).attacks[1];
    assert.equal(withStyle.damage, "1d6 + 3");
    assert.throws(() => setWeaponUse({ ...baseCharacter, history: [] }, "main", { role: "offhand", wieldMode: "two-handed" }), /cannot be wielded with two hands/);
  });

  test("loading, heavy, range, reach, and Protection expose actionable constraints", () => {
    const crossbow = configuredWeapon("crossbow", "Heavy Crossbow", [{ property: { name: "Ammunition" }, detail: "100/400" }, "Heavy", "Loading", "Two-Handed"], { damageDice: "1d10", damageType: "Piercing" });
    const small = { size: "small", abilities: { strength: 12, dexterity: 16 }, classLevels: [{ classId: "fighter", level: 5 }], proficiencies: { weapons: ["Martial weapons"] }, inventory: [crossbow, { id: "bolts", name: "Bolts", quantity: 20 }] };
    const attack = attackSummary(small).attacks[0];
    assert.equal(attack.maximumAttacks, 1);
    assert.deepEqual(attack.range, { normal: 100, long: 400, unit: "feet" });
    assert.equal(attack.disadvantageReasons.length, 1);
    const protection = attackSummary({ ...small, inventory: [{ id: "shield", name: "Shield", quantity: 1, equipped: true, equipment: { kind: "shield" } }], classChoices: [{ id: "fighter-style", selections: ["Protection"] }] });
    assert.equal(protection.reactions[0].id, "protection");
  });

  test("lance grip and net attack limits resolve their 2014 special profiles", () => {
    const lance = configuredWeapon("lance", "Lance", ["Reach", "Special"], { damageDice: "1d12", damageType: "Piercing" });
    const net = configuredWeapon("net", "Net", [{ property: { name: "Thrown" }, detail: "5/15" }, "Special"], { damageDice: "—", damageType: "" });
    const character = { abilities: { strength: 18, dexterity: 16 }, classLevels: [{ classId: "fighter", level: 5 }], proficiencies: { weapons: ["Martial weapons"] }, inventory: [lance, net] };
    const attacks = attackSummary(character).attacks;
    assert.equal(attacks[0].use.wieldMode, "two-handed");
    assert.equal(attacks[0].special.id, "lance");
    assert.equal(attacks[1].maximumAttacks, 1);
    assert.equal(attacks[1].damage, "—");
    assert.equal(attacks[1].special.onHit.effect, "restrained");
    const mountedGrip = setWeaponUse({ ...character, history: [] }, "lance", { wieldMode: "one-handed" });
    assert.equal(attackSummary(mountedGrip).attacks[0].use.wieldMode, "one-handed");
    assert.equal(mountedGrip.history[0].type, "equipment-changed");
  });
}

// src/domain/equipment.test.js
{
  const { default: test } = await import("node:test");
  const { default: assert } = await import("node:assert/strict");
  const { ammunitionSummary, attunementSummary, carryingSummary, consumeAmmunition, setEquipmentAttuned, setEquipmentEquipped, setEquipmentQuantity, setVariantEncumbrance } = await import("./equipment.js");


  const base = {
    abilities: { strength: 10 },
    inventory: [
      { id: "armor", name: "Chain Mail", quantity: 1, equipped: true, weight: 55, equipment: { kind: "armor" } },
      { id: "leather", name: "Leather Armor", quantity: 1, equipped: false, weight: 10, equipment: { kind: "armor" } },
      { id: "bow", name: "Longbow", quantity: 1, equipped: true, weight: 2, equipment: { kind: "weapon", ammunitionType: "arrow" } },
      { id: "arrows", name: "Arrows", quantity: 20, weight: 0.05 },
    ],
    history: [],
  };

  test("carrying calculations expose standard and variant 2014 thresholds", () => {
    const result = carryingSummary(base);
    assert.equal(result.weight, 68);
    assert.equal(result.capacity, 150);
    assert.equal(result.encumberedAt, 50);
    assert.equal(result.variantStatus, "encumbered");
    assert.equal(result.variantEnabled, false);
    assert.equal(result.speedPenalty, 0);
  });

  test("variant encumbrance is opt-in, audited, and exposes its mechanical effects", () => {
    const enabled = setVariantEncumbrance(base, true);
    const encumbered = carryingSummary(enabled);
    assert.equal(enabled.rulesOptions.variantEncumbrance, true);
    assert.equal(encumbered.speedPenalty, 10);
    assert.match(enabled.history[0].detail, /off → on/);
    const heavy = carryingSummary({ ...enabled, inventory: [{ id: "load", name: "Load", quantity: 1, weight: 110 }] });
    assert.equal(heavy.variantStatus, "heavily-encumbered");
    assert.equal(heavy.speedPenalty, 20);
    assert.deepEqual(heavy.disadvantages.savingThrows, ["strength", "dexterity", "constitution"]);
    assert.strictEqual(setVariantEncumbrance(enabled, true), enabled);
  });

  test("equipping body armor replaces the previously equipped body armor", () => {
    const next = setEquipmentEquipped(base, "leather", true);
    assert.equal(next.inventory.find((item) => item.id === "armor").equipped, false);
    assert.equal(next.inventory.find((item) => item.id === "leather").equipped, true);
    assert.equal(next.history[0].changes.equipmentChanged.length, 1);
  });

  test("zero quantity clears equipped and attuned state", () => {
    const character = { ...base, inventory: [{ id: "ring", name: "Ring", quantity: 1, equipped: true, attuned: true, requiresAttunement: true }], history: [] };
    const next = setEquipmentQuantity(character, "ring", 0);
    assert.deepEqual(next.inventory[0], { ...character.inventory[0], quantity: 0, equipped: false, attuned: false });
  });

  test("attunement enforces requirement and the three-item limit", () => {
    const inventory = [1, 2, 3, 4].map((value) => ({ id: `item-${value}`, name: `Item ${value}`, quantity: 1, requiresAttunement: true, attuned: value < 4 }));
    const character = { ...base, inventory, history: [] };
    assert.equal(attunementSummary(character).current, 3);
    assert.throws(() => setEquipmentAttuned(character, "item-4", true), /more than three/);
  });

  test("ammunition consumption is immutable, bounded, and audited", () => {
    assert.deepEqual(ammunitionSummary(base, base.inventory[2]), { required: true, ammunitionType: "arrow", available: 20, itemIds: ["arrows"] });
    const next = consumeAmmunition(base, "bow", 2);
    assert.equal(next.inventory.find((item) => item.id === "arrows").quantity, 18);
    assert.equal(base.inventory.find((item) => item.id === "arrows").quantity, 20);
    assert.equal(next.history[0].changes.ammunitionSpent[0], "Arrows ×2");
    assert.throws(() => consumeAmmunition({ ...base, inventory: base.inventory.map((item) => item.id === "arrows" ? { ...item, quantity: 0 } : item) }, "bow"), /only 0 remain/);
  });
}
