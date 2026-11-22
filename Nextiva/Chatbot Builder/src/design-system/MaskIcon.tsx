import { cx } from './cx';

/** A single-colour SVG drawn as a mask, so it takes `color` from its container like an icon font. */
export function MaskIcon({ src, width, height, className }: { src: string; width: number; height: number; className?: string }) {
  return (
    <span
      className={cx('ds-mask-icon', className)}
      style={{ width, height, WebkitMaskImage: `url("${src}")`, maskImage: `url("${src}")` }}
      aria-hidden
    />
  );
}
