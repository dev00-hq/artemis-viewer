import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import "./styles.css";

const DURATION = 100;
const EARTH = new THREE.Vector3(-3.55, -0.1, 0);
const MOON = new THREE.Vector3(4.75, 0.18, -1.1);

const milestones = [
  ["launch", 0, "Launch", "Day 1", "Big rocket, careful start", "SLS lifts Orion and four astronauts away from Earth.", "Artemis II starts with a giant rocket lifting Orion away from Earth. The rocket does the hard first push, like throwing a ball high enough that it can start a long trip."],
  ["orbit", 13, "Earth checkouts", "Day 1", "Practice close to home", "Orion circles Earth while teams check the spacecraft.", "Before going far away, Orion stays near Earth. The crew and Mission Control check steering, power, air, computers, and communication."],
  ["tli", 24, "Moon burn", "Day 1", "The push toward the Moon", "A long engine burn sends Orion onto its Moon path.", "This is the big push that changes Orion from circling Earth to flying toward the Moon. Spacecraft do not need engines on all the time; one well-timed push can do a lot."],
  ["coast", 42, "Deep-space coast", "Days 2-4", "Tiny nudges, huge distance", "Small correction burns keep Orion on target.", "During the coast, Orion is mostly gliding. Small engine nudges help keep it on the right invisible road through space."],
  ["flyby", 58, "Lunar flyby", "Day 5", "Around the far side", "The Moon bends Orion's path into a return loop.", "Orion does not land on Artemis II. It swings around the Moon, and the Moon's gravity bends the path so Orion can head back toward Earth."],
  ["return", 73, "Free return", "Days 6-8", "Gravity helps bring Orion home", "The route naturally carries Orion back toward Earth.", "A free-return path is clever because gravity helps do the navigation. It is safer because the path already points Orion back home."],
  ["entry", 90, "Skip entry", "Day 9", "Skimming the air", "Orion slows down using Earth's atmosphere.", "Coming back from the Moon is fast. Orion can skim the top of the air, rise a little, then dip in again so heat and force are easier to handle."],
  ["splashdown", 100, "Splashdown", "Day 10", "Back in the ocean", "Parachutes slow Orion for ocean recovery.", "At the end, parachutes open and slow Orion down. It splashes into the ocean where recovery teams meet the astronauts."],
].map(([id, t, label, day, title, short, dialog]) => ({ id, t, label, day, title, short, dialog }));

const concepts = [
  ["Trajectory", "A trajectory is the path an object follows through 3D space. Here it curves above, behind, and around Earth and the Moon."],
  ["Free return", "A path that uses gravity to bring Orion home without needing a huge extra engine burn."],
  ["Flyby", "A close pass around the Moon. Artemis II tests the crew spacecraft without landing."],
];

document.querySelector("#root").innerHTML = `
  <main class="shell">
    <section class="stagePanel">
      <div class="stageHeader">
        <div><p class="eyebrow">Artemis II 3D mission scene</p><h1>See Orion curve through space</h1></div>
        <div class="statusPill"><span id="activeDay"></span><strong id="activeLabel"></strong></div>
      </div>
      <div class="stageFrame">
        <div id="game" aria-label="Three.js 3D Artemis II trajectory scene"></div>
        <div class="sceneCaption"><strong id="captionTitle"></strong><span id="captionShort"></span></div>
      </div>
      <div class="controls" aria-label="Playback controls">
        <button class="iconButton" type="button" id="playButton" aria-label="Pause">Pause</button>
        <button class="iconButton" type="button" id="restartButton" aria-label="Restart">Restart</button>
        <button class="iconButton" type="button" id="prevButton" aria-label="Previous milestone">Prev</button>
        <button class="iconButton" type="button" id="nextButton" aria-label="Next milestone">Next</button>
        <div class="scrubberWrap">
          <input class="scrubber" id="scrubber" type="range" min="0" max="${DURATION}" step="0.1" aria-label="Mission playback timeline" />
          <div class="timelineMarkers" id="timelineMarkers"></div>
        </div>
        <label class="speedControl"><span>Speed</span><select id="speedSelect" aria-label="Playback speed"><option value="0.6">0.6x</option><option value="1" selected>1x</option><option value="1.6">1.6x</option><option value="2.4">2.4x</option></select></label>
      </div>
    </section>
    <aside class="learningPanel" aria-label="Mission explanation panel">
      <div class="dialogHeader"><div><p class="eyebrow">Kid-friendly mission notes</p><h2 id="dialogTitle"></h2></div><button class="iconButton muted" id="dialogToggle" type="button" aria-label="Toggle explanation">Info</button></div>
      <div class="dialog" id="dialog"><div class="bookIcon">?</div><p id="dialogText"></p></div>
      <div class="conceptList">${concepts.map(([title, body]) => `<article class="conceptCard"><div class="conceptIcon"></div><div><h3>${title}</h3><p>${body}</p></div></article>`).join("")}</div>
      <div class="missionList" id="missionList"></div>
    </aside>
  </main>
`;

