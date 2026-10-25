import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const validator = require('../outputs/3d-audit/tools/node_modules/gltf-validator');
for (const name of ['baseline/model','baseline/model-master','after/model','after/model-master']) {
  const bytes=await readFile(`outputs/3d-audit/${name}.glb`);
  const report=await validator.validateBytes(new Uint8Array(bytes),{uri:`${name}.glb`,maxIssues:100});
  await writeFile(`outputs/3d-audit/${name}-validation.json`,JSON.stringify(report,null,2));
  console.log(name,JSON.stringify({errors:report.issues.numErrors,warnings:report.issues.numWarnings,infos:report.issues.numInfos}));
  if(name.startsWith('after') && report.issues.numErrors) process.exitCode=1;
}
