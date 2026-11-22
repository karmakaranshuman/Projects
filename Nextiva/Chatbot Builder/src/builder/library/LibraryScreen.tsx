import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Phone } from 'lucide-react';
import { Badge, Button } from '../../design-system';
import { useDismiss } from '../useDismiss';
import { messageGraph, scenarioGraph, welcomeTemplate } from '../scenarios';
import { useBuilder } from '../store';
import bars from './assets/bars.svg';
import facebook from './assets/facebook.png';
import home from './assets/home.svg';
import inboxes from './assets/inboxes.svg';
import instagram from './assets/instagram.svg';
import instagramGlyph from './assets/instagram-glyph.png';
import logo from './assets/logo.svg';
import menu from './assets/menu.svg';
import menuDelete from './assets/menu-delete.svg';
import menuDuplicate from './assets/menu-duplicate.svg';
import menuEdit from './assets/menu-edit.svg';
import messenger from './assets/messenger.png';
import play from './assets/play.svg';
import avatarHeader from './assets/avatar-header.png';
import presence from './assets/presence.svg';
import presenceIcon from './assets/presence-icon.svg';
import search from './assets/search.svg';
import settings from './assets/settings.svg';
import users from './assets/users.svg';
import whatsapp from './assets/whatsapp.png';
import { LISTED_BOTS, type ListedBot, type SourceKind } from './catalog';
import { PresenterBar } from '../PresenterBar';
import { CreateFlow } from './CreateFlow';

function SourceMark({ kind }: { kind: SourceKind }) {
  if (kind === 'facebook') return <img src={facebook} width={22} height={22} alt="" />;
  if (kind === 'whatsapp') {
    return (
      <span className="cb-library__wa">
        <img src={whatsapp} width={14} height={14} alt="" />
      </span>
    );
  }
  if (kind === 'instagram') {
    return (
      <span className="cb-library__ig">
        <img src={instagramGlyph} width={24} height={24} alt="" />
        <img src={instagram} alt="" />
      </span>
    );
  }
  return (
    <span className="cb-library__ms">
      <img src={messenger} width={22} height={22} alt="" />
    </span>
  );
}

type Draft = { title: string; name: string; description: string; direct?: boolean };

const NEW_DRAFT: Draft = {
  title: 'Create new chatbot',
  name: 'Whatsapp welcome bot',
  description:
    'Welcomes visitors to lighthouse.lh, offers contact, a website, and email, then asks for feedback when the chat closes.',
};

