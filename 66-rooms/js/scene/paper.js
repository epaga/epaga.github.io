// Paper toolkit: materials with fibre grain, lighter "paper core" edges on every cut,
// and a small 2D shape vocabulary that gets extruded into layered paper cards.
import * as THREE from 'three';

const EDGE_TINT = new THREE.Color('#fbf5e6');

function seeded(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
export const rand = seeded(20250930);

function grainCanvas(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const r = seeded(11);
  for (let i = 0; i < size * size; i++) {
    const v = 232 + r() * 23;
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v - 2; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = '#4a3e2c';
  for (let i = 0; i < 160; i++) {
    const x = r() * size, y = r() * size, a = r() * Math.PI * 2, l = 6 + r() * 26;
    g.globalAlpha = 0.03 + r() * 0.06;
    g.lineWidth = 0.4 + r() * 0.9;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  return c;
}

let _grain, _bump;
export function grainTexture() {
  if (_grain) return _grain;
  const c = grainCanvas();
  _grain = new THREE.CanvasTexture(c);
  _grain.wrapS = _grain.wrapT = THREE.RepeatWrapping;
  _grain.repeat.set(1.4, 1.4);
  _grain.colorSpace = THREE.SRGBColorSpace;
  _grain.anisotropy = 4;
  _bump = new THREE.CanvasTexture(c);
  _bump.wrapS = _bump.wrapT = THREE.RepeatWrapping;
  _bump.repeat.set(1.4, 1.4);
  return _grain;
}

export function canvasTexture(w, h, draw, { srgb = true, repeat } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

const cache = new Map();
// o: { emissive, rough, metal, opacity, double, map, unique, flat }
export function mat(color, o = {}) {
  const key = [color, o.emissive || 0, o.rough ?? 0.86, o.metal || 0, o.opacity ?? 1, !!o.double, o.map ? o.map.uuid : '', !!o.flat].join('|');
  if (!o.unique && cache.has(key)) return cache.get(key);
  grainTexture();
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: o.rough ?? 0.86,
    metalness: o.metal || 0,
    map: o.map || (o.flat ? null : _grain),
    bumpMap: o.flat ? null : _bump,
    bumpScale: 0.9,
  });
  if (o.emissive) { m.emissive = new THREE.Color(color); m.emissiveIntensity = o.emissive; }
  if ((o.opacity ?? 1) < 1) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = false; }
  if (o.double) m.side = THREE.DoubleSide;
  if (!o.unique) cache.set(key, m);
  return m;
}

export function edgeColor(color, amt = 0.55) {
  return '#' + new THREE.Color(color).lerp(EDGE_TINT, amt).getHexString();
}

// A single layer of cut paper: the shape extruded backwards from z=0, face colour + pale edge.
export function card(shape, color, o = {}) {
  const depth = o.depth ?? 0.05;
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: o.segments ?? 28 });
  g.translate(0, 0, -depth);
  const face = o.material || mat(color, o);
  const side = (o.metal || (o.opacity ?? 1) < 1 || o.material) ? face : mat(edgeColor(color), { rough: 0.95 });
  const m = new THREE.Mesh(g, [face, side]);
  m.position.z = o.z || 0;
  m.castShadow = o.shadow !== false;
  m.receiveShadow = true;
  return m;
}

export function box(w, h, d, color, o = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, o));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function cyl(rt, rb, h, color, o = {}, seg = 28) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, !!o.open), mat(color, o));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function sphere(r, color, o = {}) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), mat(color, o));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function lathe(profile, color, o = {}) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), o.seg || 40);
  const m = new THREE.Mesh(g, o.material || mat(color, { ...o, double: true }));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function curvePts(fn, n = 16) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(fn(i / n));
  return pts;
}

