import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { Badge, Button, cx, IconButton, MaskIcon, TextArea, TextField } from '../../design-system';
import checkCircle from './assets/check-circle.svg';
import circleCheck from './assets/circle-check.svg';
import mailIcon from './assets/mail.svg';
import phoneIcon from './assets/phone.svg';
import smsIcon from './assets/sms.svg';
import whatsappMark from './assets/whatsapp-mark.png';
import chatIcon from './assets/detail/chat.svg';
import flowPreview from './assets/detail/flow-preview.png';
import sendIcon from './assets/detail/send.svg';
import zoomIn from './assets/detail/zoom-in.svg';
import zoomOut from './assets/detail/zoom-out.svg';
import { INDUSTRIES, TEMPLATES, type BotTemplate, type Industry } from './catalog';

type ChannelId = 'sms' | 'email' | 'whatsapp' | 'livechat';
type Step = 'form' | 'templates' | 'detail';

/** The welcome flow already on the canvas: its name and what that flow actually does. */
const WELCOME_BOT_NAME = 'Whatsapp welcome bot';
const WELCOME_BOT_DESCRIPTION =
  'Welcomes visitors to lighthouse.lh, offers contact, a website, and email, then asks for feedback when the chat closes.';

const CHANNELS: Array<{ id: ChannelId; label: string; tone: string; icon: string }> = [
  { id: 'sms', label: 'Route incoming text messages', tone: 'sms', icon: smsIcon },
  { id: 'email', label: 'I want to personalize email responses', tone: 'email', icon: mailIcon },
  { id: 'whatsapp', label: 'I want to manage whatsapp conversations', tone: 'whatsapp', icon: whatsappMark },
  { id: 'livechat', label: 'I want to streamline live chat interactions', tone: 'chat', icon: phoneIcon },
];

