import { useEffect, useId, useRef } from 'react';
import { Button } from '../design-system';
import { useBuilder } from './store';

/** Confirms a permanent delete. Copy and layout follow the Dialogs frames in the builder file. */
export function DeleteConfirm() {
  const { deleteConfirm, resolveDeleteConfirm } = useBuilder();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    if (!deleteConfirm) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        resolveDeleteConfirm(false);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [deleteConfirm, resolveDeleteConfirm]);

  if (!deleteConfirm) return null;

  const many = deleteConfirm.kind === 'node' && deleteConfirm.count > 1;
  const title = deleteConfirm.kind === 'element' ? 'Delete element' : many ? 'Delete nodes' : 'Delete node';
  const body =
    deleteConfirm.kind === 'element'
      ? 'Are you sure you want to delete this element permanently?'
      : many
        ? 'Are you sure you want to delete these nodes permanently?'
        : 'Are you sure you want to delete this node permanently?';

  return (
    <div
      className="cb-scrim cb-scrim--confirm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) resolveDeleteConfirm(false);
      }}
    >
      <div className="cb-modal cb-modal--confirm" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId}>
        <h2 id={titleId} className="cb-modal__title">
          {title}
        </h2>
        <p id={bodyId} className="cb-modal__copy">
          {body}
        </p>
        <div className="cb-modal__actions">
          <Button ref={cancelRef} variant="neutral" onClick={() => resolveDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => resolveDeleteConfirm(true)}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
