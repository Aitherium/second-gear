// SECOND GEAR - hold Shift to stop time, queue the chaos, let go.
// A GitHub Game Off 2026 entry (theme: SHIFT). three.js renders, Rapier simulates.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import RAPIER from "@dimforge/rapier3d-compat";
import { LEVELS } from "./levels.js";
import { sfx } from "./sfx.js";

await RAPIER.init();

// ── renderer, scene, camera ──────────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1014);
scene.fog = new THREE.Fog(0x0d1014, 18, 42);
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(9, 7.5, 11);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.2, 0);
controls.enableDamping = true;
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.maxPolarAngle = Math.PI * 0.47;
controls.minDistance = 6; controls.maxDistance = 28;

scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x1a1410, 0.9));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
sun.position.set(8, 14, 6); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 40 });
scene.add(sun);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── the clock: time stops while Shift is held, then eases back up through "second gear" ──────────
const STEP = 1 / 60;
const clock = { scale: 1, target: 1, acc: 0, frozen: false, rampT: 0 };
const RAMP = 1.4;            // seconds from the release to full speed
const RAMP_FROM = 0.2;       // time scale right after the release: the queued moves land in slow motion

// ── world state ──────────────────────────────────────────────────────────────────────────────────
let world = null, bodies = [], queue = [], levelIx = 0, shiftsUsed = 0, state = "title", won = false;
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
const MAT = {
  table: new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.85 }),
  floor: new THREE.MeshStandardMaterial({ color: 0x1c232b, roughness: 1 }),
  crate: new THREE.MeshStandardMaterial({ color: 0xc8a06a, roughness: 0.7 }),
  target: new THREE.MeshStandardMaterial({ color: 0xff6b5a, roughness: 0.5, emissive: 0x3a0a05 }),
  dummy: new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.6 }),
  ball: new THREE.MeshStandardMaterial({ color: 0x7fd4ff, roughness: 0.3, emissive: 0x0b2a3a }),
  ghost: new THREE.MeshBasicMaterial({ color: 0x7fd4ff, transparent: true, opacity: 0.35, depthWrite: false }),
};

function addBody(desc, colliderDesc, mesh, opts = {}) {
  const rb = world.createRigidBody(desc);
  const col = world.createCollider(colliderDesc, rb);
  mesh.castShadow = mesh.receiveShadow = true;
  scene.add(mesh);
  const b = { rb, col, mesh, kind: opts.kind || "prop", target: !!opts.target, out: false };
  rb.userData = b; mesh.userData.body = b;
  bodies.push(b);
  return b;
}
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);

/** A jointed dummy: torso, head and two legs on spherical joints. It falls like a body, not like a box. */
function addDummy(x, z, target) {
  const mat = target ? MAT.target : MAT.dummy;
  const part = (w, h, d, y, kind) => addBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z).setLinearDamping(0.05).setAngularDamping(0.4),
    RAPIER.ColliderDesc.cuboid(w / 2, h / 2, d / 2).setDensity(0.9).setFriction(0.8),
    box(w, h, d, mat), { kind, target });
  const torso = part(0.5, 0.7, 0.3, 1.55, "dummy");
  const head = part(0.32, 0.32, 0.32, 2.12, "dummy");
  const legL = part(0.2, 0.8, 0.22, 0.8, "dummy"), legR = part(0.2, 0.8, 0.22, 0.8, "dummy");
  legL.rb.setTranslation({ x: x - 0.13, y: 0.8, z }, true); legR.rb.setTranslation({ x: x + 0.13, y: 0.8, z }, true);
  const joint = (a, b, pa, pb) => world.createImpulseJoint(RAPIER.JointData.spherical(pa, pb), a.rb, b.rb, true);
  joint(torso, head, { x: 0, y: 0.38, z: 0 }, { x: 0, y: -0.18, z: 0 });
  joint(torso, legL, { x: -0.13, y: -0.37, z: 0 }, { x: 0, y: 0.4, z: 0 });
  joint(torso, legR, { x: 0.13, y: -0.37, z: 0 }, { x: 0, y: 0.4, z: 0 });
  // only the torso counts toward the goal, so a dummy is one target
  for (const p of [head, legL, legR]) p.target = false;
  return torso;
}

