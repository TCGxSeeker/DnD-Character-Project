import { Check, ImageSquare, UploadSimple } from "@phosphor-icons/react";
import { useState } from "react";
import { Modal } from "../components/Modal.jsx";
import { portraitPatch, preparePortraitFile, resolveCharacterPortrait } from "../domain/portraits.js";

const LABELS = { vaelithra: "Moonlit wanderer", borin: "Stone guardian", lysandra: "Iron cleric", thamior: "Duskwrought mage" };

export function PortraitEditor({ character, avatarMap, fallback, onSave, onClose }) {
  const [selectedAvatar, setSelectedAvatar] = useState(character.avatar || Object.keys(avatarMap)[0]);
  const [uploaded, setUploaded] = useState(character.portraitDataUrl || "");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const preview = resolveCharacterPortrait({ avatar: selectedAvatar, portraitDataUrl: uploaded }, avatarMap, fallback);

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setWorking(true); setError("");
    try { setUploaded(await preparePortraitFile(file)); }
    catch (uploadError) { setError(uploadError.message); }
    finally { setWorking(false); event.target.value = ""; }
  }

  return <Modal title="Character portrait" eyebrow="Identity artwork" onClose={onClose} className="portrait-modal">
    <div className="portrait-editor">
      <div className="portrait-preview"><img src={preview} alt={`${character.name} portrait preview`} /></div>
      <div className="portrait-options">
        <div><h3>Observatory portraits</h3><p>Choose one of the original character artworks.</p></div>
        <div className="portrait-preset-grid">{Object.entries(avatarMap).map(([id, src]) => <button key={id} className={!uploaded && selectedAvatar === id ? "selected" : ""} onClick={() => { setSelectedAvatar(id); setUploaded(""); }} aria-pressed={!uploaded && selectedAvatar === id}><img src={src} alt="" /><span>{LABELS[id] || id}</span>{!uploaded && selectedAvatar === id && <Check weight="bold" />}</button>)}</div>
        <label className="portrait-upload"><UploadSimple size={20} /><span><strong>{working ? "Preparing image…" : "Upload your own image"}</strong><small>PNG, JPEG, or WebP · center-cropped locally</small></span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} disabled={working} /></label>
        {error && <p className="portrait-error" role="alert">{error}</p>}
      </div>
    </div>
    <footer className="modal-footer"><button className="secondary-action" onClick={onClose}>Cancel</button><button className="primary-action" disabled={working} onClick={() => onSave(portraitPatch({ avatar: selectedAvatar, portraitDataUrl: uploaded }))}><ImageSquare size={18} /> Save portrait</button></footer>
  </Modal>;
}
