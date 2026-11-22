import { useRef, useState, type DragEvent } from 'react';
import { Image, Play, Video } from 'lucide-react';
import { cx } from '../design-system';
import { filesToMedia, MEDIA_ACCEPT } from './media';
import type { MediaItem } from './types';

/** One picture: the image, or a video poster with its play button and length bar. `more` covers it with "+N". */
export function MediaThumb({ item, more }: { item: MediaItem; more?: number }) {
  return (
    <span className="cb-media-thumb">
      <Image className="cb-media-thumb__placeholder" size={20} aria-hidden />
      {item.src && <img src={item.src} alt={item.name} draggable={false} />}
      {item.kind === 'video' && (
        <>
          <span className="cb-media-thumb__play" aria-hidden>
            <Play size={10} fill="currentColor" strokeWidth={0} />
          </span>
          <span className="cb-media-thumb__bar">
            <Video size={12} fill="currentColor" strokeWidth={1.5} aria-label="Video" />
            {item.duration}
          </span>
        </>
      )}
      {more ? <span className="cb-media-thumb__more">+{more}</span> : null}
    </span>
  );
}

/** Up to four pictures in a 2 × 2 grid; the last one shows how many more there are. */
export function MediaPreview({ items, max = 4 }: { items: MediaItem[]; max?: number }) {
  const shown = items.slice(0, max);
  const extra = items.length - shown.length;
  return (
    <div className={cx('cb-media-preview', shown.length === 1 && 'is-single')}>
      {shown.map((m, i) => (
        <MediaThumb key={m.id} item={m} more={i === shown.length - 1 && extra > 0 ? extra : undefined} />
      ))}
    </div>
  );
}

const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes('Files');

/** A hidden file picker plus drop-target handlers that both add images and videos. */
export function useMediaPicker(onAdd: (items: MediaItem[]) => void) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const add = async (files: File[]) => {
    const items = await filesToMedia(files);
    if (items.length) onAdd(items);
  };

  return {
    over,
    open: () => input.current?.click(),
    input: (
      <input
        ref={input}
        type="file"
        accept={MEDIA_ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = '';
          void add(files);
        }}
      />
    ),
    dropProps: {
      onDragOver: (e: DragEvent) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setOver(true);
      },
      onDragLeave: (e: DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      },
      onDrop: (e: DragEvent) => {
        setOver(false);
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        void add([...e.dataTransfer.files]);
      },
    },
  };
}