// 2D shape vocabulary (units ≈ metres; y = 0 is the floor of the object)
export const S = {
  poly(pts) {
    const s = new THREE.Shape();
    s.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    s.closePath();
    return s;
  },
  rect(x, y, w, h) {
    return S.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
  },
  rrect(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    const s = new THREE.Shape();
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  },
  circle(cx, cy, r) {
    const s = new THREE.Shape();
    s.absarc(cx, cy, r, 0, Math.PI * 2, false);
    return s;
  },
  ellipse(cx, cy, rx, ry, rot = 0) {
    const s = new THREE.Shape();
    s.absellipse(cx, cy, rx, ry, 0, Math.PI * 2, false, rot);
    return s;
  },
  halfDisc(cx, cy, r) {
    const s = new THREE.Shape();
    s.moveTo(cx + r, cy);
    s.absarc(cx, cy, r, 0, Math.PI, false);
    s.closePath();
    return s;
  },
  arch(x, y, w, h) {
    const r = w / 2;
    const s = new THREE.Shape();
    s.moveTo(x, y); s.lineTo(x + w, y); s.lineTo(x + w, y + h - r);
    s.absarc(x + r, y + h - r, r, 0, Math.PI, false);
    s.lineTo(x, y);
    return s;
  },
  band(cx, cy, r0, r1, a0, a1) {
    const s = new THREE.Shape();
    s.moveTo(cx + Math.cos(a0) * r1, cy + Math.sin(a0) * r1);
    s.absarc(cx, cy, r1, a0, a1, false);
    s.lineTo(cx + Math.cos(a1) * r0, cy + Math.sin(a1) * r0);
    s.absarc(cx, cy, r0, a1, a0, true);
    return s;
  },
  ring(cx, cy, r0, r1) {
    const s = S.circle(cx, cy, r1);
    const h = new THREE.Path();
    h.absarc(cx, cy, r0, 0, Math.PI * 2, true);
    s.holes.push(h);
    return s;
  },
  star(cx, cy, ro, ri, n = 5, rot = Math.PI / 2) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i * Math.PI) / n, r = i % 2 ? ri : ro;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return S.poly(pts);
  },
  crescent(cx, cy, r) {
    const s = new THREE.Shape();
    const a0 = Math.PI * 0.3, a1 = Math.PI * 1.7;
    s.moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
    s.absarc(cx, cy, r, a0, a1, false);
    s.quadraticCurveTo(cx - 1.35 * r, cy, cx + Math.cos(a0) * r, cy + Math.sin(a0) * r);
    return s;
  },
  // Filled wave: flat bottom at yBottom, wavy top edge.
  wave(x0, x1, yTop, amp, waves, phase = 0, yBottom = 0, seg = 64) {
    const pts = [[x0, yBottom]];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg;
      pts.push([x0 + (x1 - x0) * t, yTop + Math.sin(t * Math.PI * 2 * waves + phase) * amp]);
    }
    pts.push([x1, yBottom]);
    return S.poly(pts);
  },
  // A tapered ribbon along a polyline.
  stroke(pts, w0, w1 = w0) {
    const n = pts.length, L = [], R = [];
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const w = (w0 + (w1 - w0) * (i / (n - 1))) / 2;
      L.push([p[0] - dy * w, p[1] + dx * w]);
      R.push([p[0] + dy * w, p[1] - dx * w]);
    }
    return S.poly([...L, ...R.reverse()]);
  },
  // Irregular outline around an ellipse: fur, bushes, thickets.
  shaggy(cx, cy, rx, ry, spikes = 30, jag = 0.18, seed = 3) {
    const r = seeded(seed);
    const pts = [];
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2;
      const k = i % 2 ? 1 - jag * (0.4 + r() * 0.6) : 1 + jag * r() * 0.5;
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    return S.poly(pts);
  },
};

// Merge the static cards of one hinge into a single mesh with one draw group per material.
// Meshes whose transform is animated are flagged `userData.keep` and left alone; material-only
// animation (twinkles, glints) survives merging because the material objects are reused.
export function mergeStatic(parent) {
  const meshes = parent.children.filter((m) => m.isMesh && !m.userData.keep);
  if (meshes.length < 2) return;
  const buckets = new Map();
  meshes.forEach((m) => {
    m.updateMatrix();
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    g.applyMatrix4(m.matrix);
    const mats = [].concat(m.material);
    const groups = Array.isArray(m.material) && g.groups.length ? g.groups : [{ start: 0, count: g.attributes.position.count, materialIndex: 0 }];
    const P = g.attributes.position.array, N = g.attributes.normal.array, U = g.attributes.uv && g.attributes.uv.array;
    groups.forEach((gr) => {
      const material = mats[gr.materialIndex || 0];
      if (!material) return;
      const key = `${material.uuid}|${m.castShadow}`;
      let b = buckets.get(key);
      if (!b) { b = { material, cast: m.castShadow, parts: [], count: 0 }; buckets.set(key, b); }
      const end = Math.min(gr.start + gr.count, g.attributes.position.count);
      b.parts.push({ P, N, U, start: gr.start, end });
      b.count += end - gr.start;
    });
    parent.remove(m);
    m.geometry.dispose();
  });
  [true, false].forEach((cast) => {
    const list = [...buckets.values()].filter((b) => b.cast === cast);
    if (!list.length) return;
    const total = list.reduce((s, b) => s + b.count, 0);
    const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), uv = new Float32Array(total * 2);
    const geo = new THREE.BufferGeometry();
    let o = 0;
    list.forEach((b, mi) => {
      const start = o;
      b.parts.forEach(({ P, N, U, start: s0, end }) => {
        pos.set(P.subarray(s0 * 3, end * 3), o * 3);
        nor.set(N.subarray(s0 * 3, end * 3), o * 3);
        if (U) uv.set(U.subarray(s0 * 2, end * 2), o * 2);
        o += end - s0;
      });
      geo.addGroup(start, o - start, mi);
    });
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, list.map((b) => b.material));
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    parent.add(mesh);
  });
}
