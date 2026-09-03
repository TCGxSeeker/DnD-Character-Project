import test from "node:test";
import assert from "node:assert/strict";

import {
  ROLLED_ABILITY_RULE,
  assignRolledAbilities,
  createAbilityRollSession,
  rollAbilityCandidate,
  rollAbilitySet,
  rollSettledDie,
  selectAbilityRollSet,
  selectedRolledValues,
  setAbilityDumpIndex,
  validateRolledAssignment,
} from "./abilityRolls.js";

function sequenceRng(values) {
  let index = 0;

  return () => {
    if (index >= values.length) {
      throw new Error(
        "Deterministic RNG sequence exhausted.",
      );
    }

    return values[index++];
  };
}

function face(value) {
  return (value - 0.5) / 6;
}

test("a 1 rerolls until the die settles from 2 through 6", () => {
  const result =
    rollSettledDie(
      sequenceRng([
        face(1),
        face(1),
        face(4),
      ]),
    );

  assert.deepEqual(
    result.history,
    [1, 1, 4],
  );

  assert.equal(result.value, 4);
  assert.equal(result.rerolls, 2);
});

test("candidate rerolls 1s, drops one tied lowest die, and sums the remaining three", () => {
  const result =
    rollAbilityCandidate(
      sequenceRng([
        face(1),
        face(3),
        face(4),
        face(3),
        face(6),
      ]),
    );

  assert.deepEqual(
    result.settledValues,
    [3, 4, 3, 6],
  );

  assert.equal(
    result.droppedIndex,
    0,
  );

  assert.equal(
    result.droppedValue,
    3,
  );

  assert.deepEqual(
    result.keptValues,
    [4, 3, 6],
  );

  assert.equal(result.total, 13);

  assert.deepEqual(
    result.dice[0].history,
    [1, 3],
  );
});

test("every candidate has exactly four settled non-1 dice", () => {
  const result =
    rollAbilityCandidate(
      sequenceRng([
        face(1),
        face(2),
        face(1),
        face(6),
        face(3),
        face(4),
      ]),
    );

  assert.equal(
    result.dice.length,
    4,
  );

  assert.equal(
    result.settledValues.length,
    4,
  );

  assert.ok(
    result.settledValues.every(
      (value) =>
        value >= 2
        && value <= 6,
    ),
  );
});

test("an ability set creates six candidates and suggests the first tied lowest total", () => {
  const rng =
    sequenceRng(
      Array.from(
        { length: 24 },
        () => face(2),
      ),
    );

  const set =
    rollAbilitySet(rng);

  assert.equal(
    set.candidates.length,
    6,
  );

  assert.deepEqual(
    set.totals,
    [6, 6, 6, 6, 6, 6],
  );

  assert.equal(
    set.suggestedDumpIndex,
    0,
  );
});

test("a roll session contains exactly two complete sets", () => {
  const rng =
    sequenceRng(
      Array.from(
        { length: 48 },
        () => face(3),
      ),
    );

  const session =
    createAbilityRollSession(rng);

  assert.equal(
    session.rule,
    ROLLED_ABILITY_RULE,
  );

  assert.equal(
    session.sets.length,
    2,
  );

  assert.ok(
    session.sets.every(
      (set) =>
        set.candidates.length === 6,
    ),
  );

  assert.equal(
    session.selectedSetIndex,
    null,
  );

  assert.equal(
    session.dumpIndex,
    null,
  );
});

test("selecting a set automatically selects its suggested dump value", () => {
  const rng =
    sequenceRng(
      Array.from(
        { length: 48 },
        () => face(4),
      ),
    );

  const selected =
    selectAbilityRollSet(
      createAbilityRollSession(rng),
      1,
    );

  assert.equal(
    selected.selectedSetIndex,
    1,
  );

  assert.equal(
    selected.dumpIndex,
    0,
  );
});

test("the user can move the dump designation and only that result becomes 8", () => {
  const rng =
    sequenceRng(
      Array.from(
        { length: 48 },
        () => face(5),
      ),
    );

  let session =
    createAbilityRollSession(rng);

  session =
    selectAbilityRollSet(
      session,
      0,
    );

  session =
    setAbilityDumpIndex(
      session,
      4,
    );

  assert.deepEqual(
    selectedRolledValues(session),
    [15, 15, 15, 15, 8, 15],
  );
});

test("rolled assignment must use all six generated positions exactly once", () => {
  const valid = {
    strength: 0,
    dexterity: 1,
    constitution: 2,
    intelligence: 3,
    wisdom: 4,
    charisma: 5,
  };

  assert.equal(
    validateRolledAssignment(valid),
    true,
  );

  assert.equal(
    validateRolledAssignment({
      ...valid,
      charisma: 4,
    }),
    false,
  );
});

test("selected post-dump values can be assigned freely to abilities", () => {
  const rng =
    sequenceRng(
      Array.from(
        { length: 48 },
        () => face(6),
      ),
    );

  let session =
    createAbilityRollSession(rng);

  session =
    selectAbilityRollSet(
      session,
      0,
    );

  session =
    setAbilityDumpIndex(
      session,
      5,
    );

  const abilities =
    assignRolledAbilities(
      session,
      {
        strength: 5,
        dexterity: 4,
        constitution: 3,
        intelligence: 2,
        wisdom: 1,
        charisma: 0,
      },
    );

  assert.deepEqual(
    abilities,
    {
      strength: 8,
      dexterity: 18,
      constitution: 18,
      intelligence: 18,
      wisdom: 18,
      charisma: 18,
    },
  );
});