import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import orionAtlasUrl from "./assets/orion-texture-atlas.png";
import "./styles.css";

const DURATION = 100;
const ORION_ATLAS_SIZE = 1254;
const EARTH_TEXTURE_URL = "/assets/earth-blue-marble-april.jpg";
const MOON_MODEL_URL = "/assets/moon_nasa_lro_small.glb";
const EARTH = new THREE.Vector3(-3.55, -0.1, 0);
const MOON = new THREE.Vector3(4.75, 0.18, -1.1);
const BASE_PLAYBACK_RATE = 4.35;

const milestones = [
  ["launch", 0, "Launch", "Apr 1", "Big rocket, careful start", "SLS lifted Orion and four astronauts away from Earth.", "Artemis II began with a giant rocket lifting Orion away from Earth. The rocket did the hard first push, like throwing a ball high enough that it can start a long trip."],
  ["orbit", 13, "Earth checkouts", "Flight day 1", "Practice close to home", "Orion circled Earth while teams checked the spacecraft.", "Before going far away, Orion stayed near Earth. The crew and Mission Control checked steering, power, air, computers, and communication."],
  ["tli", 24, "Moon burn", "Flight day 2", "The push toward the Moon", "A long engine burn sent Orion onto its Moon path.", "This was the big push that changed Orion from circling Earth to flying toward the Moon. Spacecraft do not need engines on all the time; one well-timed push can do a lot."],
  ["coast", 42, "Deep-space coast", "Flight days 3-5", "Tiny nudges, huge distance", "Small correction burns kept Orion on target.", "During the coast, Orion mostly glided. Small engine nudges helped keep it on the right invisible road through space."],
  ["flyby", 58, "Lunar flyby", "Flight day 6", "Around the far side", "The Moon bent Orion's path into a return loop.", "Orion did not land on Artemis II. It swung around the Moon, and the Moon's gravity bent the path so Orion could head back toward Earth."],
  ["return", 73, "Free return", "Flight days 7-9", "Gravity helps bring Orion home", "The route naturally carried Orion back toward Earth.", "A free-return path is clever because gravity helps do the navigation. It is safer because the path already points Orion back home."],
  ["entry", 90, "Entry", "Flight day 10", "Skimming the air", "Orion slowed down using Earth's atmosphere.", "Coming back from the Moon is fast. Orion skimmed into the top of the air so heat and force could slow the crew module down."],
  ["splashdown", 100, "Splashdown", "Apr 10", "Back in the ocean", "Parachutes slowed Orion for ocean recovery.", "At the end, parachutes opened and slowed Orion down. It splashed into the ocean where recovery teams met the astronauts."],
].map(([id, t, label, day, title, short, dialog]) => ({ id, t, label, day, title, short, dialog }));

const observationNotes = {
  launch: ["Crew ascent", "The astronauts ride through the highest-load part of the mission while Orion and ground teams confirm the spacecraft is healthy."],
  orbit: ["Crew checks", "Near Earth, the crew tests communications, displays, suit interfaces, and life-support routines before committing to deep space."],
  tli: ["Leaving home", "The team feels a short, decisive engine burn that changes their route from Earth orbit toward the Moon."],
  coast: ["Deep-space routine", "For several days, the astronauts monitor Orion, rehearse procedures, sleep, eat, and keep in contact with Mission Control."],
  flyby: ["Far from Earth", "The crew passes around the Moon without landing, seeing Earth as a distant world while Orion uses lunar gravity to turn home."],
  return: ["Homeward arc", "On the way back, the astronauts keep checking navigation and spacecraft systems while Earth grows larger ahead."],
  entry: ["Re-entry workload", "The crew prepares for high heat, high g-forces, and the fast transition from spaceflight to parachute descent."],
  splashdown: ["Recovery team", "After splashdown, the astronauts wait for recovery crews to secure Orion and bring them safely out of the capsule."],
};

const sceneCards = [
  ["launch", "cardLaunch"],
  ["orbit", "cardOrbit"],
  ["tli", "cardTli"],
  ["coast", "cardCoast"],
  ["flyby", "cardFlyby"],
  ["return", "cardReturn"],
  ["entry", "cardEntry"],
].map(([id, className], index) => ({ ...milestones.find((item) => item.id === id), className, number: index + 1 }));