const dom = Object.fromEntries(
  ["activeDay", "activeLabel", "captionTitle", "captionShort", "dialogTitle", "dialogText", "dialog", "dialogToggle", "scrubber", "playButton", "restartButton", "prevButton", "nextButton", "speedSelect", "timelineMarkers", "missionList"].map((id) => [id, document.querySelector(`#${id}`)])
);

const state = {
  time: clamp(Number(localStorage.getItem("artemis-three-time") || 0), 0, DURATION),
  playing: true,
  speed: 1,
  dialogOpen: true,
};

// Schematic, not ephemeris-grade: shaped from NASA Artemis II mission map/press kit.
// Key constraints represented here: high Earth-orbit checkout, TLI on Flight Day 2,
// roughly four days outbound, far-side lunar flyby, and fuel-efficient free return.
const curve = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-4.2, -0.16, 1.16),
    new THREE.Vector3(-3.12, 0.72, 1.7),
    new THREE.Vector3(-2.25, 0.02, 0.55),
    new THREE.Vector3(-3.16, -0.78, -1.18),
    new THREE.Vector3(-4.25, -0.12, -0.72),
    new THREE.Vector3(-3.18, 0.92, 0.78),
    new THREE.Vector3(-1.72, 1.24, 1.45),
    new THREE.Vector3(0.22, 1.82, 1.02),
    new THREE.Vector3(2.25, 1.32, -0.18),
    new THREE.Vector3(4.08, 0.66, -1.15),
    new THREE.Vector3(5.48, -0.08, -1.2),
    new THREE.Vector3(5.0, -0.92, -0.15),
    new THREE.Vector3(3.4, -1.34, 0.95),
    new THREE.Vector3(1.05, -1.1, 1.24),
    new THREE.Vector3(-1.25, -0.66, 0.36),
    new THREE.Vector3(-2.82, -0.34, -0.36),
    new THREE.Vector3(-3.48, -0.18, -0.04),
  ],
  false,
  "catmullrom",
  0.45
);
const pathPoints = curve.getSpacedPoints(980);

let trail = null;
let activeLabel = null;
let lastActiveId = null;
const markerRefs = [];

dom.timelineMarkers.innerHTML = milestones.map((item) => `<button class="marker" data-milestone="${item.id}" style="left:${item.t}%" type="button" aria-label="Jump to ${item.label}"><span>${item.label}</span></button>`).join("");
dom.missionList.innerHTML = milestones.map((item) => `<button class="missionItem" data-milestone="${item.id}" type="button"><span>${item.day}</span><strong>${item.label}</strong></button>`).join("");
document.querySelectorAll("[data-milestone]").forEach((button) => {
  const item = milestones.find((milestone) => milestone.id === button.dataset.milestone);
  button.addEventListener("click", () => jumpTo(item.t));
});
dom.scrubber.addEventListener("input", (event) => setTime(Number(event.target.value), true));
dom.playButton.addEventListener("click", () => {
  state.playing = !state.playing;
  updateDom();
});
dom.restartButton.addEventListener("click", () => jumpTo(0));
dom.prevButton.addEventListener("click", () => jumpTo(milestones[clamp(activeIndex() - 1, 0, milestones.length - 1)].t));
dom.nextButton.addEventListener("click", () => jumpTo(milestones[clamp(activeIndex() + 1, 0, milestones.length - 1)].t));
dom.speedSelect.addEventListener("change", (event) => {
  state.speed = Number(event.target.value);
});
dom.dialogToggle.addEventListener("click", () => {
  state.dialogOpen = !state.dialogOpen;
  updateDom();
});