export function CreateFlow({
  onClose,
  onStart,
  onAddTemplate,
  title = 'Create new chatbot',
  initialName = WELCOME_BOT_NAME,
  initialDescription = WELCOME_BOT_DESCRIPTION,
  direct = false,
}: {
  onClose: () => void;
  onStart?: (title: string, empty: boolean) => void;
  /** Builder mode: opens on the template gallery and hands the chosen template back to the open canvas. */
  onAddTemplate?: (template: BotTemplate) => void;
  title?: string;
  initialName?: string;
  initialDescription?: string;
  /** Duplicate skips the template gallery and opens the canvas from this form. */
  direct?: boolean;
}) {
  const [step, setStep] = useState<Step>(onAddTemplate ? 'templates' : 'form');
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [channels, setChannels] = useState<ChannelId[]>(['whatsapp']);
  const [ai, setAi] = useState(true);
  const [nameError, setNameError] = useState(false);
  const [channelError, setChannelError] = useState(false);
  const [industry, setIndustry] = useState<(typeof INDUSTRIES)[number]>('All industries');
  const [query, setQuery] = useState('');
  const [template, setTemplate] = useState<BotTemplate | null>(null);
  const [zoom, setZoom] = useState(1);

  const ready = () => {
    if (!name.trim()) {
      setNameError(true);
      setStep('form');
      return false;
    }
    if (!channels.length) {
      setChannelError(true);
      setStep('form');
      return false;
    }
    return true;
  };

  const startScratch = (empty: boolean) => {
    if (!ready()) return;
    onStart?.(name.trim(), empty);
  };

  const useTemplate = () => {
    if (!template) return;
    if (onAddTemplate) {
      onAddTemplate(template);
      onClose();
      return;
    }
    if (!ready()) return;
    onStart?.(name.trim(), false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TEMPLATES.filter((item) => {
      if (industry !== 'All industries' && item.industry !== industry) return false;
      if (!q) return true;
      return `${item.title} ${item.description} ${item.industry} ${item.channel}`.toLowerCase().includes(q);
    });
  }, [industry, query]);

  return (
    <div
      className="cb-scrim cb-scrim--confirm"
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        onClose();
      }}
    >
      {step === 'form' ? (
        <FormStep
          title={title}
          name={name}
          description={description}
          channels={channels}
          ai={ai}
          nameError={nameError}
          channelError={channelError}
          onName={(value) => {
            setName(value);
            if (value.trim()) setNameError(false);
          }}
          onDescription={setDescription}
          onToggleChannel={(id) =>
            setChannels((current) => {
              const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
              if (next.length) setChannelError(false);
              return next;
            })
          }
          onAi={setAi}
          onClose={onClose}
          onScratch={() => startScratch(true)}
          onTemplates={
            direct
              ? undefined
              : () => {
                  if (ready()) setStep('templates');
                }
          }
        />
      ) : step === 'templates' ? (
        <div className="cb-modal cb-tpl" role="dialog" aria-modal="true" aria-labelledby="cb-tpl-title">
          <header className="cb-create__head">
            <h2 id="cb-tpl-title" className="cb-modal__title">
              Chatbot templates
            </h2>
            <IconButton label="Close" size={32} icon={<X size={18} />} onClick={onClose} />
          </header>
          <div className="cb-tpl__body">
            <div className="cb-tpl__bar">
              <IndustryMenu value={industry} onChange={setIndustry} />
              <TextField
                aria-label="Search templates"
                placeholder="Search templates"
                value={query}
                leading={<Search size={14} />}
                onChange={(e) => setQuery(e.target.value)}
                fieldClassName="cb-tpl__search"
              />
            </div>
            <div className="cb-tpl__grid">
              {visible.length ? (
                visible.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="cb-tpl-card"
                    onClick={() => {
                      setTemplate(item);
                      setZoom(1);
                      setStep('detail');
                    }}
                  >
                    <span className="cb-tpl-card__tags">
                      <Badge>{item.industry}</Badge>
                      <Badge>{item.channel}</Badge>
                    </span>
                    <span className="cb-tpl-card__art">
                      <span className={cx('cb-tpl-card__photo', item.shift && 'is-shift')}>
                        <img src={item.image} alt="" />
                      </span>
                    </span>
                    <span className="cb-tpl-card__title">{item.title}</span>
                    <span className="cb-tpl-card__copy">{item.description}</span>
                  </button>
                ))
              ) : (
                <p className="cb-tpl__empty">No templates match that search.</p>
              )}
            </div>
          </div>
          <footer className="cb-create__foot">
            {onAddTemplate ? (
              <Button variant="neutral" onClick={onClose}>
                Cancel
              </Button>
            ) : (
              <>
                <Button variant="neutral" onClick={() => setStep('form')}>
                  Back
                </Button>
                <Button variant="outline" onClick={() => startScratch(true)}>
                  Create from scratch
                </Button>
              </>
            )}
          </footer>
        </div>
      ) : (
        template && (
          <div className="cb-modal cb-tpl" role="dialog" aria-modal="true" aria-labelledby="cb-detail-title">
            <header className="cb-create__head cb-detail__head">
              <div className="cb-detail__intro">
                <div className="cb-detail__title-row">
                  <h2 id="cb-detail-title" className="cb-modal__title">
                    {template.title}
                  </h2>
                  <span className="cb-detail__tags">
                    <Badge>{template.industry}</Badge>
                    <Badge>{template.channel}</Badge>
                  </span>
                </div>
                <p className="cb-detail__summary">{template.description}</p>
              </div>
              <IconButton label="Close" size={32} icon={<X size={18} />} onClick={onClose} />
            </header>
            <div className="cb-detail__body">
              <div className="cb-detail__flow">
                <div className="cb-detail__canvas" style={{ transform: `scale(${zoom})` }}>
                  <FlowPreview template={template} />
                </div>
                <div className="cb-detail__zoom">
                  <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.7, Math.round((z - 0.1) * 10) / 10))}>
                    <img src={zoomOut} alt="" />
                  </button>
                  <span>{Math.round(zoom * 100)}%</span>
                  <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(1.4, Math.round((z + 0.1) * 10) / 10))}>
                    <img src={zoomIn} alt="" />
                  </button>
                </div>
              </div>
              <aside className="cb-detail__preview">
                <div className="cb-detail__preview-head">
                  <span className="cb-detail__chat-icon">
                    <img src={chatIcon} alt="" />
                  </span>
                  Chat preview
                </div>
                <div className="cb-detail__thread">
                  <p className="cb-detail__time">Oct 12, 2023</p>
                  <div className="cb-detail__message">
                    <p className="cb-detail__bubble">
                      {template.id === 'receptionist'
                        ? 'Welcome to lighthouse.lh. How may I help you?'
                        : template.description}
                    </p>
                    <p className="cb-detail__meta">Nextiva BOT - 11:14 am</p>
                  </div>
                  <div className="cb-detail__composer">
                    <span>Write your message</span>
                    <img src={sendIcon} alt="" />
                  </div>
                </div>
              </aside>
            </div>
            <footer className="cb-create__foot">
              <Button variant="neutral" onClick={() => setStep('templates')}>
                Back
              </Button>
              <Button onClick={useTemplate}>{onAddTemplate ? 'Add this template' : 'Use this template'}</Button>
            </footer>
          </div>
        )
      )}
    </div>
  );
}

