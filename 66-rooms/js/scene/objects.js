// The twenty objects of the Genesis room. Each object is a set of "leaves": paper layers
// hinged at the floor that fold up in sequence, back to front, like a pop-up book.
import * as THREE from 'three';
import { S, card, mat, box, cyl, sphere, lathe, curvePts, canvasTexture, rand } from './paper.js';

export const C = {
  cream: '#f3ead6', ivory: '#fbf6ea', ink: '#1f1a28', gold: '#d9ae57', goldL: '#f1d084', walnut: '#6d4b36',
  stone: '#ddd3bf', stoneD: '#b9ad97', clay: '#c98b5a', skin: '#e8b898',
  i0: '#1d2553', i1: '#2e3d84', i2: '#4f61b4', i3: '#8f9ede', i4: '#d6dcf5',
  g0: '#5e3710', g1: '#9a5c1a', g2: '#d0902c', g3: '#ecc26a', g4: '#f7e5bb',
  r0: '#4e1912', r1: '#852c20', r2: '#bf5238', r3: '#e2896a', r4: '#f5d3c3',
  t0: '#0d3634', t1: '#185d5a', t2: '#2b8a80', t3: '#68bdaf', t4: '#cdeee6',
};

function obj() {
  const o = new THREE.Group();
  o.userData.leaves = [];
  o.userData.ticks = [];
  const ground = new THREE.Group();
  o.add(ground);
  o.userData.ground = ground;
  return o;
}

function leaf(o, z) {
  const hinge = new THREE.Group();
  hinge.position.z = z;
  o.add(hinge);
  o.userData.leaves.push(hinge);
  return hinge;
}

function done(o) {
  o.userData.leaves.sort((a, b) => a.position.z - b.position.z);
  return o;
}

// Put a paper card on a leaf.
function P(lf, shape, color, z = 0, o = {}) {
  const m = card(shape, color, { z, ...o });
  lf.add(m);
  return m;
}

function place(parent, mesh, x, y, z = 0) {
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function figure(lf, x, color, { h = 1, z = 0 } = {}) {
  P(lf, S.poly([[x - 0.2 * h, 0], [x + 0.2 * h, 0], [x + 0.1 * h, 0.8 * h], [x - 0.1 * h, 0.8 * h]]), color, z);
  P(lf, S.circle(x, 0.92 * h, 0.1 * h), color, z);
}

function palm(lf, x, h, color, z = 0) {
  const lean = 0.14 * h;
  const trunk = curvePts((t) => [x + Math.sin(t * 1.3) * lean, t * h], 12);
  P(lf, S.stroke(trunk, 0.08 * h, 0.045 * h), color, z);
  const tx = x + Math.sin(1.3) * lean, ty = h;
  const angles = [0.1, 0.35, 0.62, 0.85, 1.05, 1.3].map((k) => k * Math.PI * 0.8);
  angles.forEach((a, k) => {
    const len = (0.42 + (k % 2) * 0.1) * h;
    const pts = curvePts((t) => [tx + Math.cos(a) * len * t, ty + Math.sin(a) * len * t * 0.55 - t * t * 0.22 * h], 10);
    P(lf, S.stroke(pts, 0.1 * h, 0.012), color, z + k * 0.001);
  });
}

function sheep(lf, x, s, z, flip = 1) {
  const wool = '#f4eddf', dark = '#3a2a22';
  [[-0.12, 0.08], [0.1, 0.08]].forEach(([dx]) => P(lf, S.rect(x + dx * s * flip - 0.025 * s, 0, 0.05 * s, 0.3 * s), dark, z - 0.01));
  [[-0.18, 0.4, 0.15], [0, 0.44, 0.17], [0.17, 0.4, 0.15], [-0.08, 0.32, 0.15], [0.09, 0.32, 0.15]].forEach(([dx, dy, r], k) =>
    P(lf, S.circle(x + dx * s * flip, dy * s, r * s), wool, z + k * 0.001));
  P(lf, S.ellipse(x + 0.33 * s * flip, 0.5 * s, 0.09 * s, 0.13 * s, -0.5 * flip), dark, z + 0.01);
  [[-0.12, 0.44], [0.06, 0.34], [0.15, 0.48], [-0.02, 0.5]].forEach(([dx, dy]) => P(lf, S.circle(x + dx * s * flip, dy * s, 0.03 * s), '#6b5446', z + 0.012, { depth: 0.01 }));
}

function stones(parent, x, specs, color = C.stone) {
  let y = 0;
  specs.forEach(([w, h, d], k) => {
    const b = box(w, h, d, k % 2 ? C.stoneD : color);
    place(parent, b, x, y + h / 2, 0);
    b.rotation.y = (k % 2 ? 0.04 : -0.03);
    y += h;
  });
  return y;
}

function flame(lf, x, y, s, color, z, anim) {
  const f = new THREE.Shape();
  f.moveTo(x, y);
  f.quadraticCurveTo(x + 0.16 * s, y + 0.1 * s, x + 0.02 * s, y + 0.42 * s);
  f.quadraticCurveTo(x - 0.02 * s, y + 0.2 * s, x - 0.08 * s, y + 0.16 * s);
  f.quadraticCurveTo(x - 0.14 * s, y + 0.06 * s, x, y);
  const m = P(lf, f, color, z, { emissive: 0.9, unique: true, depth: 0.03, shadow: false });
  m.userData.keep = true;
  if (anim) anim.push(m);
  return m;
}

function goblet(color, o) {
  return lathe([[0, 0], [0.17, 0], [0.17, 0.03], [0.045, 0.08], [0.035, 0.34], [0.06, 0.4], [0.2, 0.5], [0.24, 0.76], [0.215, 0.76], [0.18, 0.53], [0.02, 0.45], [0, 0.45]], color, o);
}

function weaveTexture(base, line) {
  return canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.strokeStyle = line; g.lineWidth = 3; g.globalAlpha = 0.5;
    for (let i = 0; i < w; i += 16) {
      for (let j = 0; j < h; j += 16) {
        g.beginPath();
        if (((i + j) / 16) % 2) { g.moveTo(i + 2, j + 8); g.lineTo(i + 14, j + 8); } else { g.moveTo(i + 8, j + 2); g.lineTo(i + 8, j + 14); }
        g.stroke();
      }
    }
  }, { repeat: [3, 3] });
}

function stoneTexture() {
  return canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = '#d7cdb8'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#9c8f78'; g.lineWidth = 3;
    const rows = 4;
    for (let r = 0; r < rows; r++) {
      const y = (r * h) / rows;
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
      for (let x = (r % 2) * 20; x < w; x += 40) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + h / rows); g.stroke(); }
    }
  }, { repeat: [2, 1] });
}