const mount = document.querySelector("#game");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050814);
scene.fog = new THREE.Fog(0x050814, 11, 28);

const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 100);
camera.position.set(0, 4.7, 11.7);
camera.lookAt(0.35, -0.04, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
mount.appendChild(renderer.domElement);

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.08;
orbit.minDistance = 6.5;
orbit.maxDistance = 16;
orbit.target.set(0.35, -0.05, 0);

scene.add(new THREE.AmbientLight(0x9fb6ff, 0.46));
const sun = new THREE.DirectionalLight(0xffffff, 2.45);
sun.position.set(-5, 6, 8);
scene.add(sun);
const rim = new THREE.DirectionalLight(0x72d8ff, 0.85);
rim.position.set(6, -2, -5);
scene.add(rim);

createStars();
createPlanets();
createReferenceRings();
createTrajectory();
const orion = createOrion();
scene.add(orion);
createMarkers();
resize();
window.addEventListener("resize", resize);

let previous = performance.now();
renderer.setAnimationLoop((now) => {
  const delta = (now - previous) / 1000;
  previous = now;
  if (state.playing) {
    state.time = (state.time + delta * 5.8 * state.speed) % DURATION;
    localStorage.setItem("artemis-three-time", String(state.time.toFixed(2)));
    updateDom();
  }
  updateScene();
  orbit.update();
  renderer.render(scene, camera);
});

updateDom();

function createStars() {
  const positions = new Float32Array(540);
  for (let i = 0; i < 180; i += 1) {
    positions[i * 3] = ((i * 131) % 1200) / 60 - 10;
    positions[i * 3 + 1] = ((i * 71) % 620) / 62 - 5;
    positions[i * 3 + 2] = ((i * 197) % 900) / 60 - 9;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xdceaff, size: 0.035, transparent: true, opacity: 0.8 })));
}

function createPlanets() {
  const earth = new THREE.Mesh(new THREE.SphereGeometry(0.95, 72, 72), new THREE.MeshStandardMaterial({ map: createEarthTexture(), roughness: 0.62, metalness: 0.04 }));
  earth.position.copy(EARTH);
  scene.add(earth);

  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.04, 72, 72), new THREE.MeshBasicMaterial({ color: 0x68b7ff, transparent: true, opacity: 0.14, side: THREE.BackSide }));
  atmosphere.position.copy(EARTH);
  scene.add(atmosphere);

  const moonTexture = createMoonTexture();
  const moon = new THREE.Mesh(new THREE.SphereGeometry(0.52, 64, 64), new THREE.MeshStandardMaterial({ map: moonTexture, bumpMap: moonTexture, bumpScale: 0.045, roughness: 0.94 }));
  moon.position.copy(MOON);
  scene.add(moon);

  scene.userData.earth = earth;
  scene.userData.atmosphere = atmosphere;
  scene.userData.moon = moon;
}

function createReferenceRings() {
  addRing(EARTH, 1.25, new THREE.Vector3(0.12, 1, 0.2), 0x4edfd8, 0.24);
  addRing(EARTH, 1.75, new THREE.Vector3(0.25, 0.65, 1), 0x4edfd8, 0.18);
  addRing(MOON, 0.78, new THREE.Vector3(0.18, 1, 0.2), 0x8ed6d1, 0.2);
}

function createTrajectory() {
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 900, 0.012, 8, false), new THREE.MeshBasicMaterial({ color: 0x5fd8d4, transparent: true, opacity: 0.58 })));
}

function createMarkers() {
  const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xf6c453 });
  const flybyMaterial = new THREE.MeshBasicMaterial({ color: 0xff805d });
  milestones.forEach((item) => {
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.07, 18, 18), item.id === "flyby" ? flybyMaterial : markerMaterial);
    marker.position.copy(pointAt(item.t / DURATION));
    markerRefs.push({ id: item.id, mesh: marker });
    scene.add(marker);
  });
}