function buildLevel(ix) {
  for (const b of bodies) scene.remove(b.mesh);
  for (const q of queue) scene.remove(q.gizmo);
  bodies = []; queue = []; won = false; shiftsUsed = 0;
  if (world) world.free();
  world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  const L = LEVELS[ix];
  // the floor far below and the table the targets stand on
  addBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -4, 0), RAPIER.ColliderDesc.cuboid(30, 0.5, 30), box(60, 1, 60, MAT.floor), { kind: "floor" });
  const [tw, td] = L.table;
  addBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0, 0), RAPIER.ColliderDesc.cuboid(tw / 2, 0.25, td / 2).setFriction(0.9), box(tw, 0.5, td, MAT.table), { kind: "table" });
  for (const c of L.crates) {
    const [x, y, z, s = 0.6, tgt = false] = c;
    addBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z),
      RAPIER.ColliderDesc.cuboid(s / 2, s / 2, s / 2).setDensity(0.6).setFriction(0.7),
      box(s, s, s, tgt ? MAT.target : MAT.crate), { kind: "crate", target: tgt });
  }
  for (const d of L.dummies) addDummy(d[0], d[1], !!d[2]);
  updateHud();
}

// ── the queue: what you set up while time is stopped ────────────────────────────────────────────
function queueShove(b, point, dir) {
  const arrow = new THREE.ArrowHelper(dir, point.clone().addScaledVector(dir, -1.1), 1.0, 0x7fd4ff, 0.3, 0.18);
  scene.add(arrow);
  queue.push({ kind: "shove", body: b, point: point.clone(), dir: dir.clone(), gizmo: arrow });
  sfx.click();
}
function queueThrow(point) {
  const from = camera.position.clone().add(new THREE.Vector3(0, -0.6, 0));
  const ghost = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 12), MAT.ghost);
  ghost.position.copy(from);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, point]), new THREE.LineDashedMaterial({ color: 0x7fd4ff, dashSize: 0.3, gapSize: 0.2 }));
  line.computeLineDistances();
  const g = new THREE.Group(); g.add(ghost, line); scene.add(g);
  queue.push({ kind: "throw", from, point: point.clone(), gizmo: g });
  sfx.click();
}
function runQueue() {
  for (const q of queue) {
    if (q.kind === "shove") {
      const m = q.body.rb.mass();
      q.body.rb.wakeUp();
      q.body.rb.applyImpulseAtPoint({ x: q.dir.x * 7 * m, y: (q.dir.y + 0.25) * 7 * m, z: q.dir.z * 7 * m }, q.point, true);
    } else {
      const v = q.point.clone().sub(q.from); const t = Math.max(0.35, v.length() / 18);
      const vel = new THREE.Vector3(v.x / t, v.y / t + 0.5 * 9.81 * t, v.z / t);   // a ballistic arc that lands on the point
      const b = addBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(q.from.x, q.from.y, q.from.z).setCcdEnabled(true),
        RAPIER.ColliderDesc.ball(0.22).setDensity(6).setRestitution(0.3), new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 12), MAT.ball), { kind: "ball" });
      b.rb.setLinvel(vel, true);
    }
    scene.remove(q.gizmo);
  }
  if (queue.length) sfx.whoosh(queue.length);
  queue = [];
}

// ── input ───────────────────────────────────────────────────────────────────────────────────────
function setFrozen(on) {
  if (state !== "play" || won || clock.frozen === on) return;
  clock.frozen = on;
  document.body.classList.toggle("frozen", on);
  if (on) { shiftsUsed++; clock.target = 0; sfx.freeze(); }
  else { runQueue(); clock.rampT = 0; clock.scale = RAMP_FROM; clock.target = 1; }
  updateHud();
}
window.addEventListener("keydown", (e) => {
  if (e.key === "Shift" && !e.repeat) setFrozen(true);
  if ((e.key === "r" || e.key === "R") && state === "play") buildLevel(levelIx);
});
window.addEventListener("keyup", (e) => { if (e.key === "Shift") setFrozen(false); });
window.addEventListener("blur", () => setFrozen(false));   // an alt-tab never leaves time stopped
renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());
renderer.domElement.addEventListener("pointerdown", (e) => {
  if (e.button !== 0 || !clock.frozen) return;
  mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const hits = ray.intersectObjects(bodies.map((b) => b.mesh), false);
  if (!hits.length) return;
  const h = hits[0], b = h.object.userData.body;
  if (b.kind === "crate" || b.kind === "dummy" || b.kind === "ball") {
    const dir = ray.ray.direction.clone(); dir.y = Math.max(dir.y, -0.15); dir.normalize();
    queueShove(b, h.point, dir);
  } else queueThrow(h.point);
});
document.getElementById("start").addEventListener("click", () => {
  document.getElementById("card").classList.add("hidden");
  if (state === "won-all") levelIx = 0;
  state = "play"; sfx.unlock(); buildLevel(levelIx);
});

