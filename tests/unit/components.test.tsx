/**
 * @vitest-environment jsdom
 *
 * Component tests for the two pieces that carry the game's central claims:
 * "art is addressed by logical id and never breaks the page" (Sprite) and
 * "a part that comes off actually leaves the character" (PeelbeastFigure).
 *
 * Everything else is covered by the engine tests or by E2E in a real browser.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Sprite } from '@/components/common/Sprite';
import { PeelbeastFigure } from '@/components/common/PeelbeastFigure';
import { createAssembly } from '@/game/systems/assemblySystem';
import { DEFAULT_LOADOUT, PARTS } from '@/game/data/parts';
import { ASSET_CATALOG } from '@/assets/assetCatalog';
import { getMissingAssets, resetMissingAssets } from '@/assets/assetLoader';
import type { PartSlot } from '@/game/data/types';

afterEach(() => {
  cleanup();
  resetMissingAssets();
});

describe('Sprite', () => {
  it('renders the catalog file for a known id', () => {
    render(<Sprite assetId="part.head.toast_helm" />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toContain('/assets/parts/head/toast_helm.png');
    expect(img.getAttribute('data-asset-status')).toBe('placeholder');
    expect(img.getAttribute('data-asset-missing')).toBeNull();
  });

  it('uses the entry displayName as alt text by default', () => {
    render(<Sprite assetId="part.hand.scissors" />);
    expect(screen.getByAltText('Scissors')).toBeTruthy();
  });

  it('marks decorative art as hidden from assistive tech', () => {
    const { container } = render(<Sprite assetId="ui.tape_strip" decorative />);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('aria-hidden')).toBe('true');
    expect(img.getAttribute('alt')).toBe('');
  });

  it('falls back to a slot placeholder for an unknown id, and records it', () => {
    render(<Sprite assetId="part.head.does_not_exist" slotHint="head" />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toContain('/assets/placeholders/head.png');
    expect(img.getAttribute('data-asset-missing')).toBe('true');
    expect(getMissingAssets().map((m) => m.id)).toContain('part.head.does_not_exist');
  });

  it('falls back to the generic placeholder when there is no slot hint', () => {
    render(<Sprite assetId="nonsense" />);
    expect(screen.getByRole('img').getAttribute('src')).toContain('/assets/placeholders/generic.png');
  });

  it('swaps to the declared fallback when the image fails to load', () => {
    const { container } = render(<Sprite assetId="part.core.tape_roll" />);
    const img = container.querySelector('img')!;
    expect(img.getAttribute('src')).toContain('tape_roll.png');

    // fireEvent wraps the dispatch in act(), so the state update flushes
    fireEvent.error(img);

    expect(container.querySelector('img')!.getAttribute('src')).toContain('/assets/placeholders/core.png');
  });
});

describe('PeelbeastFigure', () => {
  const assembly = createAssembly(DEFAULT_LOADOUT);

  it('renders the body plus one layer per equipped slot', () => {
    const { container } = render(<PeelbeastFigure assembly={assembly} width={300} />);
    expect(container.querySelector('.figure__body')).toBeTruthy();
    for (const slot of ['head', 'hand', 'core', 'trinket'] as PartSlot[]) {
      const layer = container.querySelector(`.figure__part--${slot}`);
      expect(layer, slot).toBeTruthy();
      expect(layer!.getAttribute('data-part-id')).toBe(assembly.slots[slot]);
    }
  });

  it('omits the layer for an empty slot', () => {
    const bare = createAssembly({ head: DEFAULT_LOADOUT.head });
    const { container } = render(<PeelbeastFigure assembly={bare} width={300} />);
    expect(container.querySelector('.figure__part--head')).toBeTruthy();
    expect(container.querySelector('.figure__part--hand')).toBeNull();
    expect(container.querySelector('.figure__part--core')).toBeNull();
  });

  it('removes the layer entirely for a peeled slot — not just hides it', () => {
    const { container } = render(
      <PeelbeastFigure assembly={assembly} peeled={new Set<PartSlot>(['hand'])} width={300} />,
    );
    // rendered fresh as peeled, so there is no falling clone either
    expect(container.querySelectorAll('.figure__part--hand')).toHaveLength(0);
    expect(container.querySelector('.figure__part--head')).toBeTruthy();
  });

  it('positions each part from its catalog anchor, scaled to the body width', () => {
    const width = 400;
    const { container } = render(<PeelbeastFigure assembly={assembly} width={width} />);
    const body = ASSET_CATALOG['body.cat'];
    const bodyHeight = width * (body.height / body.width);

    const part = ASSET_CATALOG[PARTS[DEFAULT_LOADOUT.head].assetId];
    const el = container.querySelector<HTMLElement>('.figure__part--head')!;

    const expectedW = width * part.scale;
    const expectedH = expectedW * (part.height / part.width);
    const attach = body.attach!.head;

    expect(el.style.width).toBe(`${expectedW}px`);
    expect(el.style.left).toBe(`${attach.x * width - part.anchorX * expectedW}px`);
    expect(el.style.top).toBe(`${attach.y * bodyHeight - part.anchorY * expectedH}px`);
    expect(el.style.zIndex).toBe(String(part.zIndex));
  });

  it('draws parts in catalog z-order so the hand sits in front of the body', () => {
    const { container } = render(<PeelbeastFigure assembly={assembly} width={300} />);
    const z = (sel: string) => Number(container.querySelector<HTMLElement>(sel)!.style.zIndex);
    expect(z('.figure__part--hand')).toBeGreaterThan(z('.figure__part--core'));
    expect(z('.figure__part--trinket')).toBeGreaterThan(z('.figure__part--head'));
  });

  it('exposes attach markers only when anchors are requested', () => {
    const { container: plain } = render(<PeelbeastFigure assembly={assembly} width={300} />);
    expect(plain.querySelectorAll('.figure__attach')).toHaveLength(0);

    cleanup();
    const { container: dev } = render(<PeelbeastFigure assembly={assembly} width={300} showAnchors />);
    expect(dev.querySelectorAll('.figure__attach').length).toBeGreaterThan(0);
  });
});