function createOrion() {
  const root = new THREE.Group();
  root.scale.setScalar(0.72);
  const capsuleMat = new THREE.MeshPhysicalMaterial({ color: 0xeef4fb, metalness: 0.32, roughness: 0.22, clearcoat: 0.4 });
  const heatMat = new THREE.MeshStandardMaterial({ color: 0x8f5738, roughness: 0.55, metalness: 0.18 });
  const serviceMat = new THREE.MeshStandardMaterial({ color: 0xaeb9c6, roughness: 0.28, metalness: 0.55 });
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x244fba, emissive: 0x0c2d72, emissiveIntensity: 0.35 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xd8e2ec, metalness: 0.42, roughness: 0.28 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x242a33, metalness: 0.8, roughness: 0.24 });

  const capsule = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.38, 48), capsuleMat);
  capsule.rotation.x = Math.PI / 2;
  capsule.position.z = 0.17;
  root.add(capsule);

  const heat = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.045, 48), heatMat);
  heat.rotation.x = Math.PI / 2;
  heat.position.z = -0.05;
  root.add(heat);

  const service = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.38, 48), serviceMat);
  service.rotation.x = Math.PI / 2;
  service.position.z = -0.34;
  root.add(service);

  const engine = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 32), darkMat);
  engine.rotation.x = -Math.PI / 2;
  engine.position.z = -0.62;
  root.add(engine);

  const docking = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 12, 48), frameMat);
  docking.position.z = 0.39;
  root.add(docking);

  addPanel(root, -0.54, 0, -0.34, 0, panelMat, frameMat);
  addPanel(root, 0.54, 0, -0.34, 0, panelMat, frameMat);
  addPanel(root, 0, 0.54, -0.34, Math.PI / 2, panelMat, frameMat);
  addPanel(root, 0, -0.54, -0.34, Math.PI / 2, panelMat, frameMat);

  const glow = new THREE.PointLight(0x6bd8ff, 1.0, 1.6);
  glow.position.set(0, 0, -0.7);
  root.add(glow);
  return root;
}

function addPanel(root, x, y, z, rotationZ, panelMat, frameMat) {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.035, 0.22), frameMat));
  group.add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.042, 0.17), panelMat));
  group.position.set(x, y, z);
  group.rotation.z = rotationZ;
  root.add(group);
}

function updateScene() {
  const progress = state.time / DURATION;
  const point = pointAt(progress);
  const before = pointAt(Math.max(0, progress - 0.004));
  const after = pointAt(Math.min(1, progress + 0.004));
  const tangent = after.clone().sub(before).normalize();
  const gravityTarget = progress < 0.64 ? EARTH : progress < 0.74 ? MOON : EARTH;
  const radial = point.clone().sub(gravityTarget).normalize();
  const side = new THREE.Vector3().crossVectors(radial, tangent).normalize();
  const up = new THREE.Vector3().crossVectors(tangent, side).normalize();
  const matrix = new THREE.Matrix4().makeBasis(side, up, tangent);
  const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(matrix);
  targetQuaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.sin(progress * Math.PI * 5.2) * 0.28));
  orion.position.copy(point);
  orion.quaternion.slerp(targetQuaternion, 0.24);

  if (trail) {
    trail.geometry.dispose();
    scene.remove(trail);
  }
  trail = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pathPoints.slice(0, Math.max(2, Math.floor(pathPoints.length * progress)))),
    new THREE.LineBasicMaterial({ color: 0xf6c453, transparent: true, opacity: 0.95 })
  );
  scene.add(trail);

  const active = milestones[activeIndex()];
  markerRefs.forEach((marker) => marker.mesh.scale.setScalar(marker.id === active.id ? 1.7 : 1));
  if (active.id !== lastActiveId) {
    lastActiveId = active.id;
    if (activeLabel) scene.remove(activeLabel);
    activeLabel = createLabel(active.label);
    activeLabel.position.copy(pointAt(active.t / DURATION).add(new THREE.Vector3(0.22, 0.28, 0)));
    scene.add(activeLabel);
  }

  scene.userData.earth.rotation.y += 0.0022;
  scene.userData.atmosphere.rotation.y += 0.0013;
  scene.userData.moon.rotation.y += 0.001;
}