document.querySelector("#root").innerHTML = `
  <main class="missionShell">
    <section class="stageFrame" id="stageFrame" aria-label="Interactive Artemis II mission explorer">
      <div id="game" aria-label="Three.js 3D Artemis II trajectory scene"></div>
      <header class="missionHeader">
        <div class="departmentMark"><span></span><p>Departamento de Astronomia<br>Universidad de Concepcion</p></div>
        <h1>Artemis II Mission Explorer</h1>
      </header>
      <div class="topTools" aria-label="Scene tools">
        <button class="roundButton" type="button" id="infoButton" aria-label="Mission information" title="Mission information">i</button>
        <label class="roundSelect" title="Camera view"><span>View</span><select id="viewSelect" aria-label="Camera view"><option value="cinematic" selected>Cinematic</option><option value="follow">Follow</option><option value="earth">Earth</option><option value="moon">Moon</option><option value="manual">Manual</option></select></label>
        <button class="roundButton fullscreenButton" type="button" id="fullscreenButton" aria-label="Enter fullscreen" title="Fullscreen">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5h2V5h3V3Zm8 0v2h3v3h2V3h-5ZM5 16H3v5h5v-2H5v-3Zm14 3h-3v2h5v-5h-2v3Z" /></svg>
        </button>
      </div>
      <div class="sceneCards" aria-label="Mission event annotations">
        ${sceneCards.map((item) => `
          <button class="sceneCard ${item.className}" data-jump="${item.id}" type="button" aria-label="Jump to ${item.label}">
            <span>${item.number}</span>
            <strong>${item.label}</strong>
            <em>${item.day}</em>
            <p>${item.short}</p>
          </button>
        `).join("")}
      </div>
      <aside class="observationPanel" id="observationPanel" aria-label="Observation note">
        <div class="observationHeader">
          <h2>Observation Note</h2>
          <button class="collapseButton" type="button" id="noteCollapseButton" aria-label="Collapse observation note" title="Collapse note">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10h10v4H7v-4Z" /></svg>
          </button>
        </div>
        <article>
          <span id="noteNumber">1</span>
          <div><strong id="noteTitle"></strong><p id="noteBody"></p></div>
        </article>
      </aside>
      <div class="missionConsole" aria-label="Playback controls">
        <button class="playButton" type="button" id="playButton" aria-label="Pause">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path id="playIcon" d="M8 5v14l11-7L8 5Z" /></svg>
        </button>
        <div class="metReadout"><span>MET</span><strong id="metTime">01:12:43:18</strong><em id="activeDay">Day 1</em></div>
        <div class="timelineRail">
          <input class="scrubber" id="scrubber" type="range" min="0" max="${DURATION}" step="0.1" aria-label="Mission playback timeline" />
          <div class="timelineMarkers" id="timelineMarkers"></div>
        </div>
        <div class="nextMoment">
          <span>Next Key Moment</span>
          <strong id="nextMomentLabel"></strong>
          <em id="nextMomentEta"></em>
          <button type="button" id="nextButton" aria-label="Next key moment">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h3v14H5V5Zm5 0 9 7-9 7V5Z" /></svg>
          </button>
        </div>
        <button class="followButton" type="button" id="followButton" aria-label="Follow Orion"><span></span>Follow Orion</button>
      </div>
      <div class="utilityControls">
        <button type="button" id="prevButton">Prev</button>
        <button type="button" id="restartButton">Restart</button>
        <label>Speed<select id="speedSelect" aria-label="Playback speed"><option value="0.6">0.6x</option><option value="1" selected>1x</option><option value="1.6">1.6x</option><option value="2.4">2.4x</option></select></label>
      </div>
    </section>
  </main>
`;

const dom = Object.fromEntries(
  ["activeDay", "metTime", "nextMomentLabel", "nextMomentEta", "noteNumber", "noteTitle", "noteBody", "noteCollapseButton", "observationPanel", "scrubber", "playButton", "playIcon", "restartButton", "prevButton", "nextButton", "speedSelect", "viewSelect", "followButton", "fullscreenButton", "timelineMarkers"].map((id) => [id, document.querySelector(`#${id}`)])
);

const state = {
  time: clamp(Number(localStorage.getItem("artemis-three-time") || 42), 0, DURATION),
  playing: localStorage.getItem("artemis-three-playing") !== "false",
  speed: 1,
  view: localStorage.getItem("artemis-three-view") || "cinematic",
  notesCollapsed: localStorage.getItem("artemis-notes-collapsed") === "true",
};

// Screen-compressed schematic, shaped from official NASA Artemis II references:
// SVS flight-derived trajectory visualization, AROW ephemeris availability, and the
// press kit timeline: high Earth checkout, Flight Day 2 TLI, Flight Day 6 lunar
// flyby, fuel-efficient free return, and Flight Day 10 entry/splashdown.
const curve = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-4.2, -0.16, 1.16),
    new THREE.Vector3(-3.12, 0.72, 1.7),
    new THREE.Vector3(-2.25, 0.02, 0.55),
    new THREE.Vector3(-3.16, -0.78, -1.18),
    new THREE.Vector3(-5.1, -0.55, -0.95),
    new THREE.Vector3(-4.25, 1.35, 1.05),
    new THREE.Vector3(-2.2, 1.55, 1.35),
    new THREE.Vector3(0.22, 1.82, 1.02),
    new THREE.Vector3(2.25, 1.32, -0.18),
    new THREE.Vector3(3.65, 1.02, -1.58),
    new THREE.Vector3(6.05, 0.1, -1.72),
    new THREE.Vector3(5.15, -1.36, 0),
    new THREE.Vector3(3.4, -1.34, 0.95),
    new THREE.Vector3(1.05, -1.1, 1.24),
    new THREE.Vector3(-1.25, -0.66, 0.36),
    new THREE.Vector3(-2.3, -1.55, -1.3),
    new THREE.Vector3(-5.1, -1.25, -0.95),
  ],
  false,
  "centripetal"
);
const pathPoints = curve.getSpacedPoints(980);

let trail = null;
let composer = null;
const markerRefs = [];
const sceneCardRefs = [];

