import type { LucideIcon } from 'lucide-react';
import { cx } from './cx';
import { ELEMENT_GLYPHS, type ElementGlyphName } from './elementGlyphs';

export type IconFamily = 'output' | 'input' | 'logic' | 'node-family' | 'ai' | 'disabled' | 'plain';

/** Either a builder element glyph from the Figma chip set, or a generic Lucide icon. */
export type IconSource = ElementGlyphName | LucideIcon;

export interface ElementIconProps {
  icon: IconSource;
  family: IconFamily;
  size?: 'full' | 'node' | 'mini';
  className?: string;
}

const lucideSize = { full: 16, node: 13, mini: 12 } as const;
/** Figma draws glyphs at full size in the 28px tile and at 8.75/12.25 of that in the 20px tiles. */
const glyphScale = { full: 1, node: 0.75, mini: 0.714 } as const;

export function ElementGlyph({ name, scale = 1 }: { name: ElementGlyphName; scale?: number }) {
  const g = ELEMENT_GLYPHS[name];
  return (
    <svg
      width={g.width * scale}
      height={g.height * scale}
      viewBox={`0 0 ${g.width} ${g.height}`}
      fill="currentColor"
      aria-hidden
      focusable="false"
    >
      <path d={g.d} />
    </svg>
  );
}

export function ElementIcon({ icon: Icon, family, size = 'full', className }: ElementIconProps) {
  return (
    <span className={cx('ds-el-icon', `ds-el-icon--${size}`, `ds-el-icon--${family}`, className)} aria-hidden>
      {typeof Icon === 'string' ? (
        <ElementGlyph name={Icon} scale={glyphScale[size]} />
      ) : (
        <Icon size={lucideSize[size]} strokeWidth={2} />
      )}
    </span>
  );
}
