import { CheckCircle, FileArrowDown, WarningCircle } from "@phosphor-icons/react";
import { Modal } from "../components/Modal.jsx";

export function CharacterImportModal({ candidate, onClose, onConfirm }) {
  const { summary, warnings = [] } = candidate;
  return <Modal title={`Import ${summary.name}`} eyebrow="External character adapter" className="character-import-modal" onClose={onClose}>
    <div className="import-review">
      <section className="import-review-lead"><FileArrowDown size={28} /><div><strong>Ready to become a native character</strong><p>This adds one fully editable character. Arcane Observatory’s own backup and export format remains unchanged.</p></div></section>
      <dl className="import-summary-grid">
        <div><dt>Level and class</dt><dd>Level {summary.level} · {summary.classes}</dd></div>
        <div><dt>Identity</dt><dd>{summary.ancestry} · {summary.background}</dd></div>
        <div><dt>Spells</dt><dd>{summary.spells}</dd></div>
        <div><dt>Inventory</dt><dd>{summary.inventory}</dd></div>
        <div><dt>Imported features</dt><dd>{summary.features}</dd></div>
        <div><dt>Archived notes</dt><dd>{summary.notes}</dd></div>
      </dl>
      <section className="import-safe-boundary"><CheckCircle size={19} weight="fill" /><div><strong>Native calculations stay authoritative</strong><p>Unknown third-party mechanics remain descriptive and cannot register effects or execute rules.</p></div></section>
      {warnings.length > 0 && <section className="import-warning-list" aria-labelledby="import-warning-title"><header><WarningCircle size={19} /><strong id="import-warning-title">Review {warnings.length} import note{warnings.length === 1 ? "" : "s"}</strong></header><ul>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></section>}
    </div>
    <footer className="modal-actions"><button className="secondary-action" onClick={onClose}>Cancel</button><button className="primary-action" onClick={onConfirm}><FileArrowDown size={17} /> Import character</button></footer>
  </Modal>;
}