dom.timelineMarkers.innerHTML = milestones.slice(0, -1).map((item, index) => `<button class="marker" data-jump="${item.id}" style="left:${item.t}%" type="button" aria-label="Jump to ${item.label}"><span>${index + 1}</span><strong>${item.label}</strong><em>${item.day.replace("Flight ", "")}</em></button>`).join("");
document.querySelectorAll("[data-jump]").forEach((button) => {
  const item = milestones.find((milestone) => milestone.id === button.dataset.jump);
  button.addEventListener("click", () => jumpTo(item.t, item.id));
});
document.querySelectorAll(".sceneCard").forEach((element) => {
  const item = milestones.find((milestone) => milestone.id === element.dataset.jump);
  if (item) sceneCardRefs.push({ element, item });
});
dom.scrubber.addEventListener("input", (event) => setTime(Number(event.target.value), true));
dom.playButton.addEventListener("click", () => {
  state.playing = !state.playing;
  localStorage.setItem("artemis-three-playing", String(state.playing));
  updateDom();
});
dom.restartButton.addEventListener("click", () => jumpTo(0));
dom.prevButton.addEventListener("click", () => {
  const item = milestones[clamp(activeIndex() - 1, 0, milestones.length - 1)];
  jumpTo(item.t, item.id);
});
dom.nextButton.addEventListener("click", () => {
  const item = milestones[clamp(activeIndex() + 1, 0, milestones.length - 1)];
  jumpTo(item.t, item.id);
});
dom.speedSelect.addEventListener("change", (event) => {
  state.speed = Number(event.target.value);
});
dom.viewSelect.addEventListener("change", (event) => {
  state.view = event.target.value;
  localStorage.setItem("artemis-three-view", state.view);
});
dom.followButton.addEventListener("click", () => {
  state.view = state.view === "follow" ? "cinematic" : "follow";
  localStorage.setItem("artemis-three-view", state.view);
  updateDom();
});
dom.noteCollapseButton.addEventListener("click", () => {
  state.notesCollapsed = !state.notesCollapsed;
  localStorage.setItem("artemis-notes-collapsed", String(state.notesCollapsed));
  updateDom();
});
dom.fullscreenButton.addEventListener("click", toggleFullscreen);
document.addEventListener("fullscreenchange", () => {
  updateFullscreenButton();
  requestAnimationFrame(resize);
});
document.addEventListener("webkitfullscreenchange", () => {
  updateFullscreenButton();
  requestAnimationFrame(resize);
});

const mount = document.querySelector("#game");
const stageFrame = document.querySelector("#stageFrame");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050814);
scene.fog = new THREE.Fog(0x050814, 11, 28);

const camera = new THREE.PerspectiveCamera(39, 16 / 9, 0.1, 100);
camera.position.set(0.05, 1.28, 7.85);
camera.lookAt(0.1, 0.12, -0.28);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
mount.appendChild(renderer.domElement);

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.08;
orbit.minDistance = 6.5;
orbit.maxDistance = 16;
orbit.target.set(0.1, 0.12, -0.28);

scene.add(new THREE.AmbientLight(0x9fb6ff, 0.46));
const sun = new THREE.DirectionalLight(0xffffff, 2.45);
sun.position.set(-5, 6, 8);
scene.add(sun);
const rim = new THREE.DirectionalLight(0x72d8ff, 0.85);
rim.position.set(6, -2, -5);
scene.add(rim);

createStars();
createSun();
createPlanets();
createReferenceRings();
createDepthCues();
createTrajectory();
const orion = createOrion();
scene.add(orion);
createMarkers();
resize();
window.addEventListener("resize", resize);

composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(mount.clientWidth, mount.clientHeight), 0.24, 0.42, 0.68);
composer.addPass(bloom);

let previous = performance.now();
renderer.setAnimationLoop((now) => {
  const delta = (now - previous) / 1000;
  previous = now;
  if (state.playing) {
    state.time = (state.time + delta * BASE_PLAYBACK_RATE * state.speed) % DURATION;
    localStorage.setItem("artemis-three-time", String(state.time.toFixed(2)));
    updateDom();
  }
  updateScene();
  orbit.update();
  updateSceneCardLayout(milestones[activeIndex()].id);
  composer.render();
});

updateDom();

function createStars() {
  const positions = new Float32Array(900);
  const colors = new Float32Array(900);
  for (let i = 0; i < 300; i += 1) {
    positions[i * 3] = ((i * 131) % 1600) / 64 - 12.5;
    positions[i * 3 + 1] = ((i * 71) % 900) / 74 - 6;
    positions[i * 3 + 2] = ((i * 197) % 1400) / 66 - 13;
    const warmth = (i * 29) % 100 > 76 ? 0.12 : 0;
    colors[i * 3] = 0.82 + warmth;
    colors[i * 3 + 1] = 0.9 + warmth * 0.35;
    colors[i * 3 + 2] = 1;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  scene.add(
    new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ size: 0.035, transparent: true, opacity: 0.86, vertexColors: true })
    )
  );
}

function createSun() {
  const sunSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createRadialTexture("#fff5cc", "#ffb84d"),
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  sunSprite.position.set(-7.2, 5.2, 7.4);
  sunSprite.scale.set(2.7, 2.7, 1);
  scene.add(sunSprite);
}

