import { useEffect, useState, type CSSProperties } from 'react';
import { fallbackUrl, resolveAsset } from '@/assets/assetLoader';
import type { PartSlot } from '@/assets/assetTypes';

interface SpriteProps {
  /** Logical catalog id. Never a file path. */
  assetId: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  slotHint?: PartSlot;
  width?: number | string;
  height?: number | string;
  /** Marks decorative art so screen readers skip it. */
  decorative?: boolean;
  draggable?: boolean;
  onLoad?: () => void;
}

/**
 * The only component allowed to emit an `<img>` for catalog art.
 *
 * Resolution order on failure: `file` → `fallbackFile` → `ph.generic`. A broken
 * or missing asset therefore degrades to a visible placeholder instead of a
 * zero-size box, which is what v0.8's silent `if (!a) return;` produced.
 */
export function Sprite({
  assetId,
  alt,
  className,
  style,
  slotHint,
  width,
  height,
  decorative,
  draggable = false,
  onLoad,
}: SpriteProps) {
  const resolved = resolveAsset(assetId, slotHint);
  const [src, setSrc] = useState(resolved.url);

  useEffect(() => {
    setSrc(resolved.url);
  }, [resolved.url]);

  const label = alt ?? resolved.entry.displayName;

  return (
    <img
      src={src}
      alt={decorative ? '' : label}
      aria-hidden={decorative || undefined}
      className={className}
      style={style}
      width={width}
      height={height}
      draggable={draggable}
      loading="eager"
      decoding="async"
      data-asset-id={assetId}
      data-asset-status={resolved.entry.status}
      data-asset-missing={resolved.missing ? 'true' : undefined}
      onLoad={onLoad}
      onError={() => {
        const next = fallbackUrl(resolved.entry, src);
        if (next) setSrc(next);
      }}
    />
  );
}
