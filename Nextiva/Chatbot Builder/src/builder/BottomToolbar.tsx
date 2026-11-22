import { useReactFlow, useViewport } from '@xyflow/react';
import { Minus, Plus, Redo2, Scan, Undo2, WandSparkles } from 'lucide-react';
import { Divider, IconButton } from '../design-system';
import { FIT_VIEW } from './fit';
import { useBuilder } from './store';

export function BottomToolbar() {
  const { zoomIn, zoomOut, zoomTo, fitView } = useReactFlow();
  const { zoom } = useViewport();
  const { undo, redo, canUndo, canRedo, tidyLayout, nodes } = useBuilder();

  return (
    <div className="cb-toolbar" role="toolbar" aria-label="Canvas controls">
      <div className="cb-toolbar__group">
        <IconButton label="Zoom out" icon={<Minus size={16} />} onClick={() => zoomOut({ duration: 200 })} />
        <button type="button" className="cb-toolbar__zoom" title="Reset to 100%" onClick={() => zoomTo(1, { duration: 200 })}>
          {Math.round(zoom * 100)}%
        </button>
        <IconButton label="Zoom in" icon={<Plus size={16} />} onClick={() => zoomIn({ duration: 200 })} />
      </div>
      <Divider vertical />
      <IconButton
        label="Fit flow to screen"
        icon={<Scan size={16} />}
        disabled={!nodes.length}
        onClick={() => fitView({ ...FIT_VIEW, duration: 300 })}
      />
      <Divider vertical />
      <div className="cb-toolbar__group">
        <IconButton label="Undo (⌘Z)" icon={<Undo2 size={16} />} disabled={!canUndo} onClick={undo} />
        <IconButton label="Redo (⇧⌘Z)" icon={<Redo2 size={16} />} disabled={!canRedo} onClick={redo} />
      </div>
      <Divider vertical />
      <IconButton
        label="Auto-arrange nodes"
        icon={<WandSparkles size={16} />}
        disabled={nodes.length < 2}
        onClick={tidyLayout}
      />
    </div>
  );
}