function createPlanets() {
  const textureLoader = new THREE.TextureLoader();
  const earthMap = textureLoader.load(EARTH_TEXTURE_URL);
  earthMap.colorSpace = THREE.SRGBColorSpace;
  earthMap.anisotropy = 8;
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(1.18, 96, 96),
    new THREE.MeshStandardMaterial({ map: earthMap, emissiveMap: earthMap, emissive: 0x17304a, emissiveIntensity: 0.18, roughness: 0.62, metalness: 0.02 })
  );
  earth.position.copy(EARTH);
  earth.rotation.y = -0.72;
  scene.add(earth);

  const cloudShell = new THREE.Mesh(
    new THREE.SphereGeometry(1.21, 96, 96),
    new THREE.MeshStandardMaterial({ map: createCloudTexture(), transparent: true, opacity: 0.18, roughness: 0.9, depthWrite: false })
  );
  cloudShell.position.copy(EARTH);
  scene.add(cloudShell);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.34, 96, 96),
    new THREE.MeshBasicMaterial({ color: 0x68b7ff, transparent: true, opacity: 0.18, side: THREE.BackSide, blending: THREE.AdditiveBlending })
  );
  atmosphere.position.copy(EARTH);
  scene.add(atmosphere);

  const earthGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: createRadialTexture("#74caff", "#1b79d8"), transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  earthGlow.position.copy(EARTH);
  earthGlow.scale.set(3.22, 3.22, 1);
  scene.add(earthGlow);

  const moon = createMoonFallback();
  scene.add(moon);
  loadNasaMoonModel(moon);

  scene.userData.earth = earth;
  scene.userData.cloudShell = cloudShell;
  scene.userData.atmosphere = atmosphere;
  scene.userData.moon = moon;
}

function createMoonFallback() {
  const moonTexture = createMoonTexture();
  const moon = new THREE.Group();
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.52, 96, 96), new THREE.MeshStandardMaterial({ map: moonTexture, bumpMap: moonTexture, bumpScale: 0.045, roughness: 0.94 }));
  moon.add(sphere);
  moon.position.copy(MOON);
  moon.userData.fallback = sphere;
  return moon;
}

function loadNasaMoonModel(moon) {
  new GLTFLoader().load(
    MOON_MODEL_URL,
    (gltf) => {
      const model = gltf.scene;
      normalizeModelToRadius(model, 0.52);
      model.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = false;
        child.receiveShadow = false;
        if (child.material) {
          child.material.roughness = 0.98;
          child.material.metalness = 0;
        }
      });
      if (moon.userData.fallback) {
        moon.remove(moon.userData.fallback);
        moon.userData.fallback.geometry.dispose();
        moon.userData.fallback.material.dispose();
      }
      moon.add(model);
      moon.userData.source = "NASA SVS LRO moon_small.glb";
    },
    undefined,
    () => {
      moon.userData.source = "procedural fallback";
    }
  );
}

function normalizeModelToRadius(model, radius) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const maxAxis = Math.max(size.x, size.y, size.z);
  model.position.sub(center);
  model.scale.setScalar((radius * 2) / maxAxis);
}

function createReferenceRings() {
  addRing(EARTH, 1.25, new THREE.Vector3(0.12, 1, 0.2), 0x4edfd8, 0.24);
  addRing(EARTH, 1.75, new THREE.Vector3(0.25, 0.65, 1), 0x4edfd8, 0.18);
  addRing(MOON, 0.78, new THREE.Vector3(0.18, 1, 0.2), 0x8ed6d1, 0.2);
}

function createDepthCues() {
  const grid = new THREE.Group();
  const material = new THREE.LineBasicMaterial({ color: 0x31526d, transparent: true, opacity: 0.16 });
  for (let x = -5; x <= 6; x += 1) {
    grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, -1.85, -2.35), new THREE.Vector3(x, -1.85, 2.35)]), material));
  }
  for (let z = -2; z <= 2; z += 1) {
    grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-5.4, -1.85, z), new THREE.Vector3(6.35, -1.85, z)]), material));
  }
  scene.add(grid);

  const dropMaterial = new THREE.LineBasicMaterial({ color: 0xf6c453, transparent: true, opacity: 0.16 });
  milestones.slice(1, -1).forEach((item) => {
    const point = pointAt(item.t / DURATION);
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([point, new THREE.Vector3(point.x, -1.85, point.z)]), dropMaterial));
  });
}

function createTrajectory() {
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 900, 0.013, 10, false), new THREE.MeshBasicMaterial({ color: 0x5fd8d4, transparent: true, opacity: 0.5 })));
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 900, 0.004, 8, false), new THREE.MeshBasicMaterial({ color: 0xdfffff, transparent: true, opacity: 0.86 })));
  addDirectionChevrons();
}

function createMarkers() {
  const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xf6c453 });
  const flybyMaterial = new THREE.MeshBasicMaterial({ color: 0xff805d });
  const markerGlowTexture = createRadialTexture("#fff0b3", "#f6c453");
  milestones.forEach((item) => {
    const marker = new THREE.Group();
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 18, 18), item.id === "flyby" ? flybyMaterial : markerMaterial);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerGlowTexture, transparent: true, opacity: item.id === "flyby" ? 0.62 : 0.46, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.set(0.26, 0.26, 1);
    marker.add(glow, dot);
    marker.position.copy(pointAt(item.t / DURATION));
    markerRefs.push({ id: item.id, mesh: marker, glow });
    scene.add(marker);
  });
}

