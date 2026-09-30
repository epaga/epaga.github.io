// The Genesis room: an open pop-up book whose spread holds a horseshoe-shaped chamber.
// The path runs clockwise from the entrance (front left) to the door to Exodus (front right),
// through four coloured movements of five objects each.
import * as THREE from 'three';
import { S, card, mat, box, cyl, canvasTexture, mergeStatic } from './paper.js';
import { BUILDERS, C } from './objects.js';

const deg = Math.PI / 180;
export const R_OBJ = 11.5;
const R_MED = 9.6;
const R_RIB = [9.42, 9.74];
const RIB_A0 = 217 * deg, RIB_A1 = -37 * deg;
const FOCUS = new THREE.Vector3(0, 0, 4);
const PAGE_W = 16.8, PAGE_D = 26.5, BOOK_Z = -3.7, BLOCK_T = 0.55, COVER_T = 0.16;
const SERIF = '"Cormorant Garamond", Georgia, serif';
const SANS = 'Inter, system-ui, sans-serif';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
export const E = {
  linear: (t) => t,
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  back: (t) => { const c1 = 1.55, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};

export function stationAngle(i) {
  const z = Math.floor(i / 5), k = i % 5;
  return (180 - 60 * z + 22 - 11 * k) * deg;
}
const zoneA0 = (z) => (210 - 60 * z) * deg;
const zoneA1 = (z) => (150 - 60 * z) * deg;
const polar = (r, a, y = 0) => new THREE.Vector3(Math.cos(a) * r, y, -Math.sin(a) * r);
const ribbonU = (a) => (RIB_A0 - a) / (RIB_A0 - RIB_A1);

function mixHex(a, b, t) {
  return '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
}

// Annular sector on the floor with u running along the path and v running outward.
function sectorGeometry(r0, r1, a0, a1, seg = 120) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, a = lerp(a0, a1, t);
    pos.push(Math.cos(a) * r0, 0, -Math.sin(a) * r0, Math.cos(a) * r1, 0, -Math.sin(a) * r1);
    uv.push(t, 0, t, 1);
  }
  for (let i = 0; i < seg; i++) {
    const a = i * 2;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Curved backdrop panel with a skyline top edge.
function stripGeometry(r, a0, a1, heightFn, seg = 160) {
  const pos = [], uv = [], idx = [];
  const arc = Math.abs(a1 - a0) * r;
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, a = lerp(a0, a1, t), h = heightFn(t);
    pos.push(Math.cos(a) * r, 0, -Math.sin(a) * r, Math.cos(a) * r, h, -Math.sin(a) * r);
    uv.push((t * arc) / 3, 0, (t * arc) / 3, h / 3);
  }
  for (let i = 0; i < seg; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Text along a circle. Letters point outward by default; `inward` flips them so text on the
// near side of the dial reads upright from the front.
function arcText(g, text, cx, cy, r, aCenter, spacing = 0, inward = false) {
  const widths = [...text].map((ch) => g.measureText(ch).width);
  const total = widths.reduce((s, w) => s + w, 0) + spacing * (text.length - 1);
  const dir = inward ? 1 : -1;
  let a = aCenter - (dir * total) / 2 / r;
  [...text].forEach((ch, k) => {
    const w = widths[k];
    const ac = a + (dir * w) / 2 / r;
    g.save();
    g.translate(cx + Math.cos(ac) * r, cy - Math.sin(ac) * r);
    g.rotate(Math.PI / 2 - ac + (inward ? Math.PI : 0));
    g.fillText(ch, 0, 0);
    g.restore();
    a += (dir * (w + spacing)) / r;
  });
}

export function applyPop(o, p) {
  o.visible = p > 0.001;
  const leaves = o.userData.leaves, n = leaves.length, spread = 0.38;
  leaves.forEach((lf, k) => {
    const s = n > 1 ? (k / (n - 1)) * spread : 0;
    const q = clamp01((p - s) / (1 - spread));
    lf.rotation.x = -(Math.PI / 2) * (1 - E.back(q));
  });
  o.userData.ground.scale.setScalar(Math.max(0.001, E.out(clamp01(p * 1.4))));
}

export class Room {
  constructor(canvas, { zones, stations, onHover, onPick, onPop }) {
    this.canvas = canvas;
    this.zones = zones;
    this.data = stations;
    this.onHover = onHover || (() => {});
    this.onPick = onPick || (() => {});
    this.onPop = onPop || (() => {});
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.lowPower = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
    this.time = 0;
    this.tweens = [];
    this.stations = [];
    this.interactive = false;
    this.pickMode = 'walk';
    this.look = { yaw: 0, pitch: 0, zoom: 1, tyaw: 0, tpitch: 0, tzoom: 1 };
    this.frame = { x: 0, y: 0, tx: 0, ty: 0 };
    this.mouse = null;
    this.hovered = -1;
    this.ribbon = { walked: 0, target: 0 };
    this.lightMix = { v: 0, t: 0 };
    this.maxDt = 0.25;

    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.lowPower ? 1.5 : 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.08;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.5, 400);
    this.pose = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
    this.camLoc = { kind: 'intro' };
    this.camTween = null;
    this.raycaster = new THREE.Raycaster();

    this.resize();
    addEventListener('resize', () => this.resize());
    this.bindPointer();
  }

  // ---------- building ----------
  build() {
    this.buildLights();
    this.buildTable();
    this.buildBook();
    this.buildFloor();
    this.buildBackdrops();
    this.buildArchitecture();
    this.buildStations();
    this.buildDust();
    this.setBookClosed(true);
    this.poseOf({ kind: 'intro' }, this.pose);
  }

  buildLights() {
    const s = this.scene;
    const env = canvasTexture(256, 128, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#fff3dc'); grd.addColorStop(0.45, '#d9c3a0'); grd.addColorStop(0.55, '#6d5a52'); grd.addColorStop(1, '#241c28');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,250,235,0.9)'; g.fillRect(w * 0.18, h * 0.12, w * 0.14, h * 0.14);
    });
    env.mapping = THREE.EquirectangularReflectionMapping;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    s.environment = pmrem.fromEquirectangular(env).texture;
    s.environmentIntensity = 0.35;
    pmrem.dispose();
    this.hemi = new THREE.HemisphereLight('#fff2dc', '#2c2442', 1.15);
    s.add(this.hemi);
    const key = (this.key = new THREE.DirectionalLight('#ffe6c4', 2.5));
    key.position.set(-14, 30, 18);
    key.target.position.set(0, 0, -3);
    key.castShadow = true;
    key.shadow.mapSize.setScalar(this.lowPower ? 1024 : 2048);
    Object.assign(key.shadow.camera, { left: -21, right: 21, top: 21, bottom: -21, near: 5, far: 80 });
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.025;
    s.add(key, key.target);
    const rim = (this.rim = new THREE.DirectionalLight('#a9b8ff', 0.55));
    rim.position.set(18, 14, -22);
    s.add(rim);
    const spot = (this.spot = new THREE.SpotLight('#fff0d4', 0, 0, 0.42, 0.8, 0));
    spot.castShadow = !this.lowPower;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.bias = -0.0005;
    spot.shadow.normalBias = 0.02;
    spot.position.set(0, 12, 0);
    s.add(spot, spot.target);
    this.spotGoal = { pos: new THREE.Vector3(0, 12, 0), target: new THREE.Vector3() };
  }

  buildTable() {
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.ShadowMaterial({ opacity: 0.5 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -BLOCK_T - COVER_T - 0.005;
    shadow.receiveShadow = true;
    this.scene.add(shadow);
    const glowTex = canvasTexture(512, 512, (g, w, h) => {
      const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      grd.addColorStop(0, 'rgba(255,214,160,0.40)');
      grd.addColorStop(0.45, 'rgba(210,150,110,0.12)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(95, 95), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(0, shadow.position.y - 0.01, BOOK_Z);
    this.scene.add(glow);
  }

  pageTexture(right) {
    return canvasTexture(1024, 1616, (g, w, h) => {
      const grd = g.createLinearGradient(right ? 0 : w, 0, right ? w : 0, 0);
      grd.addColorStop(0, '#d9ccad'); grd.addColorStop(0.05, '#ece2c9'); grd.addColorStop(0.3, '#f4ecd9'); grd.addColorStop(1, '#f1e7d1');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      const img = g.getImageData(0, 0, w, h);
      for (let i = 0; i < img.data.length; i += 4) { const n = (Math.random() - 0.5) * 10; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
      g.putImageData(img, 0, 0);
      const inner = right ? 70 : w - 70, outer = right ? w - 110 : 110;
      const x0 = Math.min(inner, outer), x1 = Math.max(inner, outer), col = (x1 - x0 - 40) / 2;
      g.fillStyle = 'rgba(70,56,40,0.10)';
      for (let c = 0; c < 2; c++) {
        for (let y = 170; y < h - 190; y += 24) {
          const cx = x0 + c * (col + 40);
          const len = (y / 24) % 11 === 10 ? col * (0.3 + Math.random() * 0.4) : col;
          let x = cx;
          while (x < cx + len - 10) { const wd = 14 + Math.random() * 46; g.fillRect(x, y, Math.min(wd, cx + len - x), 7); x += wd + 9; }
        }
      }
      g.fillStyle = 'rgba(64,50,36,0.62)';
      g.textAlign = 'center';
      g.font = `italic 500 30px ${SERIF}`;
      g.fillText(right ? '“…and he was put in a coffin in Egypt.”  50:26' : '“In the beginning God created the heaven and the earth.”  1:1', w / 2, h - 86);
      g.font = `600 22px ${SANS}`;
      g.letterSpacing = '8px';
      g.fillText('GENESIS', w / 2, 98);
      g.fillText(right ? '50' : '1', right ? w - 120 : 120, h - 86);
    });
  }

  coverTexture() {
    return canvasTexture(1024, 1616, (g, w, h) => {
      g.translate(w / 2, h / 2); g.rotate(Math.PI); g.translate(-w / 2, -h / 2);
      g.fillStyle = '#1b2045'; g.fillRect(0, 0, w, h);
      g.globalAlpha = 0.18;
      for (let y = 0; y < h; y += 3) { g.fillStyle = y % 6 ? '#0e1230' : '#2b3266'; g.fillRect(0, y, w, 1); }
      for (let x = 0; x < w; x += 3) { g.fillStyle = '#0e1230'; g.fillRect(x, 0, 1, h); }
      g.globalAlpha = 1;
      const gold = g.createLinearGradient(0, 0, w, h);
      gold.addColorStop(0, '#f1d28a'); gold.addColorStop(0.5, '#c79a45'); gold.addColorStop(1, '#ecc77a');
      g.strokeStyle = gold; g.fillStyle = gold;
      g.lineWidth = 5; g.strokeRect(58, 58, w - 116, h - 116);
      g.lineWidth = 2; g.strokeRect(78, 78, w - 156, h - 156);
      [[78, 78], [w - 78, 78], [78, h - 78], [w - 78, h - 78]].forEach(([x, y]) => { g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-12, -12, 24, 24); g.restore(); });
      g.textAlign = 'center';
      g.font = `600 34px ${SANS}`; g.letterSpacing = '16px';
      g.fillText('66 ROOMS', w / 2 + 8, 210);
      const cy = 560;
      g.lineWidth = 4; g.beginPath(); g.arc(w / 2, cy, 150, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 2; g.beginPath(); g.arc(w / 2, cy, 132, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(w / 2, cy + 20, 46, Math.PI, 0); g.fill();
      for (let k = 0; k < 7; k++) {
        const a = Math.PI * (1.2 + (0.6 * k) / 6), r0 = 58, r1 = k % 2 ? 98 : 118;
        g.beginPath();
        g.moveTo(w / 2 + Math.cos(a - 0.08) * r0, cy + 20 + Math.sin(a - 0.08) * r0);
        g.lineTo(w / 2 + Math.cos(a) * r1, cy + 20 + Math.sin(a) * r1);
        g.lineTo(w / 2 + Math.cos(a + 0.08) * r0, cy + 20 + Math.sin(a + 0.08) * r0);
        g.fill();
      }
      for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(w / 2 - 90, cy + 40 + k * 22); g.bezierCurveTo(w / 2 - 40, cy + 26 + k * 22, w / 2 + 40, cy + 54 + k * 22, w / 2 + 90, cy + 40 + k * 22); g.lineWidth = 4; g.stroke(); }
      g.font = `600 176px ${SERIF}`; g.letterSpacing = '18px';
      g.fillText('GENESIS', w / 2 + 9, 930);
      g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2 - 220, 990); g.lineTo(w / 2 + 220, 990); g.stroke();
      g.save(); g.translate(w / 2, 990); g.rotate(Math.PI / 4); g.fillRect(-9, -9, 18, 18); g.restore();
      g.font = `italic 500 62px ${SERIF}`; g.letterSpacing = '1px';
      g.fillText('The Book of Beginnings', w / 2, 1090);
      g.font = `600 28px ${SANS}`; g.letterSpacing = '12px';
      g.fillText('ROOM I  OF  LXVI', w / 2 + 6, h - 190);
    });
  }

  buildBook() {
    const book = (this.book = new THREE.Group());
    book.position.z = BOOK_Z;
    const edge = canvasTexture(64, 512, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#e9cf8d'); grd.addColorStop(0.5, '#c99f4f'); grd.addColorStop(1, '#e3c27a');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 4) { g.fillStyle = `rgba(90,60,20,${0.1 + Math.random() * 0.15})`; g.fillRect(0, y, w, 1); }
    });
    const edgeM = mat('#ffffff', { map: edge, flat: true, rough: 0.45, metal: 0.35 });
    const cloth = mat('#1b2045', { rough: 0.85 });
    const half = (right) => {
      const g = new THREE.Group();
      const sx = right ? 1 : -1;
      const top = mat('#ffffff', { map: this.pageTexture(right), flat: true, rough: 0.95 });
      const block = new THREE.Mesh(new THREE.BoxGeometry(PAGE_W, BLOCK_T, PAGE_D), [edgeM, edgeM, top, edgeM, edgeM, edgeM]);
      block.position.set((sx * PAGE_W) / 2, -BLOCK_T / 2, 0);
      block.castShadow = block.receiveShadow = true;
      const coverFace = right ? mat('#ffffff', { map: this.coverTexture(), flat: true, rough: 0.7, metal: 0.1 }) : cloth;
      const cover = new THREE.Mesh(new THREE.BoxGeometry(PAGE_W + 0.45, COVER_T, PAGE_D + 0.8), [cloth, cloth, cloth, coverFace, cloth, cloth]);
      cover.position.set((sx * (PAGE_W + 0.45)) / 2, -BLOCK_T - COVER_T / 2, 0);
      cover.castShadow = cover.receiveShadow = true;
      g.add(block, cover);
      return g;
    };
    this.bookLeft = half(false);
    this.bookRight = half(true);
    const spine = (this.spine = new THREE.Mesh(new THREE.CylinderGeometry(BLOCK_T + COVER_T + 0.02, BLOCK_T + COVER_T + 0.02, PAGE_D + 0.8, 28, 1, false, 0, Math.PI), cloth));
    spine.rotation.x = Math.PI / 2;
    spine.castShadow = true;
    const ribbon = card(S.poly([[-0.18, 0], [0.18, 0], [0.18, -2.4], [0, -2.1], [-0.18, -2.4]]), '#8e2230', { depth: 0.01 });
    ribbon.rotation.x = -Math.PI / 2;
    ribbon.position.set(0.9, 0.001, PAGE_D / 2 - 0.02);
    this.bookmark = ribbon;
    book.add(this.bookLeft, this.bookRight, spine, ribbon);
    this.scene.add(book);
  }

  setBookClosed(closed) {
    this.bookRight.rotation.z = closed ? Math.PI : 0;
    this.spine.scale.x = closed ? 1 : 0.001;
    this.bookmark.visible = !closed;
    this.roomRoot.visible = !closed;
  }

  buildFloor() {
    const root = (this.roomRoot = new THREE.Group());
    this.scene.add(root);
    this.floorMats = [];
    const floorMat = (map, order, basic = false) => {
      const m = basic
        ? new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, opacity: 0 })
        : new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, opacity: 0, roughness: 0.95 });
      m.userData.order = order;
      this.floorMats.push(m);
      return m;
    };
    const addFloor = (geo, m, y, order) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.y = y;
      mesh.renderOrder = order;
      mesh.receiveShadow = true;
      root.add(mesh);
      return mesh;
    };

    this.zones.forEach((z, k) => {
      const tex = canvasTexture(1024, 256, (g, w, h) => {
        const grd = g.createLinearGradient(0, h, 0, 0);
        grd.addColorStop(0, mixHex(z.color, '#f6eedd', 0.78));
        grd.addColorStop(0.5, mixHex(z.color, '#f3e9d4', 0.6));
        grd.addColorStop(1, mixHex(z.color, '#e9dcc2', 0.42));
        g.fillStyle = grd; g.fillRect(0, 0, w, h);
        g.fillStyle = mixHex(z.color, '#000000', 0.1);
        g.globalAlpha = 0.35;
        [0.08, 0.1, 0.94].forEach((v) => g.fillRect(0, h - v * h, w, 2));
        g.globalAlpha = 1;
      });
      const gap = 0.6 * deg;
      addFloor(sectorGeometry(7.7, 14.5, zoneA0(k) - gap, zoneA1(k) + gap), floorMat(tex, 1), 0.006, 1);
      const label = canvasTexture(2048, 160, (g, w, h) => {
        g.fillStyle = mixHex(z.color, '#1b1622', 0.35);
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = `600 58px ${SANS}`;
        g.letterSpacing = '22px';
        g.fillText(`${z.numeral}  ·  ${z.name.toUpperCase()}  ·  ${z.chapters[0]}–${z.chapters[1]}`, w / 2 + 11, h / 2 + 4);
      });
      addFloor(sectorGeometry(7.95, 8.6, zoneA0(k) - 4 * deg, zoneA1(k) + 4 * deg), floorMat(label, 2, true), 0.012, 2);
    });

    const dial = canvasTexture(2048, 2048, (g, w, h) => this.drawDial(g, w, h));
    const dialMesh = addFloor(new THREE.CircleGeometry(6.9, 96), floorMat(dial, 2), 0.01, 2);
    dialMesh.rotation.x = -Math.PI / 2;

    const base = canvasTexture(2048, 32, (g, w, h) => {
      g.fillStyle = 'rgba(190,150,70,0.55)'; g.fillRect(0, 0, w, 3); g.fillRect(0, h - 3, w, 3);
      g.fillStyle = 'rgba(250,244,230,0.9)'; g.fillRect(0, 3, w, h - 6);
      g.fillStyle = 'rgba(190,150,70,0.45)';
      for (let x = 0; x < w; x += 18) g.fillRect(x, h / 2 - 1, 9, 2);
    });
    this.ribbonBaseMat = floorMat(base, 3, true);
    addFloor(sectorGeometry(R_RIB[0], R_RIB[1], RIB_A0, RIB_A1, 200), this.ribbonBaseMat, 0.016, 3);
    const walked = canvasTexture(512, 8, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, w, 0);
      grd.addColorStop(0, 'rgba(255,208,110,1)'); grd.addColorStop(0.47, 'rgba(255,214,120,1)'); grd.addColorStop(0.5, 'rgba(255,240,200,0.9)'); grd.addColorStop(0.53, 'rgba(255,214,120,0)'); grd.addColorStop(1, 'rgba(255,214,120,0)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    });
    walked.wrapS = THREE.ClampToEdgeWrapping;
    walked.repeat.set(0.5, 1);
    walked.offset.set(0.5, 0);
    this.walkedTex = walked;
    const walkedMat = new THREE.MeshBasicMaterial({ map: walked, transparent: true, depthWrite: false, color: '#ffe2a0' });
    addFloor(sectorGeometry(R_RIB[0] + 0.05, R_RIB[1] - 0.05, RIB_A0, RIB_A1, 200), walkedMat, 0.02, 4);
  }

  drawDial(g, w, h) {
    const cx = w / 2, cy = h / 2, R = w / 2 - 6;
    const inkGold = 'rgba(170,128,52,0.9)';
    g.fillStyle = 'rgba(250,244,230,0.55)';
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
    g.strokeStyle = inkGold;
    [[R - 2, 4], [R - 16, 1.5], [R * 0.64, 1.5], [R * 0.6, 3]].forEach(([r, lw]) => { g.lineWidth = lw; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); });
    this.zones.forEach((z, k) => {
      const a0 = zoneA0(k) - 1 * deg, a1 = zoneA1(k) + 1 * deg;
      g.strokeStyle = z.color;
      g.lineWidth = R * 0.12;
      g.beginPath(); g.arc(cx, cy, R * 0.86, -a0, -a1, false); g.stroke();
      g.fillStyle = '#fbf6ea';
      g.font = `600 44px ${SANS}`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      arcText(g, `${z.numeral} · ${z.name.toUpperCase()}`, cx, cy, R * 0.86, (zoneA0(k) + zoneA1(k)) / 2, 10);
    });
    g.fillStyle = 'rgba(60,46,34,0.82)';
    g.font = `600 44px ${SERIF}`;
    for (let i = 0; i < 20; i++) {
      const a = stationAngle(i);
      g.beginPath(); g.arc(cx + Math.cos(a) * R * 0.71, cy - Math.sin(a) * R * 0.71, 8, 0, Math.PI * 2); g.fill();
      arcText(g, `${i + 1}`, cx, cy, R * 0.665, a, 0);
    }
    g.save();
    g.strokeStyle = inkGold; g.lineWidth = 3; g.setLineDash([14, 12]);
    g.beginPath(); g.arc(cx, cy, R * 0.71, -RIB_A0, -RIB_A1, false); g.stroke();
    g.restore();
    g.fillStyle = 'rgba(80,62,44,0.8)';
    g.font = `600 30px ${SANS}`;
    arcText(g, 'ENTER', cx, cy, R * 0.9, 222 * deg, 8, true);
    arcText(g, 'EXODUS', cx, cy, R * 0.9, -42 * deg, 8, true);
    for (let k = 0; k < 24; k++) {
      const a = k * 15 * deg;
      g.strokeStyle = inkGold; g.lineWidth = 2;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * R * 0.52, cy - Math.sin(a) * R * 0.52); g.lineTo(cx + Math.cos(a) * R * 0.57, cy - Math.sin(a) * R * 0.57); g.stroke();
    }
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillStyle = 'rgba(38,30,44,0.9)';
    g.font = `600 210px ${SERIF}`; g.letterSpacing = '20px';
    g.fillText('GENESIS', cx + 10, cy + 40);
    g.letterSpacing = '0px';
    g.fillStyle = 'rgba(150,108,40,0.95)';
    g.font = `italic 500 64px ${SERIF}`;
    g.fillText('In the beginning…', cx, cy - 190);
    g.fillStyle = 'rgba(60,46,34,0.75)';
    g.font = `600 36px ${SANS}`; g.letterSpacing = '12px';
    g.fillText('50 CHAPTERS · 4 MOVEMENTS · 20 OBJECTS', cx + 6, cy + 150);
    g.letterSpacing = '0px';
    g.font = `italic 500 52px ${SERIF}`;
    g.fillText('walk clockwise from the entrance', cx, cy + 250);
  }

  buildBackdrops() {
    this.backdrops = [];
    const decor = (grp, mesh, r, a, y) => {
      mesh.position.copy(polar(r, a, y));
      mesh.lookAt(0, y, 0);
      grp.add(mesh);
      return mesh;
    };
    const taper = (t, k) => {
      const edge = k === 0 ? t : k === 3 ? 1 - t : 1;
      return k === 0 || k === 3 ? 0.55 + 0.45 * Math.min(1, edge * 2.2) : 1;
    };
    const pyramids = (t) => Math.max(0, ...[[0.22, 0.12, 1.7], [0.42, 0.1, 1.25], [0.72, 0.13, 1.9]].map(([c, wdt, H]) => H * (1 - Math.abs(t - c) / wdt)));
    const specs = [
      { layers: [[14.2, C.i1, (t) => 5.3 + Math.sin(t * 9) * 0.2], [13.6, C.i2, (t) => 2.4 + Math.sin(t * 19 + 1) * 0.3 + Math.sin(t * 53) * 0.08], [13.05, C.i3, (t) => 1.15 + Math.sin(t * 31) * 0.14]] },
      { layers: [[14.2, C.g4, (t) => 5.0 + Math.sin(t * 7 + 1) * 0.2], [13.6, C.g3, (t) => 2.0 + Math.sin(t * 8 + 0.5) * 0.5 + Math.sin(t * 23) * 0.12], [13.05, C.g2, (t) => 1.0 + Math.sin(t * 13 + 2) * 0.3]] },
      { layers: [[14.2, C.r4, (t) => 5.1 + Math.sin(t * 8) * 0.2], [13.6, C.r3, (t) => 2.1 + Math.abs(Math.sin(t * 11)) * 0.9 + Math.sin(t * 37) * 0.1], [13.05, C.r2, (t) => 1.05 + Math.sin(t * 17 + 1) * 0.25]] },
      { layers: [[14.2, C.t4, (t) => 5.0 + Math.sin(t * 8 + 2) * 0.2], [13.6, C.t3, (t) => 1.1 + pyramids(t) + Math.sin(t * 29) * 0.05], [13.05, C.t2, (t) => 0.8 + Math.sin(t * 40) * 0.07]] },
    ];
    specs.forEach((sp, k) => {
      const grp = new THREE.Group();
      const a0 = zoneA0(k) + 1.5 * deg, a1 = zoneA1(k) - 1.5 * deg;
      sp.layers.forEach(([r, color, fn], li) => {
        const mesh = new THREE.Mesh(stripGeometry(r, a0, a1, (t) => fn(t) * taper(t, k)), mat(color, { double: true, rough: 0.92 }));
        mesh.receiveShadow = true;
        mesh.castShadow = li > 0;
        grp.add(mesh);
      });
      const A = (t) => lerp(a0, a1, t);
      if (k === 0) {
        decor(grp, card(S.crescent(0, 0, 0.55), C.i4, { emissive: 0.5, depth: 0.04 }), 14.1, A(0.25), 3.9);
        decor(grp, card(S.circle(0, 0, 0.62), '#f3c863', { emissive: 0.7, depth: 0.04 }), 14.1, A(0.72), 3.6);
        for (let s = 0; s < 34; s++) {
          const t = (s * 0.618) % 1, y = 2.8 + ((s * 0.37) % 1) * 2.2;
          decor(grp, card(S.star(0, 0, 0.05 + (s % 3) * 0.03, 0.02, 4), C.goldL, { emissive: 0.9, depth: 0.02, shadow: false }), 14.12, A(t), y);
        }
      } else if (k === 1) {
        decor(grp, card(S.circle(0, 0, 0.95), '#fbe7b2', { emissive: 0.55, depth: 0.04 }), 14.1, A(0.55), 2.7);
        [[0.3, 3.9], [0.36, 4.1], [0.42, 3.8]].forEach(([t, y]) => decor(grp, card(S.stroke([[-0.16, 0.06], [0, 0], [0.16, 0.06]], 0.035), C.g0, { depth: 0.02 }), 14.1, A(t), y));
        [[0.2, 1.9], [0.84, 1.6]].forEach(([t, hh]) => { const lf = new THREE.Group(); palmFlat(lf, hh, C.g1); decor(grp, lf, 13.3, A(t), 0.2); });
      } else if (k === 2) {
        decor(grp, card(S.circle(0, 0, 1.05), '#fde0c6', { emissive: 0.5, depth: 0.04 }), 14.1, A(0.66), 2.25);
        [[0.2, 4.1], [0.45, 4.4], [0.85, 3.9]].forEach(([t, y], s) => {
          const cl = new THREE.Group();
          [[-0.35, 0, 0.3], [0, 0.12, 0.4], [0.38, 0, 0.3]].forEach(([x, yy, r]) => cl.add(card(S.circle(x, yy, r), '#fdf1ea', { depth: 0.03, emissive: 0.15 })));
          decor(grp, cl, 14.1, A(t), y + s * 0.1);
        });
      } else {
        decor(grp, card(S.circle(0, 0, 0.8), '#f6de9a', { emissive: 0.6, depth: 0.04 }), 14.1, A(0.3), 3.8);
        [[0.12, 1.7], [0.58, 2.0], [0.9, 1.5]].forEach(([t, hh]) => { const lf = new THREE.Group(); palmFlat(lf, hh, C.t1); decor(grp, lf, 12.95, A(t), 0.3); });
      }
      grp.children.filter((c) => c.isGroup).forEach((c) => { mergeStatic(c); });
      mergeStatic(grp);
      grp.scale.y = 0.001;
      grp.visible = false;
      this.roomRoot.add(grp);
      this.backdrops.push(grp);
    });
  }

  buildArchitecture() {
    this.architecture = [];
    const addUp = (obj) => { obj.scale.y = 0.001; obj.visible = false; this.roomRoot.add(obj); this.architecture.push(obj); return obj; };
    [150, 90, 30].forEach((d) => {
      const g = new THREE.Group();
      g.position.copy(polar(12.45, d * deg));
      const col = cyl(0.13, 0.16, 3.2, C.ivory, { rough: 0.7 });
      col.position.y = 1.6;
      g.add(col);
      [0.3, 2.9].forEach((y) => { const band = cyl(0.19, 0.19, 0.08, C.gold, { metal: 0.6, rough: 0.35 }); band.position.y = y; g.add(band); });
      const top = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), mat(C.gold, { metal: 0.6, rough: 0.3 }));
      top.position.y = 3.45; top.castShadow = true;
      g.add(top);
      addUp(g);
    });
    const plaqueTex = (title, sub, dark) => canvasTexture(512, 160, (g, w, h) => {
      g.fillStyle = dark ? '#123f3c' : '#f6eedd'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#c9a14f'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20);
      g.fillStyle = dark ? '#f1d084' : '#2a2233';
      g.textAlign = 'center';
      g.font = `600 64px ${SERIF}`; g.letterSpacing = '10px';
      g.fillText(title, w / 2 + 5, 86);
      g.font = `600 22px ${SANS}`; g.letterSpacing = '6px';
      g.fillText(sub, w / 2 + 3, 128);
    });
    const gate = (a, title, sub, closed) => {
      const g = new THREE.Group();
      g.position.copy(polar(R_OBJ, a));
      g.lookAt(FOCUS.x, 0, FOCUS.z);
      const frameC = closed ? C.t1 : C.ivory;
      [-0.82, 0.82].forEach((x) => { const p = card(S.rect(-0.14, 0, 0.28, 2.3), frameC, { depth: 0.3 }); p.position.set(x, 0, 0.15); g.add(p); });
      const archTop = card(S.band(0, 2.3, 0.68, 0.96, 0, Math.PI), frameC, { depth: 0.3 });
      archTop.position.z = 0.15;
      g.add(archTop);
      const trim = card(S.band(0, 2.3, 0.66, 0.7, 0, Math.PI), C.gold, { depth: 0.02, metal: 0.6, rough: 0.35 });
      trim.position.z = 0.17;
      g.add(trim);
      if (closed) {
        [-1, 1].forEach((s) => {
          const door = card(S.rect(s < 0 ? -0.68 : 0, 0, 0.68, 2.3), C.t2, { depth: 0.06 });
          door.position.z = 0.02;
          g.add(door);
          const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), mat(C.gold, { metal: 0.7, rough: 0.3 }));
          knob.position.set(s * 0.12, 1.1, 0.06);
          g.add(knob);
        });
        const arcDoor = card(S.halfDisc(0, 2.3, 0.68), C.t2, { depth: 0.06 });
        arcDoor.position.z = 0.02;
        g.add(arcDoor);
        g.userData.pick = { type: 'exit' };
      }
      const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.47), new THREE.MeshStandardMaterial({ map: plaqueTex(title, sub, closed), roughness: 0.8 }));
      plaque.position.set(0, 3.55, 0.2);
      g.add(plaque);
      g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      return addUp(g);
    };
    gate(214 * deg, 'GENESIS', 'ENTER HERE', false);
    this.exitGate = gate(-34 * deg, 'EXODUS', 'NEXT ROOM', true);
  }

  medallionTexture(i, blank) {
    const z = this.zones[this.data[i].zone];
    const [a, b] = this.data[i].chapters;
    return canvasTexture(256, 256, (g) => {
      g.fillStyle = blank ? '#efe5cf' : '#fbf6ea';
      g.beginPath(); g.arc(128, 128, 126, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#c9a14f'; g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 118, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = z.color; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 104, 0, Math.PI * 2); g.stroke();
      g.textAlign = 'center';
      if (blank) {
        g.fillStyle = z.color; g.font = `600 120px ${SERIF}`; g.fillText('?', 128, 168);
      } else {
        g.fillStyle = '#231d2b'; g.font = `600 108px ${SERIF}`; g.fillText(`${i + 1}`, 128, 150);
        g.fillStyle = mixHex(z.color, '#231d2b', 0.35); g.font = `600 26px ${SANS}`; g.letterSpacing = '2px';
        g.fillText(a === b ? `${a}` : `${a}–${b}`, 128, 196);
      }
    });
  }

  buildStations() {
    this.pickables = [];
    this.camParams = this.data.map((d) => ({ dist: 6.6, height: 2.9, target: 1.25, ...(d.cam || {}) }));
    const noteMat = mat(C.ivory, { rough: 0.8 });
    this.data.forEach((d, i) => {
      const a = stationAngle(i);
      const zc = this.zones[d.zone].color;
      const group = new THREE.Group();
      group.position.copy(polar(R_OBJ, a));
      group.lookAt(FOCUS.x, 0, FOCUS.z);
      const plinth = new THREE.Group();
      const top = cyl(0.98, 1.02, 0.1, '#f7f0e0', { rough: 0.8 }, 56);
      top.position.y = 0.05;
      const rim = cyl(1.07, 1.1, 0.05, zc, { rough: 0.7 }, 56);
      rim.position.y = 0.025;
      plinth.add(top, rim);
      plinth.scale.y = 0.001;
      plinth.visible = false;
      group.add(plinth);
      const holder = new THREE.Group();
      holder.position.y = 0.1;
      const o = BUILDERS[d.id]();
      o.userData.leaves.forEach(mergeStatic);
      mergeStatic(o.userData.ground);
      holder.add(o);
      group.add(holder);
      holder.userData.pick = { type: 'station', index: i };
      applyPop(o, 0);
      this.roomRoot.add(group);

      // Medallion: a gold disc with a paper face whose text reads upright from this station's camera.
      const med = new THREE.Group();
      med.position.copy(polar(R_MED, a, 0.005));
      const away = med.position.clone().sub(FOCUS).setY(0).normalize();
      med.rotation.y = Math.atan2(-away.x, -away.z);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.05, 56), mat(C.gold, { metal: 0.6, rough: 0.35 }));
      disc.position.y = 0.025;
      disc.receiveShadow = true;
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.5, 56), new THREE.MeshStandardMaterial({ map: this.medallionTexture(i, false), roughness: 0.7 }));
      face.rotation.x = -Math.PI / 2;
      face.position.y = 0.052;
      face.receiveShadow = true;
      med.add(disc, face);
      med.userData.pick = { type: 'station', index: i };
      med.scale.setScalar(0.001);
      med.visible = false;
      this.roomRoot.add(med);

      const note = new THREE.Group();
      const nA = card(S.rect(-0.2, 0, 0.4, 0.3), C.ivory, { depth: 0.01, material: noteMat });
      nA.rotation.x = -0.35; nA.position.z = 0.05;
      const nB = card(S.rect(-0.2, 0, 0.4, 0.3), C.ivory, { depth: 0.01, material: noteMat });
      nB.rotation.x = 0.35; nB.rotation.y = Math.PI; nB.position.z = -0.05;
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), mat('#c9383a', { rough: 0.4 }));
      pin.position.set(0, 0.3, 0);
      [nA, nB, pin].forEach((m) => note.add(m));
      const lines = card(S.rect(-0.13, 0.08, 0.26, 0.02), '#9c8d77', { depth: 0.002 });
      lines.position.z = 0.002; nA.add(lines);
      const lines2 = card(S.rect(-0.13, 0.15, 0.2, 0.02), '#9c8d77', { depth: 0.002 });
      lines2.position.z = 0.002; nA.add(lines2);
      note.position.copy(polar(10.45, a - 3.2 * deg));
      note.lookAt(FOCUS.x, 0, FOCUS.z);
      note.visible = false;
      note.userData.pick = { type: 'note', index: i };
      note.traverse((m) => { if (m.isMesh) m.castShadow = true; });
      this.roomRoot.add(note);

      this.stations.push({ group, holder, obj: o, plinth, medallion: med, medallionFace: face, note, angle: a, pop: 0, blank: false, hover: 0 });
      this.pickables.push(holder, med, note);
    });
    this.pickables.push(this.exitGate);
  }

  buildDust() {
    const n = this.reduced ? 90 : 240;
    const pos = new Float32Array(n * 3);
    this.dustSeeds = [];
    for (let i = 0; i < n; i++) {
      const r = Math.sqrt(Math.random()) * 14, a = Math.random() * Math.PI * 2;
      pos.set([Math.cos(a) * r, 0.3 + Math.random() * 7, -Math.sin(a) * r], i * 3);
      this.dustSeeds.push(Math.random() * 10);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const tex = canvasTexture(64, 64, (c, w, h) => {
      const grd = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      grd.addColorStop(0, 'rgba(255,240,210,1)'); grd.addColorStop(0.35, 'rgba(255,220,170,0.45)'); grd.addColorStop(1, 'rgba(255,220,170,0)');
      c.fillStyle = grd; c.fillRect(0, 0, w, h);
    });
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.12, map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.0, color: '#ffe0b0' }));
    this.roomRoot.add(this.dust);
  }

  // ---------- thumbnails ----------
  renderThumbnails(size = 176) {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.setSize(size, size, false);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.2;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#fff6e6', '#3a3350', 1.8));
    const d = new THREE.DirectionalLight('#fff4e0', 2.4);
    d.position.set(-3, 6, 8);
    scene.add(d);
    const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
    const urls = this.data.map((st) => {
      const o = BUILDERS[st.id]();
      applyPop(o, 1);
      o.userData.ticks.forEach((f) => f(0.6));
      scene.add(o);
      const bb = new THREE.Box3().setFromObject(o);
      const c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3());
      const rad = Math.max(sz.x * 0.62, sz.y * 0.58, 0.9);
      const dist = rad / Math.tan(13 * deg);
      cam.position.set(c.x + dist * 0.12, c.y + dist * 0.2, c.z + dist);
      cam.lookAt(c);
      r.render(scene, cam);
      const url = r.domElement.toDataURL('image/png');
      scene.remove(o);
      return url;
    });
    r.dispose();
    return urls;
  }

  // ---------- animation ----------
  tween({ delay = 0, dur = 1, ease = E.linear, update, done, start }) {
    const k = this.reduced ? 0.35 : 1;
    const t = { t0: this.time + delay * k, dur: Math.max(0.001, dur * k), ease, update, done, start, started: false };
    this.tweens.push(t);
    return t;
  }

  runTweens() {
    this.tweens = this.tweens.filter((tw) => {
      if (tw.cancelled) return false;
      if (this.time < tw.t0) return true;
      if (!tw.started) { tw.started = true; tw.start && tw.start(); }
      const p = clamp01((this.time - tw.t0) / tw.dur);
      tw.update && tw.update(tw.ease(p), p);
      if (p >= 1) { tw.done && tw.done(); return false; }
      return true;
    });
  }

  popStation(i, on, { delay = 0, dur = 0.85, sound = true } = {}) {
    const st = this.stations[i];
    const from = st.pop, to = on ? 1 : 0;
    if (st.popTween) st.popTween.cancelled = true;
    st.popTween = this.tween({
      delay, dur: on ? dur : dur * 0.55, ease: E.linear,
      start: () => { if (on && sound) this.onPop(i); },
      update: (e) => {
        st.pop = lerp(from, to, e);
        applyPop(st.obj, st.pop);
        st.plinth.scale.y = Math.max(0.001, clamp01(on ? Math.max(st.plinth.scale.y, e * 3) : 1));
        st.plinth.visible = st.plinth.scale.y > 0.02;
      },
    });
  }

  openBook() {
    this.roomRoot.visible = true;
    this.bookmark.visible = true;
    this.tween({ dur: 2.0, ease: E.inOut, update: (e) => { this.bookRight.rotation.z = Math.PI * (1 - e); this.spine.scale.x = Math.max(0.001, 1 - e * 3); } });
    this.goTo({ kind: 'overview' }, { duration: 3.6, delay: 0.35 });
    const rise = (obj, e) => { obj.scale.y = Math.max(0.001, e); obj.visible = e > 0.02; };
    this.tween({ delay: 1.85, dur: 1.1, ease: E.out, update: (e) => { this.floorMats.forEach((m) => { m.opacity = e; }); this.dust.material.opacity = e * 0.55; } });
    this.backdrops.forEach((b, k) => this.tween({ delay: 1.9 + k * 0.2, dur: 1.1, ease: E.back, update: (e) => rise(b, e) }));
    this.architecture.forEach((a, k) => this.tween({ delay: 2.1 + k * 0.1, dur: 0.9, ease: E.back, update: (e) => rise(a, e) }));
    this.stations.forEach((st, i) => {
      this.tween({ delay: 2.2 + i * 0.04, dur: 0.6, ease: E.back, update: (e) => { st.medallion.scale.setScalar(Math.max(0.001, e)); st.medallion.visible = e > 0.02; } });
      this.popStation(i, true, { delay: 2.5 + i * 0.13 });
    });
    this.ribbon.target = 0;
    return new Promise((res) => this.tween({ delay: 2.5 + 20 * 0.13 + 0.4, dur: 0.01, done: () => { this.interactive = true; res(); } }));
  }

  // Jump straight to the open room (used for ?instant and deep links during development).
  openInstant() {
    this.setBookClosed(false);
    this.floorMats.forEach((m) => { m.opacity = 1; });
    this.dust.material.opacity = 0.55;
    [...this.backdrops, ...this.architecture].forEach((b) => { b.scale.y = 1; b.visible = true; });
    this.stations.forEach((st) => { st.pop = 1; applyPop(st.obj, 1); st.plinth.scale.y = 1; st.plinth.visible = true; st.medallion.scale.setScalar(1); st.medallion.visible = true; });
    this.camLoc = { kind: 'overview' };
    this.camTween = null;
    this.interactive = true;
  }

  celebrate(order) {
    order.forEach((i, k) => {
      const st = this.stations[i];
      this.tween({
        delay: k * 0.11, dur: 0.7, ease: E.linear,
        start: () => this.onPop(i),
        update: (e) => { st.holder.position.y = 0.1 + Math.sin(e * Math.PI) * 0.45; st.holder.rotation.y = Math.sin(e * Math.PI) * 0.25; },
      });
    });
  }

  setMedallionBlank(i, blank) {
    const st = this.stations[i];
    if (st.blank === blank) return;
    st.blank = blank;
    const m = st.medallionFace.material;
    m.map.dispose();
    m.map = this.medallionTexture(i, blank);
    m.needsUpdate = true;
  }

  setNotes(indices) {
    this.stations.forEach((st, i) => { st.note.visible = indices.has(i); });
  }

  setWalked(i) {
    this.ribbon.target = i < 0 ? 0 : ribbonU(stationAngle(i));
  }

  setFrame(x, y) {
    this.frame.tx = x;
    this.frame.ty = y;
  }

  focus(index, { duration } = {}) {
    if (index < 0) {
      this.goTo({ kind: 'overview' }, { duration: duration ?? 1.6 });
      this.lightMix.t = 0;
    } else {
      this.goTo({ kind: 'station', fi: index }, { duration });
      this.lightMix.t = 1;
      const st = this.stations[index];
      const p = st.group.position;
      const dir = FOCUS.clone().sub(p).setY(0).normalize();
      this.spotGoal.pos.copy(p).addScaledVector(dir, 3.2).setY(9.5);
      this.spotGoal.target.copy(p).setY(1.1);
    }
    this.look.tyaw = 0; this.look.tpitch = 0; this.look.tzoom = 1;
  }

  // ---------- camera ----------
  portraitK() {
    const a = this.camera.aspect;
    return a < 1 ? Math.min(2.2, Math.pow(0.95 / a, 0.85)) : 1;
  }

  poseOf(loc, out) {
    const k = this.portraitK();
    if (loc.kind === 'intro') {
      const ki = Math.max(1, k * 1.1);
      out.target.set(-8.5, 0.4, BOOK_Z + 0.5);
      out.pos.set(-8.5 + 9 * ki, 27 * ki, BOOK_Z + 0.5 + 27 * ki);
    } else if (loc.kind === 'overview') {
      const ko = this.camera.aspect < 1.5 ? Math.min(2.4, Math.pow(1.5 / this.camera.aspect, 0.9)) : 1;
      out.target.set(0, 0.2, -1.8);
      out.pos.set(0, 25.5 * ko, -1.8 + 30.5 * ko);
    } else if (loc.kind === 'station') {
      const n = this.stations.length;
      const fi = Math.max(0, Math.min(n - 1, loc.fi));
      const i0 = Math.floor(fi), i1 = Math.min(n - 1, i0 + 1), f = fi - i0;
      const a = lerp(stationAngle(i0), stationAngle(i1), f);
      const c0 = this.camParams[i0], c1 = this.camParams[i1];
      const p = polar(R_OBJ, a);
      const dir = FOCUS.clone().sub(p).setY(0).normalize();
      out.pos.copy(p).addScaledVector(dir, lerp(c0.dist, c1.dist, f) * k).setY(lerp(c0.height, c1.height, f) * (k > 1 ? 1.15 : 1));
      out.target.copy(p).setY(lerp(c0.target, c1.target, f)).addScaledVector(dir, 0.3);
    } else {
      out.pos.copy(loc.pos);
      out.target.copy(loc.target);
    }
    return out;
  }

  goTo(loc, { duration, delay = 0 } = {}) {
    let from;
    if (this.camTween && this.camTween.curFi != null) from = { kind: 'station', fi: this.camTween.curFi };
    else if (this.camTween) from = { kind: 'pose', pos: this.pose.pos.clone(), target: this.pose.target.clone() };
    else from = this.camLoc;
    let dur = duration;
    if (dur == null) dur = from.kind === 'station' && loc.kind === 'station' ? Math.min(2.6, 0.9 + Math.abs(loc.fi - from.fi) * 0.16) : 1.7;
    this.camTween = { from, to: loc, t0: this.time + delay, dur: dur * (this.reduced ? 0.4 : 1), curFi: null };
  }

  updateCamera(dt) {
    const tw = this.camTween;
    if (tw) {
      const p = clamp01((this.time - tw.t0) / tw.dur);
      const e = E.inOut(p);
      if (tw.from.kind === 'station' && tw.to.kind === 'station') {
        tw.curFi = lerp(tw.from.fi, tw.to.fi, e);
        this.poseOf({ kind: 'station', fi: tw.curFi }, this.pose);
      } else {
        const A = this.poseOf(tw.from, { pos: new THREE.Vector3(), target: new THREE.Vector3() });
        const B = this.poseOf(tw.to, { pos: new THREE.Vector3(), target: new THREE.Vector3() });
        this.pose.pos.lerpVectors(A.pos, B.pos, e);
        this.pose.target.lerpVectors(A.target, B.target, e);
        if (tw.from.kind === 'intro' || tw.to.kind === 'overview') this.pose.pos.y += Math.sin(p * Math.PI) * 3;
      }
      if (p >= 1) { this.camLoc = tw.to; this.camTween = null; }
    } else {
      this.poseOf(this.camLoc, this.pose);
    }
    const L = this.look, k = 1 - Math.exp(-dt * 4);
    L.yaw += (L.tyaw - L.yaw) * k; L.pitch += (L.tpitch - L.pitch) * k; L.zoom += (L.tzoom - L.zoom) * k;
    const off = this.pose.pos.clone().sub(this.pose.target);
    off.applyAxisAngle(new THREE.Vector3(0, 1, 0), L.yaw).multiplyScalar(L.zoom);
    off.y += L.pitch * off.length() * 0.6;
    const cam = this.camera;
    cam.position.copy(this.pose.target).add(off);
    if (!this.reduced) {
      cam.position.x += Math.sin(this.time * 0.31) * 0.07;
      cam.position.y += Math.sin(this.time * 0.47) * 0.05;
    }
    cam.lookAt(this.pose.target);
    const F = this.frame, kf = 1 - Math.exp(-dt * 5);
    F.x += (F.tx - F.x) * kf; F.y += (F.ty - F.y) * kf;
    const w = this.width, h = this.height;
    cam.setViewOffset(w, h, F.x, F.y, w, h);
  }

  // ---------- input ----------
  bindPointer() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      this.drag = { x: e.clientX, y: e.clientY, moved: 0 };
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      this.mouse = { x: e.clientX, y: e.clientY, dirty: true, touch: e.pointerType !== 'mouse' };
      const d = this.drag;
      if (d && this.interactive) {
        const dx = e.clientX - d.x, dy = e.clientY - d.y;
        d.moved += Math.abs(dx) + Math.abs(dy);
        d.x = e.clientX; d.y = e.clientY;
        if (d.moved > 5) {
          const L = this.look;
          L.tyaw = Math.max(-0.7, Math.min(0.7, L.tyaw - dx * 0.0035));
          L.tpitch = Math.max(-0.25, Math.min(0.35, L.tpitch + dy * 0.0025));
        }
      }
    });
    const up = (e) => {
      const d = this.drag;
      this.drag = null;
      if (!d || d.moved > 6 || !this.interactive) return;
      const hit = this.hit(e.clientX, e.clientY);
      if (hit) this.onPick(hit);
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', () => { this.drag = null; });
    c.addEventListener('pointerleave', () => { this.mouse = null; this.setHover(-1); });
    c.addEventListener('wheel', (e) => {
      if (!this.interactive) return;
      e.preventDefault();
      this.look.tzoom = Math.max(0.7, Math.min(1.35, this.look.tzoom * (1 + e.deltaY * 0.0012)));
    }, { passive: false });
  }

  hit(x, y) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickables.filter((p) => p.visible), true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData.pick) o = o.parent;
      if (o && o.userData.pick) {
        const pk = o.userData.pick;
        if (pk.type === 'station' && !this.stations[pk.index].obj.visible && this.pickMode === 'walk') continue;
        return pk;
      }
    }
    return null;
  }

  setHover(i) {
    if (this.hovered === i) return;
    this.hovered = i;
    this.canvas.style.cursor = i >= 0 || i === -2 ? 'pointer' : '';
  }

  // ---------- loop ----------
  resize() {
    const w = (this.width = window.innerWidth), h = (this.height = window.innerHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  start() {
    const clock = new THREE.Clock();
    const frame = () => {
      const dt = Math.min(this.maxDt, clock.getDelta());
      this.time += dt;
      this.update(dt);
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  update(dt) {
    this.runTweens();
    this.updateCamera(dt);

    const lm = this.lightMix;
    lm.v += (lm.t - lm.v) * (1 - Math.exp(-dt * 3));
    this.hemi.intensity = lerp(1.15, 0.72, lm.v);
    this.key.intensity = lerp(2.5, 1.55, lm.v);
    this.spot.intensity = lm.v * 3.4;
    const ks = 1 - Math.exp(-dt * 3.5);
    this.spot.position.lerp(this.spotGoal.pos, ks);
    this.spot.target.position.lerp(this.spotGoal.target, ks);

    const rb = this.ribbon;
    rb.walked += (rb.target - rb.walked) * (1 - Math.exp(-dt * 2.2));
    this.walkedTex.offset.x = 0.5 - 0.5 * rb.walked;

    const t = this.time;
    this.stations.forEach((st, i) => {
      if (st.obj.visible) st.obj.userData.ticks.forEach((f) => f(t));
      const target = this.hovered === i ? 1 : 0;
      st.hover += (target - st.hover) * (1 - Math.exp(-dt * 10));
      st.holder.scale.setScalar(1 + st.hover * 0.05);
      if (st.note.visible) st.note.position.y = 0.05 + Math.sin(t * 1.6 + i) * 0.05;
    });

    if (this.dust && !this.reduced) {
      const p = this.dust.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let y = p.getY(i) + dt * 0.12;
        if (y > 7.5) y = 0.3;
        p.setY(i, y);
        p.setX(i, p.getX(i) + Math.sin(t * 0.4 + this.dustSeeds[i]) * dt * 0.05);
      }
      p.needsUpdate = true;
    }

    if (this.mouse && this.mouse.dirty && this.interactive && !this.drag && !this.mouse.touch) {
      this.mouse.dirty = false;
      const hit = this.hit(this.mouse.x, this.mouse.y);
      const idx = hit && (hit.type === 'station' || hit.type === 'note') ? hit.index : hit && hit.type === 'exit' ? -2 : -1;
      this.setHover(idx);
      this.onHover(hit, this.mouse.x, this.mouse.y);
    }
  }
}

function palmFlat(lf, h, color) {
  const trunk = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; trunk.push([Math.sin(t * 1.3) * 0.14 * h, t * h]); }
  lf.add(card(S.stroke(trunk, 0.08 * h, 0.045 * h), color, { depth: 0.03 }));
  const tx = Math.sin(1.3) * 0.14 * h;
  [0.1, 0.35, 0.62, 0.85, 1.05, 1.3].forEach((kk, k) => {
    const a = kk * Math.PI * 0.8, len = (0.42 + (k % 2) * 0.1) * h;
    const pts = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([tx + Math.cos(a) * len * t, h + Math.sin(a) * len * t * 0.55 - t * t * 0.22 * h]); }
    lf.add(card(S.stroke(pts, 0.1 * h, 0.012), color, { depth: 0.03, z: k * 0.001 }));
  });
}
