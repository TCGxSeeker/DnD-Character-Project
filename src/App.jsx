import {
  Backpack, BookOpen, ClockCounterClockwise, DownloadSimple, List, NotePencil,
  Scroll, Sparkle, UserCircle, X,
} from "@phosphor-icons/react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { CharacterSidebar } from "./features/CharacterSidebar.jsx";
import { CharacterImportModal } from "./features/CharacterImportModal.jsx";
import { resolveCharacterPortrait } from "./domain/portraits.js";
import { exportState } from "./data/store.js";
import { prepareCharacterImport } from "./importers/characterImport.js";
import { useCharacterStore } from "./data/useCharacterStore.js";
import { useContentStore } from "./data/useContentStore.js";
import { totalCharacterLevel } from "./domain/rules.js";
import vaelithra from "./assets/vaelithra.png";
import borin from "./assets/borin.png";
import lysandra from "./assets/lysandra.png";
import thamior from "./assets/thamior.png";

const avatarMap = { vaelithra, borin, lysandra, thamior };

const SheetView = lazy(() => import("./features/SheetView.jsx").then((module) => ({ default: module.SheetView })));
const SpellsView = lazy(() => import("./features/SpellsView.jsx").then((module) => ({ default: module.SpellsView })));
const InventoryView = lazy(() => import("./features/InventoryView.jsx").then((module) => ({ default: module.InventoryView })));
const FeaturesView = lazy(() => import("./features/DetailsViews.jsx").then((module) => ({ default: module.FeaturesView })));
const NotesView = lazy(() => import("./features/DetailsViews.jsx").then((module) => ({ default: module.NotesView })));
const HistoryView = lazy(() => import("./features/DetailsViews.jsx").then((module) => ({ default: module.HistoryView })));
const CharacterCreator = lazy(() => import("./features/CharacterCreator.jsx").then((module) => ({ default: module.CharacterCreator })));
const LevelUpWizard = lazy(() => import("./features/LevelUpWizard.jsx").then((module) => ({ default: module.LevelUpWizard })));
const CharacterManager = lazy(() => import("./features/CharacterManager.jsx").then((module) => ({ default: module.CharacterManager })));
const ContentManager = lazy(() => import("./features/ContentManager.jsx").then((module) => ({ default: module.ContentManager })));

function ViewFallback() {
  return <div className="view-fallback glass-panel material-primary" role="status"><Sparkle size={22} /><span>Opening character records…</span></div>;
}

const tabs = [
  { id: "sheet", label: "Sheet", icon: UserCircle },
  { id: "spells", label: "Spells", icon: BookOpen },
  { id: "inventory", label: "Inventory", icon: Backpack },
  { id: "features", label: "Features", icon: Sparkle },
  { id: "notes", label: "Notes", icon: NotePencil },
  { id: "history", label: "History", icon: ClockCounterClockwise },
];