function createOrion() {
  const root = new THREE.Group();
  root.scale.setScalar(0.56);
  const {
    capsuleMat,
    heatMat,
    serviceMat,
    panelMat,
    frameMat,
    darkMat,
    windowMat,
    goldMat,
    whiteMat,
  } = createOrionMaterials();
  const plumeMat = new THREE.MeshBasicMaterial({ color: 0x73d9ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const plasmaMat = new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });

  const capsule = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.28, 0.42, 72, 1, false), capsuleMat);
  capsule.rotation.x = Math.PI / 2;
  capsule.position.z = 0.16;
  root.add(capsule);

  const heat = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.056, 72), heatMat);
  heat.rotation.x = Math.PI / 2;
  heat.position.z = -0.08;
  root.add(heat);

  const adapter = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.21, 0.1, 64), whiteMat);
  adapter.rotation.x = Math.PI / 2;
  adapter.position.z = -0.17;
  root.add(adapter);

  const service = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.48, 72), serviceMat);
  service.rotation.x = Math.PI / 2;
  service.position.z = -0.46;
  root.add(service);

  const serviceBand = new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.011, 10, 64), frameMat);
  serviceBand.position.z = -0.23;
  root.add(serviceBand);

  const aftBand = new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.012, 10, 64), frameMat);
  aftBand.position.z = -0.7;
  root.add(aftBand);

  const engine = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.24, 40, 1, true), darkMat);
  engine.rotation.x = -Math.PI / 2;
  engine.position.z = -0.82;
  root.add(engine);

  const engineLip = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.011, 10, 48), goldMat);
  engineLip.position.z = -0.93;
  root.add(engineLip);

  const docking = new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.012, 12, 56), frameMat);
  docking.position.z = 0.43;
  root.add(docking);

  [-0.085, 0.085].forEach((x) => {
    const window = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.016, 0.045), windowMat);
    window.position.set(x, 0.235, 0.14);
    window.rotation.x = 0.55;
    root.add(window);
  });

  [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((angle) => {
    addServiceDetail(root, angle, darkMat, goldMat, frameMat);
  });

  [-1, 1].forEach((side) => {
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.34, 10), frameMat);
    antenna.rotation.z = side * 0.58;
    antenna.position.set(side * 0.24, 0.02, -0.08);
    root.add(antenna);

    const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.05, 16), darkMat);
    thruster.rotation.x = Math.PI / 2;
    thruster.position.set(side * 0.22, -0.1, -0.62);
    root.add(thruster);
  });

  [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((angle) => {
    addSolarWing(root, angle, panelMat, frameMat, goldMat);
  });

  const plume = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.72, 36, 1, true), plumeMat);
  plume.rotation.x = -Math.PI / 2;
  plume.position.z = -1.08;
  root.add(plume);

  const plasma = new THREE.Mesh(new THREE.SphereGeometry(0.27, 32, 18), plasmaMat);
  plasma.scale.set(1, 0.82, 1.45);
  plasma.position.z = 0.12;
  root.add(plasma);

  const glow = new THREE.PointLight(0x6bd8ff, 1.0, 1.6);
  glow.position.set(0, 0, -0.7);
  root.add(glow);
  root.userData = { plume, plumeMat, plasma, plasmaMat, engineGlow: glow };
  return root;
}

function createOrionMaterials() {
  return {
    capsuleMat: new THREE.MeshPhysicalMaterial({ map: atlasTexture(0, 0, 610, 610), color: 0xf5f6f2, metalness: 0.22, roughness: 0.46, clearcoat: 0.22 }),
    heatMat: new THREE.MeshStandardMaterial({ map: atlasTexture(627, 0, 627, 610), color: 0xb28460, roughness: 0.72, metalness: 0.08 }),
    serviceMat: new THREE.MeshStandardMaterial({ map: atlasTexture(627, 610, 627, 644), color: 0xbec3c5, roughness: 0.36, metalness: 0.62 }),
    panelMat: new THREE.MeshStandardMaterial({ map: atlasTexture(0, 815, 610, 390), color: 0x224fa7, emissive: 0x071f55, emissiveIntensity: 0.18, roughness: 0.2, metalness: 0.18 }),
    frameMat: new THREE.MeshStandardMaterial({ map: atlasTexture(627, 610, 627, 644), color: 0xd8e0e5, metalness: 0.58, roughness: 0.28 }),
    darkMat: new THREE.MeshStandardMaterial({ map: atlasTexture(0, 610, 610, 205), color: 0x25282b, metalness: 0.82, roughness: 0.22 }),
    windowMat: new THREE.MeshPhysicalMaterial({ map: atlasTexture(0, 610, 610, 205), color: 0x05070b, emissive: 0x174c8a, emissiveIntensity: 0.1, roughness: 0.08, clearcoat: 0.85 }),
    goldMat: new THREE.MeshStandardMaterial({ color: 0xc39846, metalness: 0.82, roughness: 0.28 }),
    whiteMat: new THREE.MeshStandardMaterial({ map: atlasTexture(0, 0, 610, 610), color: 0xf3f4ee, roughness: 0.52, metalness: 0.2 }),
  };
}

function atlasTexture(x, y, width, height) {
  const texture = new THREE.TextureLoader().load(orionAtlasUrl);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(width / ORION_ATLAS_SIZE, height / ORION_ATLAS_SIZE);
  texture.offset.set(x / ORION_ATLAS_SIZE, 1 - (y + height) / ORION_ATLAS_SIZE);
  return texture;
}

