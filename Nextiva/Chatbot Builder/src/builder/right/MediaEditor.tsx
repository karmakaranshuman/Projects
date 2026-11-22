import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button, cx } from '../../design-system';
import { MediaThumb, useMediaPicker } from '../MediaTiles';
import type { MediaItem, NodeElement } from '../types';

/** The Media element gallery: pick a tile, drag it to reorder, remove it, or upload more. */
export function MediaEditor({
  element,
  patch,
  record,
}: {
  element: NodeElement;
  patch: (p: Partial<NodeElement>) => void;
  record: () => void;
}) {
  const items = element.media ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const picker = useMediaPicker((added) => {
    record();
    patch({ media: [...items, ...added] });
  });

  const remove = (id: string) => {
    record();
    patch({ media: items.filter((m) => m.id !== id) });
    if (selected === id) setSelected(null);
  };

  const moveOnto = (overId: string) => {
    if (!dragging || dragging === overId) return;
    const from = items.findIndex((m) => m.id === dragging);
    const to = items.findIndex((m) => m.id === overId);
    const next: MediaItem[] = [...items];
    next.splice(to, 0, ...next.splice(from, 1));
    patch({ media: next });
  };

  return (
    <div className={cx('cb-media-editor', picker.over && 'is-drop')} {...picker.dropProps}>
      {items.length ? (
        <div className="cb-media-gallery" role="listbox" aria-label="Media, drag to reorder">
          {items.map((m) => (
            <div
              key={m.id}
              role="option"
              aria-selected={selected === m.id}
              aria-label={m.name}
              tabIndex={0}
              draggable
              className={cx('cb-media-tile', selected === m.id && 'is-selected', dragging === m.id && 'is-dragging')}
              onClick={() => setSelected(m.id)}
              onKeyDown={(e) => {
                if (e.key === 'Delete' || e.key === 'Backspace') remove(m.id);
              }}
              onDragStart={(e) => {
                record();
                setDragging(m.id);
                setSelected(m.id);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', m.name);
              }}
              onDragOver={(e) => {
                if (!dragging) return;
                e.preventDefault();
                moveOnto(m.id);
              }}
              onDrop={(e) => dragging && e.preventDefault()}
              onDragEnd={() => setDragging(null)}
            >
              <MediaThumb item={m} />
              <button
                type="button"
                className="cb-media-tile__remove"
                aria-label={`Remove ${m.name}`}
                title="Remove"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(m.id);
                }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="cb-media-editor__empty t-caption">You do not have any media to show here. Click on ‘upload media’ to add.</p>
      )}
      <div className="cb-media-editor__upload">
        <Button variant="ghost" icon={<Upload size={14} />} onClick={picker.open}>
          Upload media
        </Button>
      </div>
      {picker.input}
    </div>
  );
}
