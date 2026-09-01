import { Copy, Trash, UserSwitch } from "@phosphor-icons/react";
import { useState } from "react";
import { Modal } from "../components/Modal.jsx";
import { CLASS_RULES, totalCharacterLevel } from "../domain/rules.js";

export function CharacterManager({ characters, activeId, onClose, onSelect, onDuplicate, onDelete }) {
  const [pendingDelete, setPendingDelete] = useState("");
  return (
    <Modal title="Manage characters" eyebrow={`${characters.length} local characters`} onClose={onClose} className="manager-modal">
      <div className="manager-list">
        {characters.map((character) => (
          <article key={character.id}>
            <div>
              <strong>{character.name}</strong>
              <span>Level {totalCharacterLevel(character.classLevels)} {character.classLevels.map((entry) => CLASS_RULES[entry.classId]?.name).join(" / ")}</span>
            </div>
            <button className="secondary-action" onClick={() => onSelect(character.id)} disabled={character.id === activeId}><UserSwitch size={16} />{character.id === activeId ? "Active" : "Use"}</button>
            <button className="secondary-action" onClick={() => onDuplicate(character)}><Copy size={16} /> Duplicate</button>
            <button className="danger-action" disabled={characters.length === 1} onClick={() => {
              if (pendingDelete === character.id) { onDelete(character.id); setPendingDelete(""); }
              else setPendingDelete(character.id);
            }}><Trash size={16} /> {pendingDelete === character.id ? "Confirm delete" : "Delete"}</button>
          </article>
        ))}
      </div>
      <footer className="modal-actions"><button className="primary-action" onClick={onClose}>Done</button></footer>
    </Modal>
  );
}