function addRing(center, radius, normal, color, opacity) {
  const n = normal.clone().normalize();
  const a = Math.abs(n.dot(new THREE.Vector3(0, 1, 0))) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const u = new THREE.Vector3().crossVectors(n, a).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();
  const points = [];
  for (let i = 0; i <= 160; i += 1) {
    const angle = (i / 160) * Math.PI * 2;
    points.push(center.clone().add(u.clone().multiplyScalar(Math.cos(angle) * radius)).add(v.clone().multiplyScalar(Math.sin(angle) * radius)));
  }
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, transparent: true, opacity })));
}

function createEarthTexture() {
  return makeCanvasTexture(1024, 512, (ctx, width, height) => {
    const ocean = ctx.createLinearGradient(0, 0, width, height);
    ocean.addColorStop(0, "#123f86");
    ocean.addColorStop(0.45, "#277bc7");
    ocean.addColorStop(1, "#0a2d66");
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(76, 164, 116, 0.84)";
    [[150, 205, 210, 88, -0.12], [360, 132, 160, 70, 0.22], [520, 280, 230, 94, -0.34], [740, 170, 170, 82, 0.32], [860, 320, 132, 62, -0.24]].forEach(([x, y, w, h, r]) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r);
      ctx.beginPath();
      ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    ctx.strokeStyle = "rgba(255, 255, 255, 0.36)";
    ctx.lineWidth = 9;
    for (let i = 0; i < 32; i += 1) {
      ctx.beginPath();
      ctx.ellipse((i * 137) % width, (i * 73) % height, 78 + (i % 4) * 24, 12 + (i % 3) * 8, (i % 7) * 0.4, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

function createMoonTexture() {
  return makeCanvasTexture(1024, 512, (ctx, width, height) => {
    const base = ctx.createLinearGradient(0, 0, width, height);
    base.addColorStop(0, "#d5d2c8");
    base.addColorStop(0.54, "#9e9b94");
    base.addColorStop(1, "#6f706d");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 78; i += 1) {
      const x = (i * 89) % width;
      const y = (i * 53) % height;
      const r = 8 + ((i * 17) % 44);
      ctx.fillStyle = `rgba(56, 56, 55, ${0.08 + (i % 5) * 0.025})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function makeCanvasTexture(width, height, painter) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  painter(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function createLabel(text) {
  const texture = makeCanvasTexture(512, 128, (ctx) => {
    ctx.fillStyle = "rgba(7, 12, 22, 0.78)";
    roundRect(ctx, 14, 26, 484, 76, 20);
    ctx.fill();
    ctx.strokeStyle = "#f6c453";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 34px Inter, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 64);
  });
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  label.scale.set(1.22, 0.3, 1);
  return label;
}

function resize() {
  const width = mount.clientWidth;
  const height = mount.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(1, height);
  camera.updateProjectionMatrix();
  if (camera.aspect < 1.2 && camera.position.length() < 13) camera.position.set(0, 5.7, 14.4);
}

function pointAt(progress) {
  return curve.getPointAt(clamp(progress, 0, 1));
}

function activeIndex() {
  return milestones.reduce((best, item, index) => (state.time >= item.t ? index : best), 0);
}

function setTime(time, pause = false) {
  state.time = clamp(time, 0, DURATION);
  if (pause) state.playing = false;
  localStorage.setItem("artemis-three-time", String(state.time.toFixed(2)));
  updateDom();
}

function jumpTo(time) {
  state.dialogOpen = true;
  setTime(time, true);
}

function updateDom() {
  const active = milestones[activeIndex()];
  dom.activeDay.textContent = active.day;
  dom.activeLabel.textContent = active.label;
  dom.captionTitle.textContent = active.title;
  dom.captionShort.textContent = active.short;
  dom.dialogTitle.textContent = active.title;
  dom.dialogText.textContent = active.dialog;
  dom.scrubber.value = String(state.time);
  dom.playButton.textContent = state.playing ? "Pause" : "Play";
  dom.playButton.setAttribute("aria-label", state.playing ? "Pause" : "Play");
  dom.dialog.hidden = !state.dialogOpen;
  document.querySelectorAll("[data-milestone]").forEach((button) => button.classList.toggle("active", button.dataset.milestone === active.id));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}
