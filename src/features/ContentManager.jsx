import {
  BookOpen,
  Power,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { Modal } from "../components/Modal.jsx";
import { parseContentPack } from "../importers/content/contentPack.js";

export function ContentManager({
  ready,
  storageError,
  installedPacks,
  onInstall,
  onRemove,
  onSetEnabled,
  onClose,
}) {
  const [message, setMessage] = useState("");
  const [pendingRemove, setPendingRemove] = useState("");
  const fileInput = useRef(null);

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (!ready) {
        throw new Error("Local content is still loading.");
      }

      if (file.size > 20 * 1024 * 1024) {
        throw new Error("Content pack files must be 20 MB or smaller.");
      }

      const pack = parseContentPack(await file.text());
      onInstall(pack);

      setMessage(`${pack.pack.name} installed.`);
      setPendingRemove("");
    } catch (error) {
      setMessage(error?.message || "That content pack could not be imported.");
    } finally {
      event.target.value = "";
    }
  }

  function handleRemove(packId, name) {
    if (pendingRemove !== packId) {
      setPendingRemove(packId);
      setMessage(`Select remove again to uninstall ${name}.`);
      return;
    }

    onRemove(packId);
    setPendingRemove("");
    setMessage(`${name} removed.`);
  }

  return (
    <Modal
      title="Manage content"
      eyebrow={`${installedPacks.length} local content ${installedPacks.length === 1 ? "pack" : "packs"}`}
      onClose={onClose}
      className="manager-modal"
    >
      <div className="manager-list">
        <article>
          <div>
            <strong>Local content packs</strong>
            <span>
              Import optional 5e 2014 rules without changing Arcane Observatory's built-in catalog.
            </span>
          </div>

          <button
            className="secondary-action"
            disabled={!ready}
            onClick={() => fileInput.current?.click()}
          >
            <UploadSimple size={16} />
            {ready ? "Import pack" : "Loading…"}
          </button>

          <input
            ref={fileInput}
            type="file"
            accept=".json,.ao-content.json,application/json"
            onChange={handleImport}
            hidden
          />
        </article>

        {installedPacks.length === 0 && (
          <article>
            <div>
              <strong>No content packs installed</strong>
              <span>
                Built-in Arcane Observatory content remains available normally.
              </span>
            </div>
          </article>
        )}

        {installedPacks.map((pack) => (
          <article key={pack.packId}>
            <div>
              <strong>{pack.name}</strong>
              <span>
                {pack.version} · {pack.ruleset} · {pack.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>

            <button
              className="secondary-action"
              onClick={() => {
                onSetEnabled(pack.packId, !pack.enabled);
                setPendingRemove("");
                setMessage(
                  `${pack.name} ${pack.enabled ? "disabled" : "enabled"}.`,
                );
              }}
            >
              <Power size={16} />
              {pack.enabled ? "Disable" : "Enable"}
            </button>

            <button
              className="danger-action"
              onClick={() => handleRemove(pack.packId, pack.name)}
            >
              <Trash size={16} />
              {pendingRemove === pack.packId ? "Confirm remove" : "Remove"}
            </button>
          </article>
        ))}
      </div>

      {(storageError || message) && (
        <div role="status">
          <BookOpen size={16} />
          <span>{storageError || message}</span>
        </div>
      )}

      <footer className="modal-actions">
        <button className="primary-action" onClick={onClose}>
          Done
        </button>
      </footer>
    </Modal>
  );
}