// ── goal + HUD ──────────────────────────────────────────────────────────────────────────────────
function updateHud() {
  const L = LEVELS[levelIx], left = bodies.filter((b) => b.target && !b.out).length;
  document.getElementById("goal").textContent = `${L.name} · ${left} target${left === 1 ? "" : "s"} left`;
  document.getElementById("shifts").textContent = `shifts ${shiftsUsed}${L.par ? " · par " + L.par : ""}`;
  document.getElementById("gear").textContent = clock.frozen ? "TIME STOPPED" : clock.scale < 0.98 ? "SECOND GEAR" : "FIRST GEAR";
}
function checkGoal() {
  const L = LEVELS[levelIx], [tw, td] = L.table;
  let changed = false;
  for (const b of bodies) {
    if (!b.target || b.out) continue;
    const p = b.rb.translation();
    if (p.y < -0.6 || Math.abs(p.x) > tw / 2 + 0.4 || Math.abs(p.z) > td / 2 + 0.4) { b.out = true; changed = true; sfx.pop(); }
  }
  if (changed) updateHud();
  if (!won && bodies.some((b) => b.target) && bodies.every((b) => !b.target || b.out)) {
    won = true; sfx.win();
    setTimeout(() => {
      const card = document.getElementById("card"), last = levelIx === LEVELS.length - 1;
      card.querySelector("h1").textContent = last ? "ALL CLEAR" : "CLEAR";
      card.querySelectorAll("p").forEach((p, i) => { p.textContent = i === 0 ? `${LEVELS[levelIx].name}: ${shiftsUsed} shift${shiftsUsed === 1 ? "" : "s"}${LEVELS[levelIx].par ? " (par " + LEVELS[levelIx].par + ")" : ""}.` : ""; });
      card.querySelector("button").textContent = last ? "Play again" : "Next level";
      card.classList.remove("hidden");
      if (last) state = "won-all"; else { levelIx++; state = "between"; }
    }, 900);
  }
}

// ── frame loop: a fixed physics step, scaled by the clock ───────────────────────────────────────
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (!clock.frozen && clock.scale < 1) { clock.rampT += dt; clock.scale = RAMP_FROM + (1 - RAMP_FROM) * Math.min(1, (clock.rampT / RAMP) ** 2); }
  if (clock.frozen) clock.scale = 0;
  if (world && state !== "title") {
    clock.acc += dt * clock.scale;
    let n = 0;
    while (clock.acc >= STEP && n < 4) { world.step(); clock.acc -= STEP; n++; }
    if (n === 4) clock.acc = 0;
    for (const b of bodies) { const t = b.rb.translation(), r = b.rb.rotation(); b.mesh.position.set(t.x, t.y, t.z); b.mesh.quaternion.set(r.x, r.y, r.z, r.w); }
    checkGoal();
    if (state === "play" && !clock.frozen && clock.scale < 0.98) updateHud(); else if (state === "play" && !clock.frozen) document.getElementById("gear").textContent = "FIRST GEAR";
  }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
buildLevel(0);
requestAnimationFrame(frame);
// probe seam for automated checks (no gameplay effect)
window.__sg = { get state() { return state; }, get frozen() { return clock.frozen; }, get scale() { return clock.scale; }, get queue() { return queue.length; }, get targetsLeft() { return bodies.filter((b) => b.target && !b.out).length; }, get level() { return levelIx; }, setFrozen, bodies: () => bodies,
  targetScreen: () => bodies.filter((b) => b.target && !b.out).map((b) => { const v = b.mesh.position.clone().project(camera); return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight }; }) };
