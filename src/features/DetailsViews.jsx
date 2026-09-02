import { BookOpenText, CalendarBlank, CheckCircle, ClockCounterClockwise, FloppyDisk, MagnifyingGlass, NotePencil, Sparkle } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { getCharacterFeatures } from "../domain/grantedContent.js";
import { historyChangeGroups } from "../domain/history.js";
import { NOTE_FIELDS, saveSessionNote, searchCharacterNotes } from "../domain/notes.js";
import { calculateCharacterGraph } from "../domain/calculationGraph.js";
import { Modal } from "../components/Modal.jsx";
import { FeatureEditorView } from "./FeatureEditorView.jsx";

const localDateValue = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60_000;
  return new Date(today.getTime() - offset).toISOString().slice(0, 10);
};

const displaySessionDate = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date(`${value}T12:00:00`)) : "Date not recorded";

function SharedFeatureSummary({ character }) {
  const shared = calculateCharacterGraph(character).sharedFeatures;
  const resolved = [
    shared.extraAttack.value > 1 && { id: "extra", label: "Attack action", value: `${shared.extraAttack.value} attacks`, detail: shared.extraAttack.formula, sources: shared.extraAttack.sources },
    shared.unarmoredDefense.value && { id: "defense", label: "Unarmored Defense", value: shared.unarmoredDefense.value, detail: shared.unarmoredDefense.formula, sources: shared.unarmoredDefense.sources },
    shared.channelDivinity.value > 0 && { id: "channel", label: "Channel Divinity", value: `${shared.channelDivinity.current}/${shared.channelDivinity.value} uses`, detail: shared.channelDivinity.formula, sources: shared.channelDivinity.sources.map((entry) => `${entry.name} · ${entry.source}`) },
  ].filter(Boolean);
  if (!resolved.length) return null;
  return <section className="shared-feature-summary glass-panel material-primary" aria-label="Resolved shared feature rules"><header><div><p className="section-kicker">Multiclass resolution</p><h2>Shared feature rules</h2></div><span>Highest or first eligible rule applies</span></header><div>{resolved.map((entry) => <article key={entry.id}><small>{entry.label}</small><strong>{entry.value}</strong><p>{entry.detail}</p>{entry.sources.length > 0 && <span>{entry.sources.join(" · ")}</span>}</article>)}</div></section>;
}

export function FeaturesView({
  character,
  updateCharacter,
}) {
  return (
    <div className="features-view-stack">
      <FeatureEditorView
        character={character}
        updateCharacter={updateCharacter}
      />

      <SharedFeatureSummary
        character={character}
      />
    </div>
  );
}

export function NotesView({ character, updateCharacter }) {
  const [query, setQuery] = useState("");
  const [sessionDate, setSessionDate] = useState(localDateValue);
  const [selectedSession, setSelectedSession] = useState(null);
  const [saved, setSaved] = useState(false);
  const results = useMemo(() => searchCharacterNotes(character, query), [character, query]);
  const saveDraft = () => {
    updateCharacter(saveSessionNote(character, { text: character.notes, sessionDate }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };
  return <div className="simple-view"><header className="view-header"><div><p className="eyebrow">Story and memory</p><h1>Notes</h1><span>Profile notes save as you type · session recaps are archived by date</span></div><NotePencil size={34} /></header><section className="glass-panel material-primary notes-grid"><div className="notes-search wide"><MagnifyingGlass size={18} /><input aria-label="Search this character's notes" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search session recaps, traits, ideals, bonds, and flaws" />{query.trim() && <span>{results.length ? results.map((result) => `${result.label} (${result.count})`).join(" · ") : "No matches"}</span>}</div><section className="session-composer wide" aria-labelledby="session-composer-title"><div className="session-composer-heading"><div><p className="section-kicker">New recap</p><h2 id="session-composer-title">Session notes</h2></div><label><span>Session date</span><input type="date" value={sessionDate} onChange={(event) => setSessionDate(event.target.value)} /></label></div><textarea aria-label="New session notes" value={character.notes || ""} onChange={(event) => { setSaved(false); updateCharacter({ ...character, notes: event.target.value }); }} placeholder="What happened, what changed, and what should you remember next time?" /><div className="session-save-row"><small>The draft remains local until you save it to the session archive.</small><button className="primary-action" disabled={!String(character.notes || "").trim() || !sessionDate} onClick={saveDraft}>{saved ? <CheckCircle size={18} weight="fill" /> : <FloppyDisk size={18} />}{saved ? "Session saved" : "Save session"}</button></div></section>{NOTE_FIELDS.map(([key, label]) => <label key={key}><span>{label}</span><textarea value={character[key] || ""} onChange={(event) => updateCharacter({ ...character, [key]: event.target.value })} placeholder={`Add ${label.toLowerCase()}…`} /></label>)}<section className="session-library wide" aria-labelledby="session-library-title"><header><div><p className="section-kicker">Previous adventures</p><h2 id="session-library-title">Session archive</h2></div><span>{character.sessionEntries?.length || 0} saved</span></header>{character.sessionEntries?.length ? <div className="session-card-list">{character.sessionEntries.map((entry) => <button key={entry.id} onClick={() => setSelectedSession(entry)}><CalendarBlank size={19} /><span><strong>{displaySessionDate(entry.sessionDate)}</strong><small>{entry.text}</small></span><BookOpenText size={18} /></button>)}</div> : <div className="session-empty"><BookOpenText size={26} /><div><strong>No saved sessions yet</strong><span>Write a recap above and save it to build your campaign memory.</span></div></div>}</section></section>{selectedSession && <Modal title={displaySessionDate(selectedSession.sessionDate)} eyebrow="Session recap" className="session-note-modal" onClose={() => setSelectedSession(null)}><article className="session-note-reading"><CalendarBlank size={24} /><p>{selectedSession.text}</p><small>Saved {selectedSession.createdAt ? new Date(selectedSession.createdAt).toLocaleString() : "locally"}</small></article><footer className="modal-actions"><button className="primary-action" onClick={() => setSelectedSession(null)}>Done</button></footer></Modal>}</div>;
}

export function HistoryView({ character }) {
  return <div className="simple-view"><header className="view-header"><div><p className="eyebrow">Auditable changes</p><h1>History</h1><span>Progression and library changes for {character.name}</span></div><ClockCounterClockwise size={34} /></header><section className="glass-panel material-primary history-list">{character.history.length ? character.history.map((event) => {
    const groups = historyChangeGroups(event);
    return <article key={event.id}><Sparkle className="timeline-icon" size={13} weight="fill" /><time>{new Date(event.createdAt).toLocaleDateString()}</time><div><h2>{event.title}</h2>{event.detail && <p>{event.detail}</p>}{event.note && <blockquote className="history-story-note"><span>Story note</span>{event.note}</blockquote>}{groups.length > 0 && <dl className="history-change-groups">{groups.map((group) => <div key={group.key}><dt>{group.label}</dt><dd>{group.values.join(" · ")}</dd></div>)}</dl>}</div></article>;
  }) : <div className="empty-state"><ClockCounterClockwise size={32} /><h2>No history yet</h2><p>Committed level-ups and important edits will appear here.</p></div>}</section></div>;
}