function addServiceDetail(root, angle, darkMat, goldMat, frameMat) {
  const radial = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
  const tangentAngle = angle + Math.PI / 2;
  const radiator = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.012, 0.25), darkMat);
  radiator.position.copy(radial.clone().multiplyScalar(0.225)).add(new THREE.Vector3(0, 0, -0.47));
  radiator.rotation.z = tangentAngle;
  root.add(radiator);

  [-0.08, 0.08].forEach((offset) => {
    const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.06, 16), goldMat);
    thruster.position.copy(radial.clone().multiplyScalar(0.24)).add(new THREE.Vector3(0, 0, -0.5 + offset));
    thruster.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), radial);
    root.add(thruster);
  });

  const latch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.018, 0.04), frameMat);
  latch.position.copy(radial.clone().multiplyScalar(0.235)).add(new THREE.Vector3(0, 0, -0.25));
  latch.rotation.z = tangentAngle;
  root.add(latch);
}

function addSolarWing(root, angle, panelMat, frameMat, goldMat) {
  const group = new THREE.Group();
  const radial = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
  const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1, 0.11), goldMat);
  hinge.position.copy(radial.clone().multiplyScalar(0.28)).add(new THREE.Vector3(0, 0, -0.42));
  hinge.rotation.z = angle;
  group.add(hinge);

  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.42, 10), frameMat);
  boom.position.copy(radial.clone().multiplyScalar(0.48)).add(new THREE.Vector3(0, 0, -0.42));
  boom.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), radial);
  group.add(boom);

  for (let segment = 0; segment < 2; segment += 1) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.03, 0.25), panelMat);
    panel.position.copy(radial.clone().multiplyScalar(0.72 + segment * 0.5)).add(new THREE.Vector3(0, 0, -0.42));
    panel.rotation.z = angle;
    group.add(panel);
  }

  for (let i = 0; i <= 4; i += 1) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.038, 0.28), frameMat);
    rib.position.copy(radial.clone().multiplyScalar(0.47 + i * 0.24)).add(new THREE.Vector3(0, 0, -0.42));
    rib.rotation.z = angle;
    group.add(rib);
  }

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

  const burn = enginePulse(state.time);
  orion.userData.plume.visible = burn > 0.02;
  orion.userData.plumeMat.opacity = 0.1 + burn * 0.56;
  orion.userData.plume.scale.set(0.72 + burn * 0.65, 0.72 + burn * 0.65, 0.86 + burn * 1.1);
  orion.userData.engineGlow.intensity = 0.75 + burn * 2.3;
  const entry = enginePulse(state.time, [90], 5.4);
  orion.userData.plasma.visible = entry > 0.02;
  orion.userData.plasmaMat.opacity = entry * 0.34;
  orion.userData.plasma.scale.set(1 + entry * 0.4, 0.82 + entry * 0.2, 1.45 + entry * 0.52);

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
  markerRefs.forEach((marker) => {
    const activeScale = marker.id === active.id ? 1.45 : 1;
    marker.mesh.scale.setScalar(activeScale);
    marker.glow.material.opacity = marker.id === active.id ? 0.78 : 0.38;
  });
  scene.userData.earth.rotation.y += 0.0022;
  scene.userData.cloudShell.rotation.y += 0.003;
  scene.userData.atmosphere.rotation.y += 0.0013;
  scene.userData.moon.rotation.y += 0.001;
  updateCamera(progress, point, tangent);
}

function updateCamera(progress, point, tangent) {
  if (state.view === "manual") return;

  let target = new THREE.Vector3(0.2, -0.08, 0.15);
  let position = new THREE.Vector3(-1.1, 5.35, 10.6);
  const safeSide = Math.abs(tangent.y) > 0.92 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

  if (state.view === "follow") {
    const shot = cinematicFollowShot(milestones[activeIndex()].id, progress, point, tangent, safeSide);
    target = shot.target;
    position = shot.position;
  } else if (state.view === "earth") {
    target = EARTH.clone().lerp(point, 0.2);
    position = EARTH.clone().add(new THREE.Vector3(-0.75, 2.15, 4.35));
  } else if (state.view === "moon") {
    target = MOON.clone().lerp(point, 0.25);
    position = MOON.clone().add(new THREE.Vector3(1.7, 1.65, 3.25));
  } else {
    const shot = cinematicShot(milestones[activeIndex()].id, progress, point, tangent);
    target = shot.target;
    position = shot.position;
  }

  camera.position.lerp(position, 0.034);
  orbit.target.lerp(target, 0.055);
}

