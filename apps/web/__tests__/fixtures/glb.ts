export function makeGlb(extra: Record<string, unknown> = {}) {
  const document = {
    asset: { version: "2.0" }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    buffers: [{ byteLength: 36 }], bufferViews: [{ buffer: 0, byteLength: 36, target: 34962 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [1, 1, 0] }],
    ...extra,
  };
  const json = new TextEncoder().encode(JSON.stringify(document));
  const size = Math.ceil(json.length / 4) * 4;
  const buffer = new ArrayBuffer(20 + size + 8 + 36);
  const view = new DataView(buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, buffer.byteLength, true);
  view.setUint32(12, size, true);
  view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(buffer, 20, size).fill(32);
  new Uint8Array(buffer, 20, json.length).set(json);
  view.setUint32(20 + size, 36, true);
  view.setUint32(24 + size, 0x004e4942, true);
  new Float32Array(buffer, 28 + size, 9).set([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  return buffer;
}