function FormStep({
  title,
  name,
  description,
  channels,
  ai,
  nameError,
  channelError,
  onName,
  onDescription,
  onToggleChannel,
  onAi,
  onClose,
  onScratch,
  onTemplates,
}: {
  title: string;
  name: string;
  description: string;
  channels: ChannelId[];
  ai: boolean;
  nameError: boolean;
  channelError: boolean;
  onName: (value: string) => void;
  onDescription: (value: string) => void;
  onToggleChannel: (id: ChannelId) => void;
  onAi: (value: boolean) => void;
  onClose: () => void;
  onScratch: () => void;
  onTemplates?: () => void;
}) {
  return (
    <div className="cb-modal cb-create" role="dialog" aria-modal="true" aria-labelledby="cb-create-title">
      <header className="cb-create__head">
        <h2 id="cb-create-title" className="cb-modal__title">
          {title}
        </h2>
        <IconButton label="Close" size={32} icon={<X size={18} />} onClick={onClose} />
      </header>
      <div className="cb-create__body">
        <label className="cb-create__field">
          <span className="cb-create__label">
            What should we name this bot? <span aria-hidden="true">*</span>
          </span>
          <TextField
            aria-label="What should we name this bot?"
            placeholder="Receptionist bot"
            value={name}
            className={nameError ? 'is-invalid' : undefined}
            onChange={(e) => onName(e.target.value)}
          />
          {nameError && <span className="cb-create__error">Name this bot to continue.</span>}
        </label>
        <label className="cb-create__field">
          <span className="cb-create__label">Describe what this bot does?</span>
          <TextArea
            aria-label="Describe what this bot does?"
            placeholder="They’ll help answer FAQs and book appointments"
            value={description}
            rows={4}
            className="cb-create__area"
            onChange={(e) => onDescription(e.target.value)}
          />
        </label>
        <div className="cb-create__field is-channels">
          <p className="cb-create__label is-section">Which channels this bot will support? This helps in determining the elements</p>
          <div className="cb-create__cards">
            {CHANNELS.map((channel) => {
              const selected = channels.includes(channel.id);
              return (
                <button
                  key={channel.id}
                  type="button"
                  className={cx('cb-choice-card', selected && 'is-on')}
                  aria-pressed={selected}
                  onClick={() => onToggleChannel(channel.id)}
                >
                  <span className={cx('cb-choice-card__check', selected && 'is-on')}>
                    <img src={selected ? circleCheck : checkCircle} alt="" />
                  </span>
                  {channel.id === 'whatsapp' ? (
                    <span className="cb-choice-card__wa">
                      <img src={whatsappMark} width={8} height={8} alt="" />
                    </span>
                  ) : (
                    <span className={cx('cb-choice-card__icon', `is-${channel.tone}`)}>
                      <MaskIcon src={channel.icon} width={16} height={16} />
                    </span>
                  )}
                  <span className={cx('cb-choice-card__label', (channel.id === 'whatsapp' || channel.id === 'livechat') && 'is-clip')}>
                    {channel.label}
                  </span>
                </button>
              );
            })}
          </div>
          {channelError && <span className="cb-create__error">Choose at least one channel.</span>}
        </div>
        <div className="cb-create__field">
          <p className="cb-create__label is-section">Do you want AI to help manage conversations?</p>
          <div className="cb-create__cards is-inline">
            {([true, false] as const).map((value) => (
              <button
                key={String(value)}
                type="button"
                className={cx('cb-choice-card', 'is-compact', ai === value && 'is-on')}
                aria-pressed={ai === value}
                onClick={() => onAi(value)}
              >
                <span className={cx('cb-choice-card__check', ai === value && 'is-on')}>
                  <img src={ai === value ? circleCheck : checkCircle} alt="" />
                </span>
                <span className="cb-choice-card__label">{value ? 'Yes' : 'No'}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <footer className="cb-create__foot">
        <Button variant="neutral" onClick={onClose}>
          Cancel
        </Button>
        {onTemplates ? (
          <span className="cb-create__actions">
            <Button variant="outline" onClick={onScratch}>
              Create from scratch
            </Button>
            <Button onClick={onTemplates}>Start with a template</Button>
          </span>
        ) : (
          <Button onClick={onScratch}>Create</Button>
        )}
      </footer>
    </div>
  );
}

function IndustryMenu({ value, onChange }: { value: (typeof INDUSTRIES)[number]; onChange: (value: (typeof INDUSTRIES)[number]) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="cb-tpl__menu">
      <button type="button" className="cb-tpl__pill" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {value}
        <ChevronDown size={16} />
      </button>
      {open && (
        <div className="ds-menu cb-tpl__menu-list" role="listbox">
          {INDUSTRIES.map((item) => (
            <button
              key={item}
              type="button"
              role="option"
              aria-selected={item === value}
              className={cx('ds-menu__item', item === value && 'is-selected')}
              onClick={() => {
                onChange(item as Industry | 'All industries');
                setOpen(false);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FlowPreview({ template }: { template: BotTemplate }) {
  if (template.id !== 'receptionist') {
    return (
      <div className="cb-detail__diagram">
        <article className="cb-dnode">
          <strong>{template.title}</strong>
          <p>{template.description}</p>
        </article>
      </div>
    );
  }
  return <img className="cb-detail__shot" src={flowPreview} alt="" />;
}
