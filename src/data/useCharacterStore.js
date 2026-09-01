import { useEffect, useMemo, useState } from "react";
import { loadState, saveState } from "./store.js";

export function useCharacterStore() {
  const [state, setState] = useState(() => loadState());
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    try {
      saveState(state);
      setSaveError("");
    } catch (error) {
      setSaveError(error.message || "Changes could not be saved locally.");
    }
  }, [state]);

  const activeCharacter = useMemo(
    () => state.characters.find((character) => character.id === state.activeCharacterId) || state.characters[0],
    [state],
  );

  function updateActive(updater) {
    setState((current) => ({
      ...current,
      characters: current.characters.map((character) => character.id === current.activeCharacterId
        ? { ...(typeof updater === "function" ? updater(character) : { ...character, ...updater }), updatedAt: new Date().toISOString() }
        : character),
    }));
  }

  function addCharacter(character) {
    setState((current) => ({ ...current, characters: [character, ...current.characters], activeCharacterId: character.id }));
  }

  return {
    state,
    setState,
    activeCharacter,
    setActive: (id) => setState((current) => ({ ...current, activeCharacterId: id })),
    updateActive,
    addCharacter,
    saveError,
  };
}
