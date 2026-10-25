// Ordinal is display order, never camera pose. Validate before any download.
export function validateSourceViews(sources) {
  if (!sources?.length || sources.length > 4) throw new Error('Limited multi-view requires 1–4 source photographs.');
  const angles = { FRONT: 0, BACK: 180, RIGHT: 90, LEFT: 270 };
  const views = sources.map(source => {
    const direction = source.camera_direction;
    if (!(direction in angles) && !['CUSTOM', 'TOP', 'BOTTOM'].includes(direction))
      throw new Error('Source camera direction is missing. Edit the product and label every photograph before regenerating.');
    const azimuth = source.camera_azimuth ?? angles[direction] ?? null;
    if (!['TOP','BOTTOM'].includes(direction) && (typeof azimuth !== 'number' || !Number.isFinite(azimuth) || azimuth < 0 || azimuth >= 360))
      throw new Error('Camera azimuth must be a finite number in [0,360).');
    return { ...source, direction, azimuth };
  });
  if (!views.some(v => v.direction === 'FRONT')) throw new Error('A FRONT photograph is required.');
  const body = views.filter(v => !['TOP','BOTTOM'].includes(v.direction));
  if (new Set(body.map(v => v.azimuth)).size !== body.length) throw new Error('Duplicate camera angles.');
  return views;
}

export function validateGenerationReport(report, model) {
  if (model.length < 500 || model.toString('ascii', 0, 4) !== 'glTF' || model.readUInt32LE(4) !== 2 || model.readUInt32LE(8) !== model.length)
    throw new Error('Invalid GLB header or byte length.');
  if (report.reportVersion !== 3 || report.engine !== 'ceramic-cpu' || report.qualityStatus !== 'NEEDS_REVIEW' || report.confidenceScore !== null)
    throw new Error('Missing or unsupported audited generation report.');
  if (!report.meshTopology?.edgeManifoldAfterWelding || !report.meshTopology?.normalOrientationValid || report.assetBytes !== model.length)
    throw new Error('Generated geometry/report validation failed.');
}
