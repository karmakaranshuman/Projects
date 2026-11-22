import { TextField } from '../../design-system';
import type { NodeElement } from '../types';

export function EmbedEditor({
  element,
  patch,
  record,
}: {
  element: NodeElement;
  patch: (p: Partial<NodeElement>) => void;
  record: () => void;
}) {
  return (
    <div className="cb-embed">
      <TextField
        label="Name your script"
        placeholder="Code title"
        value={element.text ?? ''}
        onFocus={record}
        onChange={(e) => patch({ text: e.target.value })}
      />
      <textarea
        className="cb-embed__code"
        aria-label="Script"
        placeholder="Paste HTML or a script"
        spellCheck={false}
        value={element.script ?? ''}
        onFocus={record}
        onChange={(e) => patch({ script: e.target.value })}
      />
    </div>
  );
}