export const BUILDERS = {
  // 1 · Genesis 1–2
  creation() {
    const o = obj();
    const rays = leaf(o, -0.42);
    const cy = 0.95;
    for (let k = 0; k < 7; k++) {
      const a = Math.PI * (0.2 + (0.6 * k) / 6), len = k % 2 ? 0.55 : 0.82, w = 0.075, r0 = 0.6;
      P(rays, S.poly([
        [Math.cos(a - w) * r0, cy + Math.sin(a - w) * r0],
        [Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len)],
        [Math.cos(a + w) * r0, cy + Math.sin(a + w) * r0],
      ]), C.goldL, k * 0.002, { emissive: 0.45 });
    }
    const sun = leaf(o, -0.26);
    P(sun, S.ring(0, cy, 0.58, 0.65), C.gold, 0, { metal: 0.55, rough: 0.4 });
    const disc = P(sun, S.circle(0, cy, 0.52), '#f6cf6a', 0.005, { emissive: 0.75, unique: true });
    P(sun, S.crescent(-0.72, 2.25, 0.15), C.i4, 0, { emissive: 0.35 });
    [[0.62, 2.2, 0.06], [0.82, 1.95, 0.04], [-0.92, 1.9, 0.045], [0.3, 2.42, 0.035]].forEach(([x, y, r]) =>
      P(sun, S.star(x, y, r, r * 0.42, 4), C.goldL, 0.002, { emissive: 0.8, depth: 0.02 }));
    const w1 = leaf(o, -0.08); P(w1, S.wave(-1.02, 1.02, 0.8, 0.07, 2.5, 0.4), C.i1);
    const w2 = leaf(o, 0.08); P(w2, S.wave(-0.98, 0.98, 0.56, 0.06, 3, 1.6), C.i2);
    const w3 = leaf(o, 0.24); P(w3, S.wave(-0.94, 0.94, 0.32, 0.05, 3.5, 2.8), C.i3);
    o.userData.ticks.push((t) => { disc.material.emissiveIntensity = 0.7 + Math.sin(t * 1.4) * 0.18; });
    return done(o);
  },

  // 2 · Genesis 3
  fall() {
    const o = obj();
    const back = leaf(o, -0.3);
    [[0, 1.78, 0.7], [-0.56, 1.52, 0.46], [0.58, 1.55, 0.46], [-0.3, 2.18, 0.46], [0.34, 2.16, 0.46]].forEach(([x, y, r], k) =>
      P(back, S.circle(x, y, r), C.i2, k * 0.001));
    const trunk = leaf(o, -0.2);
    P(trunk, S.poly([[-0.17, 0], [0.17, 0], [0.11, 0.5], [0.1, 1.12], [0.34, 1.46], [0.28, 1.52], [0.05, 1.3], [0.02, 1.62],
      [-0.04, 1.62], [-0.05, 1.3], [-0.28, 1.5], [-0.34, 1.45], [-0.1, 1.12], [-0.11, 0.5]]), C.i0);
    const front = leaf(o, -0.1);
    [[-0.42, 1.66, 0.32], [0.44, 1.7, 0.32], [0.02, 2.06, 0.4], [-0.1, 1.72, 0.26]].forEach(([x, y, r], k) =>
      P(front, S.circle(x, y, r), C.i3, k * 0.001));
    [[-0.5, 1.92, 0.06], [0.2, 2.3, 0.05], [0.6, 1.9, 0.05], [-0.2, 1.5, 0.045]].forEach(([x, y, r]) => P(front, S.circle(x, y, r), C.i4, 0.006, { depth: 0.02 }));
    const fruit = leaf(o, 0.04);
    P(fruit, S.circle(0.24, 1.5, 0.15), '#cf3b36', 0, { rough: 0.55 });
    P(fruit, S.circle(0.2, 1.55, 0.045), '#f08a7a', 0.003, { depth: 0.01, emissive: 0.2 });
    P(fruit, S.stroke([[0.24, 1.63], [0.26, 1.72]], 0.025), C.walnut, 0.002);
    P(fruit, S.ellipse(0.32, 1.72, 0.07, 0.03, 0.5), '#6f9a5c', 0.002);
    const snake = leaf(o, 0.1);
    const body = curvePts((t) => [Math.sin(t * Math.PI * 2.3 + 0.4) * (0.24 - t * 0.06), 0.1 + t * 1.22], 40);
    P(snake, S.stroke(body, 0.1, 0.055), C.gold, 0, { metal: 0.45, rough: 0.45 });
    const head = body[body.length - 1];
    P(snake, S.ellipse(head[0] + 0.07, head[1] + 0.03, 0.09, 0.055, 0.3), C.gold, 0.002, { metal: 0.45, rough: 0.45 });
    P(snake, S.circle(head[0] + 0.1, head[1] + 0.05, 0.015), C.ink, 0.004, { depth: 0.01 });
    P(snake, S.poly([[head[0] + 0.15, head[1] + 0.04], [head[0] + 0.28, head[1] + 0.07], [head[0] + 0.24, head[1] + 0.05], [head[0] + 0.28, head[1] + 0.02]]), '#cf3b36', 0.001, { depth: 0.01 });
    return done(o);
  },

  // 3 · Genesis 4–5
  altars() {
    const o = obj();
    const flames = [];
    // Abel's smoke billows straight up; Cain's rolls sideways and sinks back to the ground.
    const smokeUp = leaf(o, -0.32);
    for (let k = 0; k < 9; k++) {
      const t = k / 8;
      P(smokeUp, S.circle(-0.5 + Math.sin(t * 7) * 0.06, 0.98 + t * 1.45, 0.08 + t * 0.14), k % 2 ? C.i4 : '#eef0fb', k * 0.002, { emissive: 0.2 });
    }
    const smokeDown = leaf(o, -0.26);
    for (let k = 0; k < 8; k++) {
      const t = k / 7;
      P(smokeDown, S.circle(0.5 + t * 0.5, 0.9 + Math.sin(t * Math.PI * 0.8) * 0.22 - t * 0.62, 0.07 + t * 0.09), k % 2 ? '#8f93ad' : '#7d8199', k * 0.002);
    }
    const altarA = leaf(o, -0.05);
    const ha = stones(altarA, -0.5, [[0.72, 0.28, 0.5], [0.62, 0.26, 0.46], [0.78, 0.12, 0.56]]);
    flame(altarA, -0.5, ha, 0.9, '#f5b44a', 0, flames);
    const altarB = leaf(o, 0.02);
    const hb = stones(altarB, 0.5, [[0.7, 0.24, 0.5], [0.58, 0.22, 0.44], [0.74, 0.1, 0.54]], C.stoneD);
    flame(altarB, 0.5, hb, 0.55, '#c7713a', 0, flames);
    const flower = leaf(o, 0.36);
    P(flower, S.stroke([[0, 0], [0.02, 0.22]], 0.025), '#5d7a4b');
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      P(flower, S.circle(0.02 + Math.cos(a) * 0.05, 0.26 + Math.sin(a) * 0.05, 0.045), '#b8262c', 0.002 + k * 0.0005, { depth: 0.02 });
    }
    P(flower, S.circle(0.02, 0.26, 0.025), C.ink, 0.006, { depth: 0.01 });
    o.userData.ticks.push((t) => {
      flames.forEach((f, k) => { f.scale.y = 1 + Math.sin(t * 9 + k * 2) * 0.12; f.material.emissiveIntensity = 0.8 + Math.sin(t * 13 + k) * 0.2; });
    });
    return done(o);
  },

  // 4 · Genesis 6–9
  ark() {
    const o = obj();
    const bow = leaf(o, -0.42);
    ['#e7a2a0', '#efc18f', '#efe29d', '#abd6a5', '#9fc5e6', '#b7a8dd'].forEach((c, k) => {
      const r1 = 1.32 - k * 0.085;
      P(bow, S.band(0, 0.5, r1 - 0.085, r1, 0, Math.PI), c, k * 0.002, { emissive: 0.18 });
    });
    const arkLeaf = leaf(o, -0.08);
    const ark = new THREE.Group();
    arkLeaf.add(ark);
    const hull = new THREE.Shape();
    hull.moveTo(-1.0, 0.62); hull.lineTo(1.0, 0.62);
    hull.quadraticCurveTo(0.96, 0.24, 0.66, 0.2); hull.lineTo(-0.66, 0.2);
    hull.quadraticCurveTo(-0.96, 0.24, -1.0, 0.62);
    P(ark, hull, '#6e4a36');
    P(ark, S.rect(-0.9, 0.44, 1.8, 0.035), '#533525', 0.004, { depth: 0.01 });
    P(ark, S.rect(-0.78, 0.32, 1.56, 0.03), '#533525', 0.004, { depth: 0.01 });
    P(ark, S.rect(-0.56, 0.62, 1.12, 0.3), '#eadcbe', -0.02);
    P(ark, S.poly([[-0.68, 0.9], [0.68, 0.9], [0.44, 1.1], [-0.44, 1.1]]), C.i1, -0.015);
    [-0.36, -0.12, 0.12, 0.36].forEach((x) => P(ark, S.rect(x - 0.05, 0.7, 0.1, 0.1), C.i0, -0.012, { depth: 0.01 }));
    const dove = leaf(o, 0.04);
    const dx = 0.62, dy = 1.72;
    P(dove, S.ellipse(dx, dy, 0.16, 0.07, 0.15), C.ivory, 0, { emissive: 0.15 });
    P(dove, S.poly([[dx - 0.02, dy + 0.02], [dx + 0.1, dy + 0.2], [dx + 0.12, dy + 0.03]]), C.ivory, 0.004, { emissive: 0.15 });
    P(dove, S.poly([[dx - 0.14, dy], [dx - 0.28, dy + 0.06], [dx - 0.26, dy - 0.04]]), C.ivory, 0.002);
    P(dove, S.circle(dx + 0.15, dy + 0.04, 0.05), C.ivory, 0.003);
    P(dove, S.stroke([[dx + 0.19, dy + 0.02], [dx + 0.3, dy - 0.04]], 0.018), '#6f9a5c', 0.005, { depth: 0.01 });
    P(dove, S.ellipse(dx + 0.3, dy - 0.02, 0.04, 0.018, 0.4), '#6f9a5c', 0.005, { depth: 0.01 });
    const wa = leaf(o, 0.12); P(wa, S.wave(-1.08, 1.08, 0.36, 0.06, 3, 0.2), C.i2);
    const wb = leaf(o, 0.26); P(wb, S.wave(-1.02, 1.02, 0.2, 0.05, 4, 1.4), C.i3);
    o.userData.ticks.push((t) => { ark.rotation.z = Math.sin(t * 1.1) * 0.035; ark.position.y = Math.sin(t * 1.1 + 1) * 0.025; });
    return done(o);
  },

  // 5 · Genesis 10–11
  babel() {
    const o = obj();
    const cloud = leaf(o, -0.62);
    [[-0.62, 2.05, 0.2], [-0.42, 2.12, 0.24], [-0.22, 2.04, 0.17], [0.52, 2.5, 0.14], [0.68, 2.54, 0.17]].forEach(([x, y, r], k) =>
      P(cloud, S.circle(x, y, r), C.i4, k * 0.001, { emissive: 0.12 }));
    const tower = leaf(o, -0.2);
    const widths = [1.5, 1.2, 0.94, 0.7];
    let y = 0;
    widths.forEach((w, k) => {
      const h = 0.38, d = w * 0.8;
      place(tower, box(w, h, d, k % 2 ? '#c9cde8' : '#e8dec6'), 0, y + h / 2, 0);
      const door = P(tower, S.arch(-0.07, 0, 0.14, 0.24), C.i0, 0, { depth: 0.01 });
      door.position.set(0, y + 0.02, d / 2 + 0.006);
      if (w > 1) [-w * 0.32, w * 0.32].forEach((x) => { const win = P(tower, S.rect(-0.03, 0, 0.06, 0.12), C.i1, 0, { depth: 0.01 }); win.position.set(x, y + 0.14, d / 2 + 0.006); });
      y += h;
    });
    const top = card(S.poly([[-0.26, 0], [0.26, 0], [0.26, 0.2], [0.16, 0.34], [0.09, 0.22], [0.01, 0.4], [-0.08, 0.26], [-0.17, 0.32], [-0.26, 0.17]]), '#e8dec6', { depth: 0.42 });
    place(tower, top, 0, y, 0.21);
    const bricks = leaf(o, 0.3);
    const r = rand;
    for (let k = 0; k < 7; k++) {
      const b = box(0.2, 0.08, 0.11, C.clay);
      place(bricks, b, -0.95 + k * 0.3 + (r() - 0.5) * 0.1, 0.04 + (k % 3 === 1 ? 0.08 : 0), (r() - 0.5) * 0.25);
      b.rotation.y = r() * Math.PI;
    }
    return done(o);
  },

  // 6 · Genesis 12–14
  tent() {
    const o = obj();
    const back = leaf(o, -0.5);
    P(back, S.wave(-1.05, 1.05, 0.34, 0.1, 1, 0.8), C.g3, 0);
    palm(back, 0.7, 1.75, C.g1, 0.01);
    const tentLeaf = leaf(o, -0.1);
    const stripes = canvasTexture(256, 64, (g, w, h) => {
      for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f1e3c2' : '#c88a2e'; g.fillRect((i * w) / 8, 0, w / 8, h); }
    }, { repeat: [1.6, 1] });
    const tent = card(S.poly([[-0.82, 0], [0.82, 0], [0, 1.08]]), '#ffffff', { depth: 1.0, material: mat('#ffffff', { map: stripes }), segments: 2 });
    place(tentLeaf, tent, -0.12, 0, 0.5);
    P(tentLeaf, S.poly([[-0.34, 0], [0.1, 0], [-0.12, 0.66]]), C.g0, 0.51, { depth: 0.01 });
    const flap = P(tentLeaf, S.poly([[0, 0], [0.34, 0.02], [0, 0.66]]), '#f1e3c2', 0, { depth: 0.015 });
    flap.position.set(-0.12, 0, 0.53); flap.rotation.y = -0.5;
    const staffLeaf = leaf(o, 0.3);
    const staff = cyl(0.028, 0.03, 1.7, C.walnut);
    place(staffLeaf, staff, 0.88, 0.85, 0);
    staff.rotation.z = -0.1;
    const crook = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.026, 8, 24, Math.PI * 1.2), mat(C.walnut));
    crook.castShadow = true;
    place(staffLeaf, crook, 0.87, 1.7, 0);
    crook.rotation.z = -0.1;
    const path = card(S.stroke(curvePts((t) => [-0.12 - t * 0.9 + Math.sin(t * 3) * 0.15, 0.55 + t * 0.4], 16), 0.28, 0.12), C.g3, { depth: 0.01 });
    path.rotation.x = -Math.PI / 2;
    place(o.userData.ground, path, 0, 0.012, 0);
    return done(o);
  },

  // 7 · Genesis 15–17
  stars() {
    const o = obj();
    const sky = leaf(o, -0.4);
    P(sky, S.arch(-0.95, 0, 1.9, 2.6), '#161b38', 0, { rough: 0.95 });
    const rim = curvePts((t) => {
      if (t < 0.2) return [-0.95, (t / 0.2) * 1.65];
      if (t > 0.8) return [0.95, ((1 - t) / 0.2) * 1.65];
      const a = Math.PI - ((t - 0.2) / 0.6) * Math.PI;
      return [Math.cos(a) * 0.95, 1.65 + Math.sin(a) * 0.95];
    }, 60);
    P(sky, S.stroke(rim, 0.07), C.gold, 0.01, { metal: 0.6, rough: 0.35 });
    const starLeaf = leaf(o, -0.36);
    const twinkles = [0, 1, 2].map(() => mat(C.goldL, { emissive: 1, unique: true, flat: true }));
    const r = rand;
    for (let k = 0; k < 46; k++) {
      let x, y;
      do { x = (r() - 0.5) * 1.72; y = 0.75 + r() * 1.75; } while (y > 1.65 && Math.hypot(x, y - 1.65) > 0.84);
      const s = 0.018 + r() * r() * 0.06;
      P(starLeaf, S.star(x, y, s, s * 0.4, 4 + (k % 2)), C.goldL, 0, { depth: 0.01, material: twinkles[k % 3], shadow: false });
    }
    P(starLeaf, S.star(0.36, 2.2, 0.14, 0.04, 8), C.goldL, 0.002, { depth: 0.015, material: twinkles[0], shadow: false });
    const hills = leaf(o, -0.12);
    P(hills, S.wave(-1.05, 1.05, 0.52, 0.08, 1, 2.2), C.g1);
    const man = leaf(o, 0.05);
    const x = -0.36;
    P(man, S.poly([[x - 0.17, 0.3], [x + 0.17, 0.3], [x + 0.08, 1.02], [x - 0.08, 1.02]]), C.ink);
    P(man, S.circle(x + 0.01, 1.13, 0.085), C.ink);
    P(man, S.stroke([[x + 0.05, 0.95], [x + 0.2, 1.18], [x + 0.3, 1.42]], 0.05, 0.035), C.ink);
    P(man, S.stroke([[x - 0.26, 0.3], [x - 0.24, 1.3]], 0.03), C.ink);
    const front = leaf(o, 0.18);
    P(front, S.wave(-1.0, 1.0, 0.3, 0.06, 1.5, 0.3), C.g2);
    o.userData.ticks.push((t) => twinkles.forEach((m, k) => { m.emissiveIntensity = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * (1.7 + k * 0.6) + k * 2.1)); }));
    return done(o);
  },

  // 8 · Genesis 18–19
  salt() {
    const o = obj();
    const flames = [];
    const fire = leaf(o, -0.5);
    [[-0.78, 0.9], [-0.42, 1.25], [-0.05, 1.0], [0.34, 1.35], [0.72, 1.05]].forEach(([x, y], k) => {
      flame(fire, x, y - 0.25, 1.5 + (k % 2) * 0.5, k % 2 ? '#e8742e' : '#f2a53a', 0, flames);
    });
    const city = leaf(o, -0.42);
    const sky = [[-1, 0], [-1, 0.8], [-0.82, 0.8], [-0.82, 1.05], [-0.62, 1.05], [-0.62, 0.72], [-0.48, 0.72], [-0.48, 1.3], [-0.3, 1.3],
      [-0.3, 0.9], [-0.1, 0.9], [-0.1, 1.12], [0.1, 1.12], [0.1, 0.8], [0.24, 0.8], [0.24, 1.36], [0.4, 1.42], [0.44, 0.96], [0.62, 0.96], [0.62, 1.16], [0.84, 1.16], [0.84, 0.78], [1, 0.78], [1, 0]];
    P(city, S.poly(sky), '#3a1c14');
    [[-0.72, 0.9], [-0.4, 1.12], [0.3, 1.18], [0.72, 1.0], [-0.02, 0.98]].forEach(([x, y]) => P(city, S.rect(x - 0.03, y - 0.05, 0.06, 0.08), '#f2a53a', 0.003, { depth: 0.01, emissive: 0.9 }));
    const dune = leaf(o, -0.2);
    P(dune, S.wave(-1.05, 1.05, 0.46, 0.07, 1, 0.5), C.g3);
    const pillar = leaf(o, 0.02);
    const salt = lathe([[0, 0], [0.28, 0], [0.27, 0.1], [0.21, 0.5], [0.18, 0.9], [0.21, 1.14], [0.16, 1.3], [0.09, 1.36], [0.11, 1.44], [0.12, 1.54], [0.1, 1.64], [0.05, 1.69], [0, 1.7]],
      '#f8f5ef', { rough: 1, emissive: 0.12, seg: 32 });
    place(pillar, salt, 0.2, 0, 0);
    const lot = leaf(o, 0.2);
    figure(lot, -0.7, C.ink, { h: 0.62 });
    P(lot, S.stroke([[-0.6, 0.45], [-0.5, 0.6]], 0.03), C.ink);
    o.userData.ticks.push((t) => flames.forEach((f, k) => { f.scale.y = 1 + Math.sin(t * 7 + k * 1.7) * 0.14; f.scale.x = 1 + Math.sin(t * 5 + k) * 0.06; }));
    return done(o);
  },

  // 9 · Genesis 20–22
  ram() {
    const o = obj();
    const thicket = leaf(o, -0.42);
    P(thicket, S.shaggy(0.42, 0.78, 0.62, 0.62, 26, 0.3, 5), C.g0);
    P(thicket, S.shaggy(0.46, 0.7, 0.5, 0.5, 22, 0.28, 9), C.g1, 0.01);
    const ramLeaf = leaf(o, -0.3);
    [[0.3, 0.52], [0.56, 0.52]].forEach(([x]) => P(ramLeaf, S.rect(x - 0.03, 0.2, 0.06, 0.38), '#3b2a22', -0.01));
    [[0.3, 0.76, 0.16], [0.46, 0.8, 0.18], [0.62, 0.76, 0.15], [0.38, 0.66, 0.15], [0.56, 0.66, 0.15]].forEach(([x, y, r], k) =>
      P(ramLeaf, S.circle(x, y, r), '#f4ecdc', k * 0.001));
    P(ramLeaf, S.ellipse(0.8, 0.96, 0.09, 0.14, -0.5), '#3b2a22', 0.01);
    const horn = curvePts((t) => { const a = t * Math.PI * 2.1, rr = 0.12 - t * 0.075; return [0.78 + Math.cos(a + 1.8) * rr, 1.02 + Math.sin(a + 1.8) * rr]; }, 30);
    P(ramLeaf, S.stroke(horn, 0.05, 0.025), C.gold, 0.02, { metal: 0.4, rough: 0.45 });
    const thorns = leaf(o, -0.16);
    P(thorns, S.shaggy(0.52, 0.3, 0.55, 0.28, 18, 0.35, 13), C.g1);
    const altar = leaf(o, 0.04);
    const h = stones(altar, -0.42, [[0.8, 0.26, 0.5], [0.7, 0.24, 0.46]], '#e2d3b3');
    for (let k = 0; k < 4; k++) {
      const log = cyl(0.035, 0.035, 0.72, C.walnut, {}, 10);
      place(altar, log, -0.42, h + 0.035 + (k > 1 ? 0.06 : 0), -0.12 + (k % 2) * 0.22 - (k > 1 ? 0.1 : 0));
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (k % 2 ? 0.15 : -0.1);
    }
    return done(o);
  },

  // 10 · Genesis 23–24
  well() {
    const o = obj();
    const camelLeaf = leaf(o, -0.5);
    const camel = [[0.62, 0], [0.64, 0.56], [0.74, 0.78], [0.82, 0.62], [0.86, 0.64], [0.78, 0.86], [0.63, 1.0], [0.46, 1.2], [0.3, 1.28], [0.14, 1.14],
      [-0.1, 1.04], [-0.3, 0.99], [-0.43, 1.04], [-0.53, 1.24], [-0.57, 1.42], [-0.63, 1.5], [-0.78, 1.49], [-0.88, 1.4], [-0.86, 1.35], [-0.71, 1.33], [-0.63, 1.26],
      [-0.56, 1.05], [-0.45, 0.83], [-0.39, 0.66], [-0.37, 0], [-0.29, 0], [-0.28, 0.56], [-0.18, 0.6], [0.44, 0.6], [0.5, 0], [0.58, 0]];
    P(camelLeaf, S.poly(camel.map(([x, y]) => [x + 0.08, y + 0.02])), C.g1, -0.03);
    P(camelLeaf, S.poly(camel), C.g2);
    P(camelLeaf, S.poly([[0.08, 1.0], [0.52, 1.06], [0.5, 0.86], [0.1, 0.84]]), C.r2, 0.004, { depth: 0.01 });
    [0.14, 0.26, 0.38, 0.48].forEach((x) => P(camelLeaf, S.circle(x, 0.83, 0.025), C.g3, 0.005, { depth: 0.01 }));
    const wellLeaf = leaf(o, -0.02);
    const wx = -0.35;
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.5, 32, 1, true), mat('#ffffff', { map: stoneTexture(), double: true }));
    wall.castShadow = wall.receiveShadow = true;
    place(wellLeaf, wall, wx, 0.25, 0);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.05, 10, 36), mat(C.stone));
    rim.rotation.x = Math.PI / 2; rim.castShadow = true;
    place(wellLeaf, rim, wx, 0.5, 0);
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.45, 32), mat('#2b3f63', { rough: 0.2, metal: 0.2, flat: true }));
    water.rotation.x = -Math.PI / 2;
    place(wellLeaf, water, wx, 0.4, 0);
    [-0.5, 0.5].forEach((dx) => place(wellLeaf, box(0.06, 0.95, 0.06, C.walnut), wx + dx, 0.5 + 0.47, 0));
    place(wellLeaf, box(1.08, 0.06, 0.07, C.walnut), wx, 1.45, 0);
    place(wellLeaf, cyl(0.004, 0.004, 0.4, '#b8a37e', {}, 4), wx, 1.22, 0);
    place(wellLeaf, cyl(0.08, 0.065, 0.12, C.walnut), wx, 0.98, 0);
    const jarLeaf = leaf(o, 0.26);
    const jar = lathe([[0, 0], [0.09, 0], [0.15, 0.08], [0.2, 0.25], [0.18, 0.43], [0.1, 0.53], [0.07, 0.6], [0.095, 0.66], [0.075, 0.67]], C.g1, { rough: 0.7 });
    place(jarLeaf, jar, 0.55, 0, 0);
    [-1, 1].forEach((s) => {
      const hnd = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 14, Math.PI), mat(C.g1));
      place(jarLeaf, hnd, 0.55 + s * 0.14, 0.5, 0);
      hnd.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2;
    });
    return done(o);
  },

  // 11 · Genesis 25–26
  stew() {
    const o = obj();
    const bowLeaf = leaf(o, -0.45);
    const arc = curvePts((t) => [0.52 + Math.sin(t * Math.PI) * 0.36, 0.12 + t * 1.8], 30);
    P(bowLeaf, S.stroke(arc, 0.07, 0.07), C.walnut);
    P(bowLeaf, S.stroke([[0.52, 0.12], [0.52, 1.92]], 0.012), C.cream, -0.01);
    P(bowLeaf, S.stroke([[-0.42, 0.08], [0.08, 1.72]], 0.025), C.walnut, 0.01);
    P(bowLeaf, S.poly([[0.04, 1.66], [0.13, 1.86], [0.16, 1.62]]), '#8c8f98', 0.012, { metal: 0.5 });
    P(bowLeaf, S.poly([[-0.4, 0.14], [-0.5, 0.36], [-0.33, 0.3]]), C.r2, 0.012);
    const steam = leaf(o, -0.18);
    const plumes = [-0.24, 0.02, 0.26].map((x, k) => {
      const g = new THREE.Group();
      P(g, S.stroke(curvePts((t) => [x + Math.sin(t * 7 + k) * 0.06, 0.72 + t * 0.78], 20), 0.07, 0.015), C.r4, 0, { emissive: 0.25, depth: 0.02 });
      steam.add(g);
      return g;
    });
    const bowlLeaf = leaf(o, 0.02);
    const bowl = lathe([[0, 0], [0.2, 0], [0.22, 0.06], [0.26, 0.08], [0.47, 0.22], [0.6, 0.5], [0.62, 0.56], [0.58, 0.57], [0.55, 0.51], [0.44, 0.27], [0.0, 0.2]], C.r1, { rough: 0.65 });
    place(bowlLeaf, bowl, 0, 0, 0);
    const soup = new THREE.Mesh(new THREE.CircleGeometry(0.55, 40), mat('#b5301d', { rough: 0.35, emissive: 0.18 }));
    soup.rotation.x = -Math.PI / 2;
    place(bowlLeaf, soup, 0, 0.5, 0);
    for (let k = 0; k < 16; k++) {
      const a = k * 2.4, rr = 0.1 + (k % 5) * 0.08;
      place(bowlLeaf, sphere(0.028, '#d8873a'), Math.cos(a) * rr, 0.505, Math.sin(a) * rr);
    }
    const bread = leaf(o, 0.3);
    const loaf = sphere(0.3, C.g2, { rough: 0.8 });
    loaf.scale.set(1, 0.42, 0.62);
    place(bread, loaf, -0.72, 0.12, 0);
    o.userData.ticks.push((t) => plumes.forEach((g, k) => { g.position.x = Math.sin(t * 1.2 + k * 1.6) * 0.04; g.position.y = Math.sin(t * 0.9 + k) * 0.03; }));
    return done(o);
  },

  // 12 · Genesis 27
  hands() {
    const o = obj();
    const hand = leaf(o, -0.18);
    P(hand, S.rect(-0.3, 0, 0.6, 0.64), C.r1);
    P(hand, S.rect(-0.33, 0.56, 0.66, 0.1), C.r2, 0.004);
    P(hand, S.rrect(-0.36, 0.62, 0.72, 0.8, 0.16), C.skin);
    [[-0.34, 0.62], [-0.16, 0.72], [0.02, 0.66], [0.2, 0.5]].forEach(([x, len]) => P(hand, S.rrect(x, 1.2, 0.155, len, 0.077), C.skin, 0.001));
    P(hand, S.stroke([[-0.3, 0.85], [-0.48, 1.08], [-0.62, 1.3]], 0.17, 0.15), C.skin, 0.001);
    P(hand, S.circle(-0.62, 1.3, 0.075), C.skin, 0.001);
    const fur = leaf(o, -0.06);
    P(fur, S.shaggy(0.0, 1.14, 0.46, 0.42, 34, 0.26, 21), '#4a2e22');
    P(fur, S.shaggy(0.02, 1.16, 0.36, 0.33, 30, 0.24, 17), '#6c4532', 0.008);
    for (let k = 0; k < 9; k++) {
      const x = -0.3 + k * 0.075, y = 0.9 + (k % 3) * 0.12;
      P(fur, S.stroke([[x, y], [x + 0.04, y + 0.12], [x + 0.02, y + 0.2]], 0.018, 0.006), '#8a5a40', 0.012, { depth: 0.01 });
    }
    const plate = leaf(o, 0.28);
    place(plate, cyl(0.3, 0.24, 0.05, C.cream), 0.72, 0.025, 0);
    [[0.64, 0.02], [0.78, -0.05], [0.74, 0.09]].forEach(([x, z]) => { const m = sphere(0.075, C.r1, { rough: 0.6 }); m.scale.y = 0.7; place(plate, m, x, 0.09, z); });
    place(plate, cyl(0.07, 0.06, 0.06, C.gold, { metal: 0.6, rough: 0.35 }), -0.72, 0.03, 0.1);
    const lampFlame = [];
    flame(plate, -0.72, 0.06, 0.35, '#f5b44a', 0.1, lampFlame);
    o.userData.ticks.push((t) => lampFlame.forEach((f) => { f.scale.y = 1 + Math.sin(t * 10) * 0.12; }));
    return done(o);
  },

  // 13 · Genesis 28
  ladder() {
    const o = obj();
    const glow = leaf(o, -0.6);
    for (let k = 0; k < 11; k++) {
      const a = Math.PI * (0.08 + (k / 10) * 0.84);
      P(glow, S.poly([[0, 3.25], [Math.cos(a - 0.04) * 1.2, 3.25 + Math.sin(a - 0.04) * 1.2], [Math.cos(a + 0.04) * 1.2, 3.25 + Math.sin(a + 0.04) * 1.2]]),
        '#fff1c8', k * 0.001, { emissive: 0.5, opacity: 0.55, depth: 0.01, shadow: false });
    }
    [[0, 3.4, 0.36], [-0.34, 3.3, 0.26], [0.36, 3.32, 0.28], [-0.14, 3.62, 0.24], [0.2, 3.6, 0.22]].forEach(([x, y, r], k) =>
      P(glow, S.circle(x, y, r), '#fbf2de', 0.02 + k * 0.001, { emissive: 0.35 }));
    const ladLeaf = leaf(o, -0.25);
    const gold = { metal: 0.55, rough: 0.38 };
    const rail = (x0, x1) => {
      const len = Math.hypot(x1 - x0, 3.25);
      const b = box(0.07, len, 0.07, C.gold, gold);
      place(ladLeaf, b, (x0 + x1) / 2, 0.15 + 3.25 / 2, 0);
      b.rotation.z = Math.atan2(x0 - x1, 3.25);
    };
    rail(-0.4, -0.24); rail(0.4, 0.24);
    for (let y = 0.45; y < 3.35; y += 0.3) {
      const w = 0.8 - ((y - 0.15) / 3.25) * 0.32;
      place(ladLeaf, box(w, 0.045, 0.05, C.gold, gold), 0, y, 0);
    }
    const angels = leaf(o, -0.12);
    const angelMats = [];
    const makeAngel = () => {
      const g = new THREE.Group();
      const m = mat(C.ivory, { emissive: 0.45, unique: true });
      angelMats.push(m);
      P(g, S.poly([[-0.07, -0.12], [0.07, -0.12], [0.03, 0.08], [-0.03, 0.08]]), C.ivory, 0, { material: m, depth: 0.02 });
      P(g, S.circle(0, 0.13, 0.045), C.ivory, 0, { material: m, depth: 0.02 });
      P(g, S.poly([[0.02, 0.05], [0.2, 0.16], [0.12, -0.02]]), C.ivory, -0.01, { material: m, depth: 0.015 });
      P(g, S.poly([[-0.02, 0.05], [-0.2, 0.16], [-0.12, -0.02]]), C.ivory, -0.01, { material: m, depth: 0.015 });
      angels.add(g);
      return g;
    };
    const flock = [0, 1, 2].map(makeAngel);
    const rest = leaf(o, 0.3);
    const stone = sphere(0.3, C.stoneD, { rough: 0.95 });
    stone.scale.set(1.2, 0.5, 0.8);
    place(rest, stone, -0.62, 0.13, 0);
    o.userData.ticks.push((t) => flock.forEach((g, k) => {
      const up = k !== 1;
      let p = (t * 0.09 + k * 0.33) % 1;
      if (!up) p = 1 - p;
      g.position.set((k - 1) * 0.12, 0.45 + p * 2.7, 0);
      const s = Math.min(1, Math.sin(p * Math.PI) * 3);
      g.scale.setScalar(Math.max(0.001, s));
    }));
    return done(o);
  },

  // 14 · Genesis 29–31
  veil() {
    const o = obj();
    const leah = leaf(o, -0.36);
    P(leah, S.ellipse(0, 1.3, 0.2, 0.34), C.r0, -0.01);
    P(leah, S.poly([[-0.36, 0.2], [0.36, 0.2], [0.2, 1.08], [0.23, 1.2], [0.1, 1.27], [-0.1, 1.27], [-0.23, 1.2], [-0.2, 1.08]]), C.r1);
    P(leah, S.circle(0, 1.42, 0.12), C.r1);
    const frame = leaf(o, -0.22);
    [-0.8, 0.8].forEach((x) => P(frame, S.rect(x - 0.05, 0, 0.1, 1.5), C.walnut));
    P(frame, S.band(0, 1.45, 0.75, 0.85, 0, Math.PI), C.walnut, 0.001);
    for (let k = 0; k <= 12; k++) {
      const a = (k / 12) * Math.PI;
      P(frame, S.circle(Math.cos(a) * 0.8, 1.45 + Math.sin(a) * 0.8, 0.055), k % 2 ? C.r3 : C.g3, 0.006, { depth: 0.02 });
    }
    const veilLeaf = leaf(o, -0.12);
    const v = new THREE.Shape();
    v.moveTo(-0.75, 1.45);
    v.absarc(0, 1.45, 0.75, Math.PI, 0, true);
    v.lineTo(0.75, 0.4);
    for (let k = 0; k < 6; k++) {
      const x0 = 0.75 - k * 0.25;
      v.quadraticCurveTo(x0 - 0.125, 0.28, x0 - 0.25, 0.4);
    }
    v.closePath();
    P(veilLeaf, v, '#fbe3d8', 0, { opacity: 0.62, emissive: 0.1, depth: 0.01, shadow: false });
    const flock = leaf(o, 0.26);
    sheep(flock, -0.66, 0.55, 0, 1);
    sheep(flock, 0.68, 0.5, 0.02, -1);
    return done(o);
  },

  // 15 · Genesis 32–36
  wrestle() {
    const o = obj();
    const dawn = leaf(o, -0.5);
    for (let k = 0; k < 9; k++) {
      const a = Math.PI * (0.1 + (k / 8) * 0.8);
      P(dawn, S.poly([[Math.cos(a - 0.03) * 1.05, 0.35 + Math.sin(a - 0.03) * 1.05], [Math.cos(a) * 1.35, 0.35 + Math.sin(a) * 1.35], [Math.cos(a + 0.03) * 1.05, 0.35 + Math.sin(a + 0.03) * 1.05]]),
        C.g3, k * 0.001, { emissive: 0.4, depth: 0.02 });
    }
    P(dawn, S.halfDisc(0, 0.35, 0.98), '#f0a95a', 0.01, { emissive: 0.45 });
    const ridge = leaf(o, -0.38);
    P(ridge, S.wave(-1.05, 1.05, 0.62, 0.12, 1.2, 0.5), C.r2);
    const ridge2 = leaf(o, -0.3);
    P(ridge2, S.wave(-1.05, 1.05, 0.42, 0.08, 1.8, 2.0), C.r1);
    const pair = leaf(o, -0.12);
    const J = C.ink, A = '#fdf6e6';
    P(pair, S.poly([[-0.78, 0.24], [-0.46, 0.24], [-0.14, 1.2], [-0.26, 1.32], [-0.4, 1.24]]), J);
    P(pair, S.circle(-0.13, 1.42, 0.105), J);
    P(pair, S.stroke([[-0.56, 0.62], [-0.72, 0.36], [-0.9, 0.24]], 0.08, 0.06), J);
    P(pair, S.stroke([[-0.3, 1.2], [0.08, 1.2], [0.34, 1.02]], 0.07, 0.06), J, 0.02);
    P(pair, S.poly([[0.8, 0.24], [0.48, 0.24], [0.16, 1.22], [0.28, 1.34], [0.42, 1.26]]), A, 0.01, { emissive: 0.35 });
    P(pair, S.circle(0.15, 1.46, 0.105), A, 0.01, { emissive: 0.35 });
    P(pair, S.stroke([[0.3, 1.24], [-0.06, 1.08], [-0.3, 0.96]], 0.07, 0.06), A, 0.015, { emissive: 0.35 });
    const river = leaf(o, 0.18);
    P(river, S.wave(-1.05, 1.05, 0.22, 0.05, 3, 0.4), '#8ea8c3');
    const river2 = leaf(o, 0.3);
    P(river2, S.wave(-1.0, 1.0, 0.12, 0.035, 4, 1.8), '#bfd0e2');
    return done(o);
  },

  // 16 · Genesis 37–38
  coat() {
    const o = obj();
    const stand = leaf(o, -0.36);
    P(stand, S.rect(-0.045, 0, 0.09, 2.08), C.walnut);
    P(stand, S.rect(-0.82, 1.94, 1.64, 0.07), C.walnut, 0.002);
    P(stand, S.rect(-0.3, 0, 0.6, 0.07), C.walnut, 0.002);
    const coat = leaf(o, -0.22);
    const yS = 1.92, yB = 0.3, wS = 0.36, wB = 0.64;
    const topAt = (x) => {
      const ax = Math.abs(x);
      return ax <= wS ? yS : yB + ((wB - ax) / (wB - wS)) * (yS - yB);
    };
    const colors = ['#c65a3f', '#d99a36', '#efc86b', '#6cbcaa', '#2f8c82', '#5667b8', '#8a5294'];
    const n = colors.length;
    for (let i = 0; i < n; i++) {
      const x0 = -wB + (i * 2 * wB) / n, x1 = -wB + ((i + 1) * 2 * wB) / n;
      const pts = [[x0, yB], [x1, yB]];
      for (let s = 0; s <= 8; s++) { const x = x1 - ((x1 - x0) * s) / 8; pts.push([x, topAt(x)]); }
      P(coat, S.poly(pts), colors[i], i * 0.0005);
    }
    [[-1, ['#2f8c82', '#efc86b']], [1, ['#d99a36', '#5667b8']]].forEach(([s, cs]) => {
      P(coat, S.poly([[s * 0.34, 1.92], [s * 0.66, 1.72], [s * 0.6, 1.6], [s * 0.3, 1.74]]), cs[0], 0.001);
      P(coat, S.poly([[s * 0.66, 1.72], [s * 0.86, 1.58], [s * 0.8, 1.46], [s * 0.6, 1.6]]), cs[1], 0.0015);
    });
    P(coat, S.ellipse(0, 1.93, 0.13, 0.09), C.t0, 0.004, { depth: 0.01 });
    const beltW = wB + ((wS - wB) * (1.18 - yB)) / (yS - yB);
    P(coat, S.rect(-beltW, 1.14, beltW * 2, 0.08), C.gold, 0.005, { depth: 0.012, metal: 0.4, rough: 0.45 });
    const stain = leaf(o, -0.19);
    P(stain, S.shaggy(0.3, 0.46, 0.18, 0.13, 14, 0.3, 41), '#7c1717', 0, { depth: 0.01 });
    P(stain, S.circle(0.12, 0.58, 0.035), '#7c1717', 0, { depth: 0.01 });
    const pit = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), mat('#0b2322', { flat: true, rough: 1 }));
    pit.rotation.x = -Math.PI / 2;
    place(o.userData.ground, pit, -0.72, 0.012, 0.48);
    const pitRim = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.045, 8, 28), mat(C.stoneD));
    pitRim.rotation.x = Math.PI / 2; pitRim.castShadow = true;
    place(o.userData.ground, pitRim, -0.72, 0.03, 0.48);
    return done(o);
  },

  // 17 · Genesis 39–40
  prison() {
    const o = obj();
    const win = leaf(o, -0.48);
    P(win, S.arch(-0.62, 0.6, 1.24, 1.6), C.t0);
    for (let k = 0; k < 5; k++) P(win, S.rect(-0.5 + k * 0.25 - 0.025, 0.6, 0.05, 1.4), '#c8d6d2', 0.004, { metal: 0.4, rough: 0.5 });
    P(win, S.rect(-0.62, 1.2, 1.24, 0.05), '#c8d6d2', 0.005, { metal: 0.4, rough: 0.5 });
    P(win, S.crescent(0.28, 1.78, 0.1), C.t4, 0.003, { emissive: 0.6, depth: 0.01 });
    const vine = leaf(o, -0.2);
    P(vine, S.stroke(curvePts((t) => [-0.82 + Math.sin(t * 5) * 0.08, t * 1.35], 20), 0.05, 0.025), '#5d7a4b');
    [[-0.72, 1.05], [-0.9, 0.78], [-0.7, 0.5]].forEach(([x, y]) => {
      for (let k = 0; k < 6; k++) P(vine, S.circle(x + ((k % 3) - 1) * 0.05, y - Math.floor(k / 3) * 0.06 - (k === 5 ? 0.06 : 0), 0.035), '#5e3a78', 0.002 + k * 0.0003, { depth: 0.02 });
    });
    const things = leaf(o, 0.02);
    place(things, goblet(C.gold, { metal: 0.75, rough: 0.28 }), -0.34, 0, 0);
    const basket = lathe([[0, 0], [0.24, 0], [0.28, 0.04], [0.34, 0.34], [0.32, 0.35], [0.0, 0.06]], '#ffffff', { map: weaveTexture('#b88d56', '#7a5630') });
    place(things, basket, 0.44, 0, 0);
    [[0.36, 0.42, 0.02], [0.52, 0.42, -0.04], [0.44, 0.52, 0.0]].forEach(([x, y, z]) => { const l = sphere(0.13, C.g3, { rough: 0.8 }); l.scale.set(1, 0.55, 0.8); place(things, l, x, y, z); });
    const birds = leaf(o, 0.1);
    [[0.3, 0.72, 1], [0.6, 0.66, -1]].forEach(([x, y, f]) => {
      P(birds, S.ellipse(x, y, 0.08, 0.045, 0.2 * f), C.ink, 0, { depth: 0.02 });
      P(birds, S.circle(x + 0.07 * f, y + 0.04, 0.03), C.ink, 0.001, { depth: 0.02 });
      P(birds, S.poly([[x + 0.1 * f, y + 0.04], [x + 0.15 * f, y + 0.03], [x + 0.1 * f, y + 0.02]]), C.g2, 0.002, { depth: 0.01 });
      P(birds, S.poly([[x - 0.07 * f, y], [x - 0.15 * f, y + 0.05], [x - 0.13 * f, y - 0.02]]), C.ink, 0.001, { depth: 0.02 });
    });
    return done(o);
  },

  // 18 · Genesis 41
  sheaves() {
    const o = obj();
    const thin = leaf(o, -0.36);
    for (let k = 0; k < 7; k++) {
      const x = -0.84 + k * 0.28;
      const pts = curvePts((t) => [x + t * t * 0.22, t * 1.2 - t * t * 0.28], 12);
      P(thin, S.stroke(pts, 0.035, 0.02), '#9fb6af', k * 0.001);
      const tip = pts[pts.length - 1];
      P(thin, S.ellipse(tip[0] + 0.03, tip[1] - 0.06, 0.035, 0.1, -0.8), '#b9c8c2', k * 0.001 + 0.002);
    }
    const sheaf = (lf, x, s, z) => {
      const pts = [[x - 0.14 * s, 0], [x + 0.14 * s, 0], [x + 0.05 * s, 0.55 * s], [x + 0.2 * s, 0.95 * s]];
      for (let k = 0; k <= 8; k++) {
        const xx = x + 0.2 * s - (k * 0.4 * s) / 8;
        pts.push([xx, (k % 2 ? 1.12 : 1.3) * s - Math.abs(xx - x) * 0.4]);
      }
      pts.push([x - 0.2 * s, 0.95 * s], [x - 0.05 * s, 0.55 * s]);
      P(lf, S.poly(pts), C.g2, z);
      for (let k = 0; k < 5; k++) {
        const a = -0.5 + k * 0.25;
        P(lf, S.ellipse(x + Math.sin(a) * 0.14 * s, 1.08 * s + Math.cos(a) * 0.08 * s, 0.04 * s, 0.12 * s, -a), C.g3, z + 0.004 + k * 0.0005, { depth: 0.02 });
      }
      P(lf, S.rect(x - 0.075 * s, 0.5 * s, 0.15 * s, 0.07 * s), C.t2, z + 0.006, { depth: 0.015 });
    };
    const back = leaf(o, -0.16);
    [-0.66, -0.22, 0.22, 0.66].forEach((x, k) => sheaf(back, x, 1.12, k * 0.002));
    const front = leaf(o, 0.06);
    [-0.44, 0, 0.44].forEach((x, k) => sheaf(front, x, 1.0, k * 0.002));
    return done(o);
  },

  // 19 · Genesis 42–45
  cup() {
    const o = obj();
    const back = leaf(o, -0.42);
    const sack2 = new THREE.Shape();
    sack2.moveTo(-0.95, 0); sack2.lineTo(-0.35, 0);
    sack2.quadraticCurveTo(-0.28, 0.5, -0.42, 0.78); sack2.lineTo(-0.36, 0.9); sack2.lineTo(-0.94, 0.9); sack2.lineTo(-0.88, 0.78);
    sack2.quadraticCurveTo(-1.02, 0.5, -0.95, 0);
    P(back, sack2, '#b39868');
    P(back, S.rect(-0.9, 0.76, 0.52, 0.04), C.walnut, 0.004, { depth: 0.01 });
    const sackLeaf = leaf(o, -0.02);
    const burlap = weaveTexture('#ccb286', '#9c8158');
    const sack = lathe([[0, 0], [0.34, 0.02], [0.47, 0.24], [0.5, 0.55], [0.42, 0.84], [0.3, 0.97], [0.31, 1.04], [0.4, 1.12], [0.37, 1.14]], '#ffffff', { map: burlap, rough: 0.95, seg: 64 });
    // Soft cloth: pleat the lathe with vertical folds that bunch up at the tied neck.
    const pos = sack.geometry.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
      const th = Math.atan2(z, x);
      const f = 1 + Math.sin(th * 9 + y * 3) * (0.025 + Math.max(0, y - 0.8) * 0.28) + Math.sin(th * 4) * 0.02;
      pos.setXYZ(k, x * f, y, z * f);
    }
    sack.geometry.computeVertexNormals();
    place(sackLeaf, sack, 0.2, 0, 0);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.025, 8, 30), mat(C.walnut));
    tie.rotation.x = Math.PI / 2;
    place(sackLeaf, tie, 0.2, 0.98, 0);
    const grain = new THREE.Mesh(new THREE.CircleGeometry(0.34, 30), mat(C.g3, { rough: 0.9 }));
    grain.rotation.x = -Math.PI / 2;
    place(sackLeaf, grain, 0.2, 1.08, 0);
    const silver = mat('#eef2f6', { metal: 0.8, rough: 0.22, unique: true, emissive: 0.08 });
    const cup = goblet('#e3e8ee', { material: silver });
    cup.scale.setScalar(0.95);
    place(sackLeaf, cup, 0.24, 0.92, 0.04);
    cup.rotation.z = -0.38;
    const spill = o.userData.ground;
    const r = rand;
    for (let k = 0; k < 22; k++) {
      const g = sphere(0.022, C.g3);
      g.scale.y = 0.6;
      place(spill, g, 0.62 + r() * 0.35, 0.015, 0.2 + r() * 0.4);
    }
    o.userData.ticks.push((t) => { silver.emissiveIntensity = 0.08 + Math.max(0, Math.sin(t * 1.3)) ** 12 * 0.6; });
    return done(o);
  },

  // 20 · Genesis 46–50
  coffin() {
    const o = obj();
    const back = leaf(o, -0.5);
    palm(back, -0.78, 1.9, C.t1);
    palm(back, 0.82, 1.5, C.t1, 0.01);
    const base = leaf(o, -0.26);
    const half = [[0.2, 0], [0.24, 0.1], [0.28, 0.6], [0.34, 1.1], [0.38, 1.45], [0.36, 1.62], [0.3, 1.72], [0.25, 1.8], [0.26, 1.95], [0.24, 2.12], [0.16, 2.26], [0, 2.3]];
    const outline = [...half.map(([x, y]) => [x, y + 0.12]), ...half.slice(0, -1).reverse().map(([x, y]) => [-x, y + 0.12])];
    P(base, S.poly(outline), C.t1, 0, { depth: 0.14 });
    const deco = leaf(o, -0.24);
    const Y = 0.12;
    P(deco, S.poly([[-0.36, 1.58 + Y], [-0.26, 1.95 + Y], [-0.24, 2.14 + Y], [-0.14, 2.27 + Y], [0, 2.3 + Y], [0.14, 2.27 + Y], [0.24, 2.14 + Y], [0.26, 1.95 + Y],
      [0.36, 1.58 + Y], [0.2, 1.6 + Y], [0.13, 1.8 + Y], [-0.13, 1.8 + Y], [-0.2, 1.6 + Y]]), C.gold, 0, { metal: 0.55, rough: 0.4 });
    for (let k = 0; k < 4; k++) P(deco, S.rect(-0.34 + k * 0.03, 1.62 + Y + k * 0.1, 0.1, 0.035), C.t0, 0.003, { depth: 0.01 });
    for (let k = 0; k < 4; k++) P(deco, S.rect(0.24 - k * 0.03, 1.62 + Y + k * 0.1, 0.1, 0.035), C.t0, 0.003, { depth: 0.01 });
    P(deco, S.ellipse(0, 1.98 + Y, 0.12, 0.16), '#e9c27a', 0.004, { metal: 0.3, rough: 0.45 });
    [[0.3, C.t3], [0.26, C.gold], [0.22, C.t2]].forEach(([r1, c], k) => P(deco, S.band(0, 1.7 + Y, r1 - 0.05, r1, Math.PI * 1.08, Math.PI * 1.92), c, 0.006 + k * 0.001, { depth: 0.012 }));
    P(deco, S.stroke([[-0.26, 1.2 + Y], [0.2, 1.46 + Y]], 0.07), C.gold, 0.008, { metal: 0.5, rough: 0.4 });
    P(deco, S.stroke([[0.26, 1.2 + Y], [-0.2, 1.46 + Y]], 0.07), C.t3, 0.009);
    P(deco, S.rect(-0.08, 0.28 + Y, 0.16, 0.86), C.cream, 0.004, { depth: 0.012 });
    for (let k = 0; k < 8; k++) {
      const yy = 0.34 + Y + k * 0.1;
      if (k % 3 === 0) P(deco, S.circle(0, yy + 0.03, 0.025), C.ink, 0.006, { depth: 0.01 });
      else P(deco, S.rect(-0.045, yy, 0.09, 0.025 + (k % 2) * 0.03), C.ink, 0.006, { depth: 0.01 });
    }
    const plinth = leaf(o, -0.02);
    place(plinth, box(0.95, 0.12, 0.5, C.stone), 0, 0.06, -0.12);
    return done(o);
  },
};
