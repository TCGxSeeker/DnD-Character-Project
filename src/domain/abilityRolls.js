import { ABILITIES } from "./rules.js";

export const ROLLED_ABILITY_RULE =
  "4d6-reroll-ones-drop-lowest";

function assertRngValue(value) {
  const number = Number(value);

  if (
    !Number.isFinite(number)
    || number < 0
    || number >= 1
  ) {
    throw new Error(
      "Ability roll RNG must return a number from 0 inclusive to 1 exclusive.",
    );
  }

  return number;
}

export function rollD6(rng = Math.random) {
  return Math.floor(
    assertRngValue(rng()) * 6,
  ) + 1;
}

export function rollSettledDie(rng = Math.random) {
  const history = [];

  let value;

  do {
    value = rollD6(rng);
    history.push(value);
  } while (value === 1);

  return {
    history,
    value,
    rerolls: Math.max(0, history.length - 1),
  };
}

export function rollAbilityCandidate(
  rng = Math.random,
) {
  const dice = Array.from(
    { length: 4 },
    () => rollSettledDie(rng),
  );

  const settledValues =
    dice.map((die) => die.value);

  const lowest =
    Math.min(...settledValues);

  const droppedIndex =
    settledValues.findIndex(
      (value) => value === lowest,
    );

  const keptValues =
    settledValues.filter(
      (_, index) => index !== droppedIndex,
    );

  return {
    dice,
    settledValues,
    droppedIndex,
    droppedValue:
      settledValues[droppedIndex],
    keptValues,
    total:
      keptValues.reduce(
        (sum, value) => sum + value,
        0,
      ),
  };
}

export function rollAbilitySet(
  rng = Math.random,
) {
  const candidates =
    Array.from(
      { length: 6 },
      () => rollAbilityCandidate(rng),
    );

  const totals =
    candidates.map(
      (candidate) => candidate.total,
    );

  const lowest =
    Math.min(...totals);

  return {
    candidates,
    totals,
    suggestedDumpIndex:
      totals.findIndex(
        (value) => value === lowest,
      ),
  };
}

export function createAbilityRollSession(
  rng = Math.random,
) {
  return {
    rule: ROLLED_ABILITY_RULE,
    sets: [
      rollAbilitySet(rng),
      rollAbilitySet(rng),
    ],
    selectedSetIndex: null,
    dumpIndex: null,
  };
}

function requireSetIndex(
  session,
  setIndex,
) {
  if (
    !session
    || !Array.isArray(session.sets)
    || session.sets.length !== 2
  ) {
    throw new Error(
      "Invalid rolled ability session.",
    );
  }

  if (
    !Number.isInteger(setIndex)
    || setIndex < 0
    || setIndex >= session.sets.length
  ) {
    throw new Error(
      "Rolled ability set index must be 0 or 1.",
    );
  }

  return session.sets[setIndex];
}

export function selectAbilityRollSet(
  session,
  setIndex,
) {
  const selected =
    requireSetIndex(
      session,
      setIndex,
    );

  return {
    ...session,
    selectedSetIndex: setIndex,
    dumpIndex:
      selected.suggestedDumpIndex,
  };
}

export function setAbilityDumpIndex(
  session,
  dumpIndex,
) {
  if (
    !Number.isInteger(
      session?.selectedSetIndex,
    )
  ) {
    throw new Error(
      "Choose a rolled ability set before selecting a dump stat.",
    );
  }

  const selected =
    requireSetIndex(
      session,
      session.selectedSetIndex,
    );

  if (
    !Number.isInteger(dumpIndex)
    || dumpIndex < 0
    || dumpIndex >= selected.totals.length
  ) {
    throw new Error(
      "Dump stat index must reference one of the six rolled values.",
    );
  }

  return {
    ...session,
    dumpIndex,
  };
}

export function selectedRolledValues(
  session,
) {
  if (
    !Number.isInteger(
      session?.selectedSetIndex,
    )
  ) {
    throw new Error(
      "Choose a rolled ability set first.",
    );
  }

  const selected =
    requireSetIndex(
      session,
      session.selectedSetIndex,
    );

  const dumpIndex =
    Number.isInteger(session.dumpIndex)
      ? session.dumpIndex
      : selected.suggestedDumpIndex;

  return selected.totals.map(
    (value, index) =>
      index === dumpIndex
        ? 8
        : value,
  );
}

export function validateRolledAssignment(
  assignment,
) {
  if (
    !assignment
    || typeof assignment !== "object"
    || Array.isArray(assignment)
  ) {
    return false;
  }

  const indices =
    ABILITIES.map(
      (ability) =>
        Number(assignment[ability]),
    );

  return (
    indices.every(
      (index) =>
        Number.isInteger(index)
        && index >= 0
        && index < 6,
    )
    && new Set(indices).size === 6
  );
}

export function assignRolledAbilities(
  session,
  assignment,
) {
  if (
    !validateRolledAssignment(
      assignment,
    )
  ) {
    throw new Error(
      "Rolled ability assignment must use each of the six values exactly once.",
    );
  }

  const values =
    selectedRolledValues(session);

  return Object.fromEntries(
    ABILITIES.map(
      (ability) => [
        ability,
        values[assignment[ability]],
      ],
    ),
  );
}