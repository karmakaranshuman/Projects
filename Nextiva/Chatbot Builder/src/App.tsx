import { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Toast } from './design-system';
import { Canvas } from './builder/Canvas';
import { DeleteConfirm } from './builder/DeleteConfirm';
import { Header } from './builder/Header';
import { LibraryScreen } from './builder/library/LibraryScreen';
import { LeftPanel } from './builder/LeftPanel';
import { RightMenu } from './builder/right/RightMenu';
import { SCENARIOS, type ScenarioId } from './builder/scenarios';
import { BuilderProvider, useBuilder } from './builder/store';

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable));
}

function Shell() {
  const { undo, redo, loadScenario, restartScenario, scenario, screen, libraryKey, openLibrary, toast, showToast, deleteConfirm } = useBuilder();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (deleteConfirm || screen === 'library' || isTyping(e.target) || document.querySelector('[aria-modal="true"]')) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (!mod && !e.altKey && e.key.toLowerCase() === 'r') {
        restartScenario();
      } else if (!mod && !e.altKey && /^[1-9]$/.test(e.key)) {
        const s = SCENARIOS[Number(e.key) - 1];
        if (s) loadScenario(s.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, loadScenario, restartScenario, scenario, deleteConfirm, screen]);

  useEffect(() => {
    const hash = screen === 'library' ? 'library' : scenario;
    window.history.replaceState(null, '', `#${hash}`);
  }, [screen, scenario]);

  useEffect(() => {
    const onHash = () => {
      const id = window.location.hash.slice(1);
      if (id === 'library' || id === 'blank' || id === '') openLibrary();
      else if (id === 'welcome' || id === 'messy') loadScenario(id);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [loadScenario, openLibrary]);

  if (screen === 'library') {
    return (
      <div className="cb-app">
        <LibraryScreen key={libraryKey} />
        <Toast message={toast} onDismiss={() => showToast(null)} />
      </div>
    );
  }

  return (
    <div className="cb-app">
      <Header />
      <main className="cb-main">
        <Canvas />
        <LeftPanel />
        <RightMenu />
      </main>
      <Toast message={toast} onDismiss={() => showToast(null)} />
      <DeleteConfirm />
    </div>
  );
}

function initialRoute(): { scenario: ScenarioId; create: boolean } {
  const id = window.location.hash.slice(1);
  if (id === 'welcome' || id === 'messy') return { scenario: id, create: false };
  return { scenario: 'blank', create: false };
}

export default function App() {
  return (
    <ReactFlowProvider>
      <BuilderProvider initialScenario={initialRoute().scenario} initialCreate={initialRoute().create}>
        <Shell />
      </BuilderProvider>
    </ReactFlowProvider>
  );
}