export function App() {
  const { state, setState, activeCharacter, setActive, updateActive, addCharacter, saveError } = useCharacterStore();
  const {
    ready: contentReady,
    storageError: contentStorageError,
    installedPacks,
    activePacks,
    installPack,
    removePack,
    setPackEnabled,
  } = useContentStore();
  const [activeTab, setActiveTab] = useState("sheet");
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [levelUpOpen, setLevelUpOpen] = useState(false);
  const [creationTargetLevel, setCreationTargetLevel] = useState(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [contentManagerOpen, setContentManagerOpen] = useState(false);
  const [importCandidate, setImportCandidate] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [installEvent, setInstallEvent] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    const captureInstall = (event) => { event.preventDefault(); setInstallEvent(event); };
    window.addEventListener("beforeinstallprompt", captureInstall);
    return () => window.removeEventListener("beforeinstallprompt", captureInstall);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  useEffect(() => {
    if (!creationTargetLevel || creatorOpen || levelUpOpen || !activeCharacter) return;
    const currentLevel = totalCharacterLevel(activeCharacter.classLevels);
    if (currentLevel >= creationTargetLevel) {
      setCreationTargetLevel(null);
      notify(`${activeCharacter.name} reached the selected starting level.`);
      return;
    }
    setLevelUpOpen(true);
  }, [creationTargetLevel, creatorOpen, levelUpOpen, activeCharacter]);

  function notify(message) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2800);
  }

  function handleExport() {
    const blob = new Blob([exportState(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `arcane-observatory-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    notify("Character library exported.");
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error("Import files must be 20 MB or smaller.");
      const prepared = prepareCharacterImport({ fileName: file.name, text: await file.text() });
      if (prepared.kind === "native-backup") {
        setState(prepared.state);
        notify("Character library restored from the native backup.");
      } else {
        setImportCandidate(prepared);
      }
    } catch (error) {
      notify(error.message || "That backup could not be imported.");
    } finally {
      event.target.value = "";
    }
  }

  async function installApp() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  function duplicateCharacter(character) {
    const now = new Date().toISOString();
    const copy = structuredClone(character);
    copy.id = `${character.id}-copy-${Date.now()}`;
    copy.name = `${character.name} (Copy)`;
    copy.createdAt = now;
    copy.updatedAt = now;
    copy.history = [{ id: `duplicated-${Date.now()}`, type: "duplicated", title: "Character duplicated", detail: `Copied from ${character.name}`, createdAt: now }, ...copy.history];
    addCharacter(copy);
    notify(`${copy.name} created.`);
  }

  function deleteCharacter(id) {
    setState((current) => {
      const characters = current.characters.filter((character) => character.id !== id);
      return { ...current, characters, activeCharacterId: current.activeCharacterId === id ? characters[0].id : current.activeCharacterId };
    });
    notify("Character deleted from this device.");
  }

  const content = useMemo(() => {
    if (!activeCharacter) return null;
    const common = { character: activeCharacter, updateCharacter: updateActive };
    if (activeTab === "spells") return <SpellsView {...common} />;
    if (activeTab === "inventory") return <InventoryView {...common} />;
    if (activeTab === "features") return <FeaturesView {...common} />;
    if (activeTab === "notes") return <NotesView {...common} />;
    if (activeTab === "history") return <HistoryView character={activeCharacter} />;
    return <SheetView {...common} avatar={resolveCharacterPortrait(activeCharacter, avatarMap, vaelithra)} avatarMap={avatarMap} onLevelUp={() => setLevelUpOpen(true)} />;
  }, [activeCharacter, activeTab]);

  return (
    <div className="app-shell">
      <div className={`mobile-scrim ${sidebarOpen ? "visible" : ""}`} onClick={() => setSidebarOpen(false)} />
      <div className={`sidebar-wrap ${sidebarOpen ? "open" : ""}`}>
        <button className="mobile-sidebar-close icon-button" onClick={() => setSidebarOpen(false)} aria-label="Close character list"><X size={20} /></button>
        <CharacterSidebar characters={state.characters} activeId={state.activeCharacterId} onSelect={setActive} onNew={() => setCreatorOpen(true)} onManage={() => setManagerOpen(true)} onManageContent={() => setContentManagerOpen(true)} onExport={handleExport} onImport={handleImport} avatarMap={avatarMap} avatarFallback={vaelithra} compact onClose={() => setSidebarOpen(false)} />
      </div>

      <main className="main-stage">
        <header className="top-bar glass-panel material-floating">
          <button className="mobile-menu icon-button" onClick={() => setSidebarOpen(true)} aria-label="Open character list"><List size={22} /></button>
          <nav aria-label="Character sections">
            {tabs.map(({ id, label, icon: Icon }) => <button key={id} className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)} aria-label={label}><Icon size={18} /><span>{label}</span></button>)}
          </nav>
          <div className="top-actions">
            {installEvent && <button className="install-button" onClick={installApp}><DownloadSimple size={17} /> Install app</button>}
            <span className="ruleset-chip"><Scroll size={16} /> 5e 2014</span>
          </div>
        </header>
        <div className="content-stage"><Suspense fallback={<ViewFallback />}>{content}</Suspense></div>
      </main>

      {(toast || saveError) && <div className={`toast ${saveError ? "error" : ""}`}>{saveError || toast}</div>}
      <Suspense fallback={null}>
        {importCandidate && <CharacterImportModal candidate={importCandidate} onClose={() => setImportCandidate(null)} onConfirm={() => { addCharacter(importCandidate.character); setImportCandidate(null); setActiveTab("sheet"); setSidebarOpen(false); notify(`${importCandidate.character.name} imported as a native character.`); }} />}
        {creatorOpen && <CharacterCreator activePacks={activePacks} onClose={() => setCreatorOpen(false)} onCreate={(character, targetLevel) => { addCharacter(character); setActiveTab("sheet"); setCreationTargetLevel(targetLevel > 1 ? targetLevel : null); notify(targetLevel > 1 ? `${character.name} created at level 1. Guided progression is starting.` : `${character.name} created.`); }} />}
        {managerOpen && <CharacterManager characters={state.characters} activeId={state.activeCharacterId} onClose={() => setManagerOpen(false)} onSelect={(id) => { setActive(id); notify("Active character changed."); }} onDuplicate={duplicateCharacter} onDelete={deleteCharacter} />}
        {contentManagerOpen && (
          <ContentManager
            ready={contentReady}
            storageError={contentStorageError}
            installedPacks={installedPacks}
            onInstall={(pack) => {
              installPack(pack);
              notify(`${pack.pack.name} installed locally.`);
            }}
            onRemove={(packId) => {
              removePack(packId);
            }}
            onSetEnabled={setPackEnabled}
            onClose={() => setContentManagerOpen(false)}
          />
        )}
        {levelUpOpen && activeCharacter && <LevelUpWizard character={activeCharacter} targetLevel={creationTargetLevel} activePacks={activePacks} onClose={(result) => { setLevelUpOpen(false); if (!result?.committed && creationTargetLevel) { setCreationTargetLevel(null); notify(`Guided starting-level progression paused at level ${totalCharacterLevel(activeCharacter.classLevels)}.`); } }} onCommit={(character) => { updateActive(character); notify(creationTargetLevel && totalCharacterLevel(character.classLevels) < creationTargetLevel ? `${character.name} advanced. Preparing the next level.` : `${character.name} advanced successfully.`); }} />}
      </Suspense>
    </div>
  );
}
