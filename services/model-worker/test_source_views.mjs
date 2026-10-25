import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSourceViews, validateGenerationReport } from './source-views.mjs';
test('missing direction never defaults ordinal 1 to BACK',()=>{
  assert.throws(()=>validateSourceViews([{ordinal:0},{ordinal:1}]),/direction/);
});
test('all supplied angles survive order changes and optional slots',()=>{
  const result=validateSourceViews([{ordinal:0,camera_direction:'FRONT'},{ordinal:1,camera_direction:'LEFT'},{ordinal:2,camera_direction:'CUSTOM',camera_azimuth:135}]);
  assert.deepEqual(result.map(v=>v.azimuth),[0,270,135]);
});
test('duplicates, invalid custom angle and absent front fail',()=>{
  for(const input of [[{camera_direction:'BACK'}],[{camera_direction:'FRONT'},{camera_direction:'CUSTOM',camera_azimuth:NaN}],[{camera_direction:'FRONT'},{camera_direction:'FRONT'}]])
    assert.throws(()=>validateSourceViews(input));
});
test('worker rejects corrupt GLB and obsolete confidence report',()=>{
  assert.throws(()=>validateGenerationReport({},Buffer.alloc(600)),/GLB/);
  const model=Buffer.alloc(600); model.write('glTF');model.writeUInt32LE(2,4);model.writeUInt32LE(600,8);
  assert.throws(()=>validateGenerationReport({confidenceScore:.94},model),/report/);
});
