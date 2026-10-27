import { describe, it, expect } from 'vitest';
import {
  parseSourceViews,
  parseRequestedEngine,
  autoAssignViews,
  resolveGenerationMode,
  computeViewCoverage,
} from '../lib/model-source-views';

describe('source camera metadata', () => {
  it('requires explicit direction instead of upload order', () =>
    expect(() => parseSourceViews(null, 2)).toThrow());

  it('keeps FRONT and LEFT when BACK slot is empty', () =>
    expect(
      parseSourceViews(
        JSON.stringify([{ direction: 'FRONT' }, { direction: 'LEFT' }]),
        2,
      ).map((v) => v.azimuth),
    ).toEqual([0, 270]));

  it('accepts top as reference and custom angle', () =>
    expect(
      parseSourceViews(
        JSON.stringify([
          { direction: 'FRONT' },
          { direction: 'TOP' },
          { direction: 'CUSTOM', azimuth: 42 },
        ]),
        3,
      )[2]?.azimuth,
    ).toBe(42));

  it('rejects missing custom angle, duplicates and mismatched count', () => {
    for (const entries of [
      [{ direction: 'FRONT' }, { direction: 'CUSTOM' }],
      [{ direction: 'FRONT' }, { direction: 'FRONT' }],
      [],
    ])
      expect(() => parseSourceViews(JSON.stringify(entries), 2)).toThrow();
  });

  it('only permits the cloud Pixal3D engines for new jobs', () => {
    for (const engine of [
      'auto',
      'ceramic',
      'multiview',
      'ai-trellis',
      'high-fidelity',
      'typo',
    ])
      expect(() => parseRequestedEngine(engine)).toThrow();
    expect(parseRequestedEngine('pixal3d')).toBe('pixal3d');
    expect(parseRequestedEngine('pixal3d-multiview')).toBe('pixal3d-multiview');
  });

  it('auto-assigns cardinal views for 1 to 4 images', () => {
    expect(autoAssignViews(1)).toEqual([{ direction: 'FRONT', azimuth: 0 }]);
    expect(autoAssignViews(2)).toEqual([
      { direction: 'FRONT', azimuth: 0 },
      { direction: 'BACK', azimuth: 180 },
    ]);
    expect(autoAssignViews(3)).toEqual([
      { direction: 'FRONT', azimuth: 0 },
      { direction: 'BACK', azimuth: 180 },
      { direction: 'LEFT', azimuth: 270 },
    ]);
    expect(autoAssignViews(4)).toEqual([
      { direction: 'FRONT', azimuth: 0 },
      { direction: 'BACK', azimuth: 180 },
      { direction: 'LEFT', azimuth: 270 },
      { direction: 'RIGHT', azimuth: 90 },
    ]);
  });

  it('resolves generation modes correctly', () => {
    expect(resolveGenerationMode([{ direction: 'FRONT', azimuth: 0 }])).toBe('single');
    expect(
      resolveGenerationMode([
        { direction: 'FRONT', azimuth: 0 },
        { direction: 'BACK', azimuth: 180 },
      ]),
    ).toBe('two_view');
    expect(
      resolveGenerationMode([
        { direction: 'FRONT', azimuth: 0 },
        { direction: 'BACK', azimuth: 180 },
        { direction: 'LEFT', azimuth: 270 },
      ]),
    ).toBe('multiview');
  });

  it('computes photographic coverage and speculative percentages', () => {
    const singleCov = computeViewCoverage([{ direction: 'FRONT', azimuth: 0 }]);
    expect(singleCov.speculative_regions_percent).toBe(75);
    expect(singleCov.front_supported).toBe(true);
    expect(singleCov.back_supported).toBe(false);

    const twoCov = computeViewCoverage([
      { direction: 'FRONT', azimuth: 0 },
      { direction: 'BACK', azimuth: 180 },
    ]);
    expect(twoCov.speculative_regions_percent).toBe(50);
    expect(twoCov.back_supported).toBe(true);

    const fourCov = computeViewCoverage([
      { direction: 'FRONT', azimuth: 0 },
      { direction: 'BACK', azimuth: 180 },
      { direction: 'LEFT', azimuth: 270 },
      { direction: 'RIGHT', azimuth: 90 },
    ]);
    expect(fourCov.speculative_regions_percent).toBe(0);
    expect(fourCov.confidence_score).toBe(1.0);
  });
});
