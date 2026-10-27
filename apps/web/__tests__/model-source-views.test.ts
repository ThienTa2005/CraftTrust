import { describe, it, expect } from 'vitest';
import { parseSourceViews, parseRequestedEngine } from '../lib/model-source-views';
describe('source camera metadata',()=>{
 it('requires explicit direction instead of upload order',()=>expect(()=>parseSourceViews(null,2)).toThrow());
 it('keeps FRONT and LEFT when BACK slot is empty',()=>expect(parseSourceViews(JSON.stringify([{direction:'FRONT'},{direction:'LEFT'}]),2).map(v=>v.azimuth)).toEqual([0,270]));
 it('accepts top as reference and custom angle',()=>expect(parseSourceViews(JSON.stringify([{direction:'FRONT'},{direction:'TOP'},{direction:'CUSTOM',azimuth:42}]),3)[2]?.azimuth).toBe(42));
 it('rejects missing custom angle, duplicates and mismatched count',()=>{
  for(const entries of [[{direction:'FRONT'},{direction:'CUSTOM'}],[{direction:'FRONT'},{direction:'FRONT'}],[]]) expect(()=>parseSourceViews(JSON.stringify(entries),2)).toThrow();
 });
 it('only permits the cloud Pixal3D engines for new jobs',()=>{
  for(const engine of ['auto','ceramic','multiview','ai-trellis','high-fidelity','typo']) expect(()=>parseRequestedEngine(engine)).toThrow();
  expect(parseRequestedEngine('pixal3d')).toBe('pixal3d');
  expect(parseRequestedEngine('pixal3d-multiview')).toBe('pixal3d-multiview');
 });
});
