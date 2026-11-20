import { readFile } from 'node:fs/promises';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, reorder, quantize, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const [src, out] = process.argv.slice(2);
const group = new OBJLoader().parse(await readFile(src, 'utf8'));
const doc = new Document();
const buffer = doc.createBuffer();
const scene = doc.createScene('falcon-heavy');
const material = doc.createMaterial('falcon').setBaseColorFactor([1, 1, 1, 1]).setRoughnessFactor(0.6).setMetallicFactor(0.3);
group.traverse((o) => {
  if (!o.isMesh) return;
  const g = o.geometry;
  const prim = doc.createPrimitive().setMaterial(material);
  for (const [name, key] of [['position', 'POSITION'], ['normal', 'NORMAL'], ['uv', 'TEXCOORD_0']]) {
    const a = g.getAttribute(name);
    if (a) prim.setAttribute(key, doc.createAccessor().setType(a.itemSize === 3 ? 'VEC3' : 'VEC2').setArray(new Float32Array(a.array)).setBuffer(buffer));
  }
  scene.addChild(doc.createNode(o.name || 'part').setMesh(doc.createMesh(o.name).addPrimitive(prim)));
});
await MeshoptEncoder.ready;
await doc.transform(dedup(), weld(), reorder({ encoder: MeshoptEncoder }), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
await io.write(out, doc);
console.log('meshes', scene.listChildren().length);
