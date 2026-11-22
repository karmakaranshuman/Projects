import { useRef } from 'react';
import { GalleryHorizontal, Link2, Plus, Trash2, Upload } from 'lucide-react';
import { Button, cx, IconButton, TextField } from '../../design-system';
import { createSlide } from '../elements';
import { MEDIA_ACCEPT, filesToMedia } from '../media';
import { htmlToText } from '../richText';
import type { CarouselSlide, NodeElement, SlideDirection } from '../types';
import { RichTextEditor } from './RichTextEditor';

export function CarouselEditor({
  element,
  patch,
  record,
}: {
  element: NodeElement;
  patch: (p: Partial<NodeElement>) => void;
  record: () => void;
}) {
  const slides = element.slides?.length ? element.slides : [createSlide()];
  const direction = element.slideDirection === 'vertical' ? 'vertical' : 'horizontal';

  const updateSlides = (next: CarouselSlide[]) => patch({ slides: next });
  const updateSlide = (id: string, p: Partial<CarouselSlide>) => updateSlides(slides.map((slide) => (slide.id === id ? { ...slide, ...p } : slide)));

  return (
    <div className="cb-slides">
      <div className="cb-rate__block">
        <span className="cb-rate__label">Stack slides:</span>
        <div className="cb-choices">
          {(['horizontal', 'vertical'] as SlideDirection[]).map((value) => (
            <button
              key={value}
              type="button"
              className={cx('cb-choice', direction === value && 'is-selected')}
              aria-pressed={direction === value}
              onClick={() => {
                record();
                patch({ slideDirection: value });
              }}
            >
              {value === 'horizontal' ? 'Horizontally' : 'Vertically'}
            </button>
          ))}
        </div>
      </div>
      {slides.map((slide, index) => (
        <SlideCard
          key={slide.id}
          slide={slide}
          index={index}
          canRemove={slides.length > 1}
          onPatch={(p) => updateSlide(slide.id, p)}
          onRemove={() => {
            record();
            updateSlides(slides.filter((item) => item.id !== slide.id));
          }}
          record={record}
        />
      ))}
      <Button
        variant="neutral"
        className="cb-slides__add"
        icon={<Plus size={16} />}
        onClick={() => {
          record();
          updateSlides([...slides, createSlide()]);
        }}
      >
        Add slide
      </Button>
    </div>
  );
}

function SlideCard({
  slide,
  index,
  canRemove,
  onPatch,
  onRemove,
  record,
}: {
  slide: CarouselSlide;
  index: number;
  canRemove: boolean;
  onPatch: (p: Partial<CarouselSlide>) => void;
  onRemove: () => void;
  record: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  const addFiles = async (files: File[]) => {
    const items = await filesToMedia(files);
    const media = items[0];
    if (!media) return;
    record();
    onPatch({ media });
  };

  return (
    <section className="cb-slide">
      <div className="cb-slide__head">
        <span className="cb-slide__name">
          <GalleryHorizontal size={16} />
          Slide {index + 1}
        </span>
        {canRemove && (
          <IconButton label={`Remove slide ${index + 1}`} size={24} variant="danger" icon={<Trash2 size={14} />} onClick={onRemove} />
        )}
      </div>
      <button type="button" className={cx('cb-slide__media', slide.media && 'has-media')} onClick={() => input.current?.click()}>
        {slide.media ? <img src={slide.media.src} alt={slide.media.name} /> : (
          <span>
            <Upload size={14} />
            Upload media
          </span>
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept={MEDIA_ACCEPT}
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = '';
          void addFiles(files);
        }}
      />
      <RichTextEditor
        html={slide.html ?? ''}
        onFocus={record}
        onChange={(html) => onPatch({ html, text: htmlToText(html) })}
      />
      <div className="cb-slide__button">
        <TextField
          aria-label={`Slide ${index + 1} button name`}
          placeholder="Button name"
          value={slide.buttonLabel ?? ''}
          onFocus={record}
          onChange={(e) => onPatch({ buttonLabel: e.target.value })}
        />
        <TextField
          aria-label={`Slide ${index + 1} URL`}
          placeholder="Enter URL"
          leading={<Link2 size={14} />}
          value={slide.buttonUrl ?? ''}
          onFocus={record}
          onChange={(e) => onPatch({ buttonUrl: e.target.value })}
        />
      </div>
    </section>
  );
}