function cinematicShot(id, progress, point, tangent) {
  const drift = new THREE.Vector3(
    Math.sin(progress * Math.PI * 2.1) * 0.08,
    Math.cos(progress * Math.PI * 1.7) * 0.06,
    Math.sin(progress * Math.PI * 1.3) * 0.08
  );
  const shots = {
    launch: {
      target: EARTH.clone().lerp(point, 0.32).add(new THREE.Vector3(0.52, 0.18, -0.1)),
      position: EARTH.clone().add(new THREE.Vector3(3.15, 2.16, 5.7)),
    },
    orbit: {
      target: EARTH.clone().lerp(point, 0.36).add(new THREE.Vector3(0.42, 0.06, -0.18)),
      position: EARTH.clone().add(new THREE.Vector3(3.35, 1.95, 5.35)),
    },
    tli: {
      target: EARTH.clone().lerp(point, 0.46).add(new THREE.Vector3(0.38, 0.24, -0.12)),
      position: EARTH.clone().add(new THREE.Vector3(4.35, 2.32, 4.85)),
    },
    coast: {
      target: EARTH.clone().lerp(MOON, 0.46).lerp(point, 0.38).add(new THREE.Vector3(-0.1, 0.22, 0.08)),
      position: EARTH.clone().lerp(MOON, 0.44).add(new THREE.Vector3(-2.55, 2.52, 6.75)),
    },
    flyby: {
      target: MOON.clone().lerp(point, 0.42).lerp(EARTH, 0.12).add(new THREE.Vector3(-0.22, 0.18, 0.06)),
      position: MOON.clone().add(new THREE.Vector3(-3.15, 2.18, 4.72)),
    },
    return: {
      target: EARTH.clone().lerp(point, 0.46).add(new THREE.Vector3(-0.22, 0.16, -0.02)),
      position: EARTH.clone().add(new THREE.Vector3(-2.75, 2.34, 6.08)),
    },
    entry: {
      target: EARTH.clone().lerp(point, 0.34).add(new THREE.Vector3(0.42, 0.0, 0.12)),
      position: EARTH.clone().add(new THREE.Vector3(2.55, 1.68, 4.36)),
    },
    splashdown: {
      target: EARTH.clone().lerp(point, 0.28).add(new THREE.Vector3(0.2, 0.08, 0.12)),
      position: EARTH.clone().add(new THREE.Vector3(2.25, 1.5, 4.4)),
    },
  };
  const shot = shots[id] || shots.coast;
  const forwardBreath = tangent.clone().multiplyScalar(0.08 * Math.sin(progress * Math.PI * 3.2));
  return {
    target: shot.target.add(drift.clone().multiplyScalar(0.45)).add(forwardBreath),
    position: shot.position.add(drift),
  };
}

function cinematicFollowShot(id, progress, point, tangent, safeSide) {
  const systemAnchor = id === "flyby" || id === "coast"
    ? EARTH.clone().lerp(MOON, id === "flyby" ? 0.72 : 0.5)
    : EARTH.clone().lerp(point, id === "return" || id === "entry" ? 0.42 : 0.28);
  const composed = cinematicShot(id, progress, point, tangent);
  const chaseTarget = point.clone().add(tangent.clone().multiplyScalar(0.42)).lerp(systemAnchor, 0.28);
  const chasePosition = point
    .clone()
    .add(tangent.clone().multiplyScalar(-3.25))
    .add(safeSide.clone().multiplyScalar(2.05))
    .add(new THREE.Vector3(0, 1.72, 0.82));
  return {
    target: composed.target.clone().lerp(chaseTarget, 0.52),
    position: composed.position.clone().lerp(chasePosition, 0.48),
  };
}

function enginePulse(time, centers = [0, 24, 42, 73], width = 3.2) {
  return centers.reduce((peak, center) => Math.max(peak, Math.exp(-((time - center) ** 2) / (width * width))), 0);
}

function addDirectionChevrons() {
  const material = new THREE.MeshBasicMaterial({ color: 0xf6c453, transparent: true, opacity: 0.72 });
  [0.18, 0.34, 0.5, 0.68, 0.84].forEach((t) => {
    const point = pointAt(t);
    const tangent = pointAt(Math.min(1, t + 0.01)).sub(pointAt(Math.max(0, t - 0.01))).normalize();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.15, 18), material);
    cone.position.copy(point);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
    scene.add(cone);
  });
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

function createCloudTexture() {
  return makeCanvasTexture(1024, 512, (ctx, width, height) => {
    ctx.clearRect(0, 0, width, height);
    ctx.filter = "blur(7px)";
    for (let i = 0; i < 42; i += 1) {
      const x = (i * 151) % width;
      const y = (i * 83) % height;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.14 + (i % 4) * 0.025})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 70 + (i % 5) * 18, 9 + (i % 3) * 5, (i % 9) * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.filter = "none";
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

function createRadialTexture(inner, outer) {
  return makeCanvasTexture(256, 256, (ctx, width, height) => {
    const gradient = ctx.createRadialGradient(width / 2, height / 2, 4, width / 2, height / 2, width / 2);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(0.24, inner);
    gradient.addColorStop(1, transparentHex(outer));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  });
}

function transparentHex(hex) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0)`;
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

function resize() {
  const width = mount.clientWidth;
  const height = mount.clientHeight;
  renderer.setSize(width, height, false);
  if (composer) composer.setSize(width, height);
  camera.aspect = width / Math.max(1, height);
  camera.updateProjectionMatrix();
  if (camera.aspect < 1.2 && camera.position.length() < 13) camera.position.set(0, 5.7, 14.4);
}

async function toggleFullscreen() {
  try {
    if (!fullscreenElement()) {
      await (stageFrame.requestFullscreen?.() || stageFrame.webkitRequestFullscreen?.());
    } else {
      await (document.exitFullscreen?.() || document.webkitExitFullscreen?.());
    }
  } catch {
    updateFullscreenButton();
  }
}

function updateFullscreenButton() {
  const fullscreen = fullscreenElement() === stageFrame;
  dom.fullscreenButton.classList.toggle("active", fullscreen);
  dom.fullscreenButton.setAttribute("aria-label", fullscreen ? "Exit fullscreen" : "Enter fullscreen");
  dom.fullscreenButton.title = fullscreen ? "Exit fullscreen" : "Fullscreen";
  dom.fullscreenButton.innerHTML = fullscreen
    ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3H7v4H3v2h6V3Zm8 0h-2v6h6V7h-4V3ZM3 17h4v4h2v-6H3v2Zm12 4h2v-4h4v-2h-6v6Z" /></svg>`
    : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5h2V5h3V3Zm8 0v2h3v3h2V3h-5ZM5 16H3v5h5v-2H5v-3Zm14 3h-3v2h5v-5h-2v3Z" /></svg>`;
}

function fullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement;
}

function pointAt(progress) {
  return curve.getPointAt(clamp(progress, 0, 1));
}

function activeIndex() {
  return milestones.reduce((best, item, index) => (state.time >= item.t ? index : best), 0);
}

function setTime(time, pause = false) {
  state.time = clamp(time, 0, DURATION);
  if (pause) {
    state.playing = false;
    localStorage.setItem("artemis-three-playing", "false");
  }
  localStorage.setItem("artemis-three-time", String(state.time.toFixed(2)));
  updateDom();
}

function jumpTo(time, id = null) {
  if (id) localStorage.setItem("artemis-last-jump", id);
  setTime(time, true);
}

function updateDom() {
  const active = milestones[activeIndex()];
  const activeNote = observationNotes[active.id] || observationNotes.coast;
  const next = milestones.find((item) => item.t > state.time) || milestones[milestones.length - 1];
  const eta = Math.max(0, next.t - state.time);
  dom.activeDay.textContent = missionDayLabel(state.time);
  dom.metTime.textContent = metFromTime(state.time);
  dom.nextMomentLabel.textContent = next.label;
  dom.nextMomentEta.textContent = eta === 0 ? "now" : `in ${eta.toFixed(0)} mission units`;
  dom.noteNumber.textContent = String(activeIndex() + 1);
  dom.noteTitle.textContent = activeNote[0];
  dom.noteBody.textContent = activeNote[1];
  dom.scrubber.value = String(state.time);
  dom.playButton.setAttribute("aria-label", state.playing ? "Pause" : "Play");
  dom.playIcon.setAttribute("d", state.playing ? "M7 5h4v14H7V5Zm6 0h4v14h-4V5Z" : "M8 5v14l11-7L8 5Z");
  dom.viewSelect.value = state.view;
  dom.followButton.classList.toggle("active", state.view === "follow");
  dom.observationPanel.classList.toggle("collapsed", state.notesCollapsed);
  dom.noteCollapseButton.setAttribute("aria-label", state.notesCollapsed ? "Expand observation note" : "Collapse observation note");
  dom.noteCollapseButton.title = state.notesCollapsed ? "Expand note" : "Collapse note";
  document.querySelectorAll("[data-jump]").forEach((button) => {
    const item = milestones.find((milestone) => milestone.id === button.dataset.jump);
    const isActive = button.dataset.jump === active.id;
    button.classList.toggle("active", isActive);
    if (button.classList.contains("sceneCard")) {
      const visibility = sceneCardVisibility(item, active.id);
      button.classList.toggle("visible", visibility.visible);
      button.style.setProperty("--card-delay", `${visibility.delay}ms`);
    }
  });
}

function sceneCardVisibility(item, activeId) {
  if (!item) return { visible: false, delay: 0 };
  const active = item.id === activeId;
  const card = sceneCards.find((candidate) => candidate.id === item.id);
  return { visible: active, delay: card ? 90 : 0 };
}

function updateSceneCardLayout(activeId) {
  const width = stageFrame.clientWidth;
  const height = stageFrame.clientHeight;
  if (!width || !height) return;
  sceneCardRefs.forEach(({ element, item }) => {
    const isActive = item.id === activeId;
    const placed = activeCardSlot(item.id, width, height);
    element.style.setProperty("--card-x", `${placed.x}px`);
    element.style.setProperty("--card-y", `${placed.y}px`);
    element.classList.toggle("offscreen", !isActive);
  });
}

function activeCardSlot(id, width, height) {
  const consoleTop = height - 156;
  const headerBottom = 150;
  const slots = {
    launch: [0.72, 0.42],
    orbit: [0.72, 0.52],
    tli: [0.7, 0.6],
    coast: [0.52, 0.3],
    flyby: [0.27, 0.44],
    return: [0.69, 0.36],
    entry: [0.72, 0.46],
    splashdown: [0.33, 0.42],
  };
  const [xRatio, yRatio] = slots[id] || [0.66, 0.42];
  return {
    x: clamp(width * xRatio, 165, width - 165),
    y: clamp(height * yRatio, headerBottom + 72, consoleTop - 74),
  };
}

function metFromTime(time) {
  const totalHours = Math.round((time / DURATION) * 10 * 24);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = Math.floor((time * 37) % 60);
  const seconds = Math.floor((time * 113) % 60);
  return `${String(days).padStart(2, "0")}:${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function missionDayLabel(time) {
  return `DAY ${Math.max(0, Math.floor((time / DURATION) * 10))}`;
}

function smoothstep(edge0, edge1, value) {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