export function LibraryScreen() {
  const { libraryCreate, setLibraryCreate, loadScenario, startBot } = useBuilder();
  const [bots, setBots] = useState(LISTED_BOTS);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<ListedBot | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!libraryCreate) return;
    setDraft(NEW_DRAFT);
    setLibraryCreate(false);
  }, [libraryCreate, setLibraryCreate]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bots;
    return bots.filter((bot) => `${bot.name} ${bot.source}`.toLowerCase().includes(q));
  }, [bots, query]);

  const openBot = (id: string) => {
    const bot = bots.find((item) => item.id === id);
    if (!bot) return;
    if (bot.scenario === 'welcome') {
      loadScenario('welcome');
      return;
    }
    startBot(bot.name, messageGraph(bot.name, `Hi, this is ${bot.name}. How can I help?`));
  };

  return (
    <div className="cb-library">
      <header className="cb-library__top">
        <div className="cb-library__brand">
          <img src={logo} alt="Nextiva" />
          <label className="cb-library__global-search">
            <img src={search} alt="" />
            <input placeholder="Search for anything" aria-label="Search for anything" />
          </label>
        </div>
        <PresenterBar />
        <div className="cb-library__top-actions">
          <span className="cb-library__phone" aria-hidden>
            <Phone size={20} />
          </span>
          <span className="cb-library__user">
            <img src={avatarHeader} width={32} height={32} alt="" />
            <span className="cb-library__presence">
              <img src={presence} alt="" />
              <img src={presenceIcon} alt="" />
            </span>
          </span>
        </div>
      </header>
      <div className="cb-library__frame">
        <aside className="cb-library__rail" aria-label="App">
          <div className="cb-library__rail-main">
            <div className="cb-library__rail-group">
              <button type="button" className="cb-library__rail-btn" aria-label="Menu">
                <img src={bars} alt="" />
              </button>
              <span className="cb-library__rail-item">
                <img src={home} alt="" />
              </span>
              <span className="cb-library__rail-item">
                <img src={play} alt="" />
              </span>
              <span className="cb-library__rail-item">
                <img src={users} alt="" />
              </span>
            </div>
            <span className="cb-library__rail-rule" />
            <div className="cb-library__rail-group">
              <span className="cb-library__rail-item">
                <img src={inboxes} alt="" />
              </span>
            </div>
          </div>
          <span className="cb-library__rail-rule is-short" />
          <span className="cb-library__rail-item is-current">
            <img src={settings} alt="" />
          </span>
        </aside>
        <section className="cb-library__page">
          <div className="cb-library__heading">
            <h1>Chatbots</h1>
            <div className="cb-library__toolbar">
              <label className="cb-library__search">
                <img src={search} alt="" />
                <input
                  value={query}
                  placeholder="Search"
                  aria-label="Search"
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <Button onClick={() => setDraft(NEW_DRAFT)}>Create new</Button>
            </div>
          </div>
          <table className="cb-library__table">
            <colgroup>
              <col />
              <col />
              <col />
              <col />
              <col className="is-activated" />
              <col className="is-menu" />
            </colgroup>
            <thead>
              <tr>
                <th>
                  Bot name <ChevronDown className="cb-library__sort" size={12} aria-hidden />
                </th>
                <th>
                  Source <ChevronDown className="cb-library__sort" size={12} aria-hidden />
                </th>
                <th>
                  Created <ChevronDown className="cb-library__sort" size={12} aria-hidden />
                </th>
                <th>
                  Last edited <ChevronDown className="cb-library__sort" size={12} aria-hidden />
                </th>
                <th className="is-activated">Activated</th>
                <th aria-label="More" />
              </tr>
            </thead>
            <tbody>
              {rows.map((bot) => (
                <tr key={bot.id} onClick={() => openBot(bot.id)}>
                  <td>
                    <span className="cb-library__name">
                      {bot.name}
                      {bot.draft && <Badge>Draft</Badge>}
                    </span>
                  </td>
                  <td>
                    <span className="cb-library__source">
                      <SourceMark kind={bot.sourceKind} />
                      {bot.source}
                    </span>
                  </td>
                  <td>
                    <span className="cb-library__when">
                      <img src={bot.createdBy} width={24} height={24} alt="" />
                      {bot.created}
                    </span>
                  </td>
                  <td>
                    <span className="cb-library__when">
                      <img src={bot.editedBy} width={24} height={24} alt="" />
                      {bot.edited}
                    </span>
                  </td>
                  <td className="is-activated">
                    <span className="cb-library__activated">{bot.activated ? 'Yes' : 'No'}</span>
                  </td>
                  <td className="is-menu">
                    <BotMenu
                      bot={bot}
                      onDuplicate={() =>
                        setDraft({ title: 'Create duplicate chatbot', name: bot.name, description: '', direct: true })
                      }
                      onEdit={() => openBot(bot.id)}
                      onDelete={() => setDeleting(bot)}
                    />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr className="is-empty">
                  <td colSpan={6}>No chatbots match that search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
      {draft && (
        <CreateFlow
          key={`${draft.title}:${draft.name}`}
          title={draft.title}
          initialName={draft.name}
          initialDescription={draft.description}
          direct={draft.direct}
          onClose={() => setDraft(null)}
          onStart={(title, empty) =>
            startBot(title, empty ? scenarioGraph('blank') : welcomeTemplate(), empty ? undefined : { arrange: true })
          }
        />
      )}
      {deleting && (
        <DeleteChatbot
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            setBots((current) => current.filter((bot) => bot.id !== deleting.id));
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}

function BotMenu({
  bot,
  onDuplicate,
  onEdit,
  onDelete,
}: {
  bot: ListedBot;
  onDuplicate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useDismiss(wrap, open, () => setOpen(false));

  useEffect(() => {
    const row = wrap.current?.closest('tr');
    row?.classList.toggle('is-menu-open', open);
    return () => row?.classList.remove('is-menu-open');
  }, [open]);

  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div className="cb-library__menu-wrap" ref={wrap}>
      <button
        type="button"
        className="cb-library__more"
        aria-label={`More actions for ${bot.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          if (open) {
            setOpen(false);
            return;
          }
          const rect = e.currentTarget.getBoundingClientRect();
          setDropUp(window.innerHeight - rect.bottom < 152);
          setOpen(true);
        }}
      >
        <img src={menu} alt="" />
      </button>
      {open && (
        <div className={`ds-menu cb-library__menu${dropUp ? ' is-up' : ''}`} role="menu" aria-label={`More actions for ${bot.name}`}>
          <button type="button" role="menuitem" className="ds-menu__item" onClick={(e) => { e.stopPropagation(); choose(onDuplicate); }}>
            <span className="ds-menu__icon">
              <img src={menuDuplicate} alt="" />
            </span>
            <span className="ds-menu__label">Duplicate</span>
          </button>
          <button type="button" role="menuitem" className="ds-menu__item" onClick={(e) => { e.stopPropagation(); choose(onEdit); }}>
            <span className="ds-menu__icon">
              <img src={menuEdit} alt="" />
            </span>
            <span className="ds-menu__label">Edit chat flow</span>
          </button>
          <button type="button" role="menuitem" className="ds-menu__item is-danger" onClick={(e) => { e.stopPropagation(); choose(onDelete); }}>
            <span className="ds-menu__icon">
              <img src={menuDelete} alt="" />
            </span>
            <span className="ds-menu__label">Delete chatbot</span>
          </button>
        </div>
      )}
    </div>
  );
}

function DeleteChatbot({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = 'cb-delete-bot-title';
  const bodyId = 'cb-delete-bot-body';

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  return (
    <div
      className="cb-scrim cb-scrim--confirm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="cb-modal cb-modal--confirm" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId}>
        <h2 id={titleId} className="cb-modal__title">
          Delete chatbot
        </h2>
        <p id={bodyId} className="cb-modal__copy">
          Are you sure you want to delete this chat? Chat flow and all saved data will be deleted permanently.
        </p>
        <div className="cb-modal__actions">
          <Button ref={cancelRef} variant="neutral" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
