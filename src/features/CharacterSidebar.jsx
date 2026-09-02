import { Archive, Books, CompassRose, DownloadSimple, MagnifyingGlass, Plus, UploadSimple } from "@phosphor-icons/react";
import { totalCharacterLevel, CLASS_RULES } from "../domain/rules.js";
import { resolveCharacterPortrait } from "../domain/portraits.js";

export function CharacterSidebar({ characters, activeId, onSelect, onNew, onManage, onManageContent, onExport, onImport, avatarMap, avatarFallback, compact, onClose }) {
  return (
    <aside className={`character-sidebar glass-panel material-floating ${compact ? "compact" : ""}`}>
      <div className="brand-lockup">
        <div className="brand-mark"><CompassRose size={28} /></div>
        <div><strong>Arcane Observatory</strong><small>Local-first · 5e 2014</small></div>
      </div>
      <div className="sidebar-heading"><span>Characters</span><small>{characters.length} saved</small></div>
      <button className="new-character" onClick={onNew}><Plus size={18} /> New character</button>
      <label className="sidebar-search"><MagnifyingGlass size={16} /><input placeholder="Find a character" /></label>
      <div className="character-list">
        {characters.map((character) => {
          const className = character.classLevels.map((entry) => CLASS_RULES[entry.classId]?.name).join(" / ");
          return (
            <button key={character.id} className={`character-card ${activeId === character.id ? "selected" : ""}`} onClick={() => { onSelect(character.id); onClose?.(); }}>
              <img src={resolveCharacterPortrait(character, avatarMap, avatarFallback)} alt="" />
              <span><strong>{character.name}</strong><small>Level {totalCharacterLevel(character.classLevels)} {className}</small></span>
            </button>
          );
        })}
      </div>
      <div className="sidebar-spacer" />
      <button className="manage-button" onClick={onManage}><Archive size={18} /> Manage characters</button>
      <button className="manage-button" onClick={onManageContent}><Books size={18} /> Manage content</button>
      <div className="local-status"><span className="status-dot" /> All changes saved locally</div>
      <div className="data-actions">
        <button onClick={onExport}><DownloadSimple size={16} /> Export</button>
        <label><UploadSimple size={16} /> Import<input type="file" accept=".json,.cah,application/json" onChange={onImport} /></label>
      </div>
    </aside>
  );
}
