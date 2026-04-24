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

const concepts = [
  ["Trajectory", "A trajectory is the path an object follows through 3D space. Here it curves above, behind, and around Earth and the Moon."],
  ["Free return", "A path that uses gravity to bring Orion home without needing a huge extra engine burn."],
  ["Flyby", "A close pass around the Moon. Artemis II tests the crew spacecraft without landing."],
];

const briefingIntel = {
  launch: ["Watch the rocket hand Orion its first giant push away from Earth.", "The mission starts by building enough speed and height to safely reach orbit.", "Find Earth first, then look for Orion just outside the bright atmosphere."],
  orbit: ["Look for Orion looping close to Earth before it commits to deep space.", "Staying close gives the crew and ground teams time to check every major system.", "Pause here and compare the small spacecraft to the size of Earth."],
  tli: ["Watch for the bright engine plume as Orion leaves Earth orbit.", "One carefully timed burn changes the whole path from orbiting Earth to coasting toward the Moon.", "Switch to Follow view and see how the ship points along the curved path."],
  coast: ["The ship is mostly gliding while tiny corrections keep the target lined up.", "Spacecraft often travel by coasting after a burn instead of firing engines all the time.", "Use the scrubber slowly here and notice that the path is not a flat circle."],
  flyby: ["Orion passes the Moon without landing and lets lunar gravity bend its route.", "This close pass is the mission's big deep-space navigation test.", "Switch to Moon view and watch how the return loop wraps around the Moon."],
  return: ["The path is already aimed back toward Earth, even without a huge rescue burn.", "A free-return style path gives the crew a safer way home if something goes wrong.", "Follow the yellow trail back from the Moon toward Earth."],
  entry: ["The crew module meets Earth's atmosphere at very high speed.", "Air acts like a brake, turning speed into heat before parachutes can work.", "Look for the orange entry glow around Orion near Earth."],
  splashdown: ["The mission ends over the ocean where recovery teams can reach Orion.", "Water recovery gives a wide, forgiving landing area after the long trip home.", "Scrub back to launch and compare the full path from start to finish."],
};

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
        <button class="fullscreenButton" type="button" id="fullscreenButton" aria-label="Enter fullscreen" title="Fullscreen">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5h2V5h3V3Zm8 0v2h3v3h2V3h-5ZM5 16H3v5h5v-2H5v-3Zm14 3h-3v2h5v-5h-2v3Z" /></svg>
        </button>
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
        <label class="speedControl"><span>View</span><select id="viewSelect" aria-label="Camera view"><option value="cinematic" selected>Cinematic</option><option value="follow">Follow</option><option value="earth">Earth</option><option value="moon">Moon</option><option value="manual">Manual</option></select></label>
      </div>
    </section>
    <aside class="learningPanel intelPanel" aria-label="Mission intelligence panel">
      <div class="intelHeader">
        <div><p class="eyebrow">Mission intelligence</p><h2>Flight Director</h2></div>
        <span class="completePill">Animation v1 complete</span>
      </div>
      <div class="modeSwitch" aria-label="Briefing mode">
        <button type="button" id="holdBriefingButton">Hold briefing</button>
        <button type="button" id="syncBriefingButton">Follow Orion</button>
      </div>
      <article class="briefingCard">
        <div class="briefingMeta">
          <span id="briefingDay"></span>
          <strong id="briefingLabel"></strong>
          <em id="briefingModeLabel"></em>
        </div>
        <h3 id="briefingTitle"></h3>
        <p id="briefingText"></p>
        <div class="briefingGrid">
          <article><span>Watch</span><p id="watchText"></p></article>
          <article><span>Why it matters</span><p id="whyText"></p></article>
          <article><span>Try this</span><p id="tryText"></p></article>
        </div>
        <div class="briefingActions">
          <button class="iconButton muted" type="button" id="briefingPrevButton">Prev briefing</button>
          <button class="iconButton muted" type="button" id="briefingNextButton">Next briefing</button>
        </div>
      </article>
      <div class="conceptList">${concepts.map(([title, body]) => `<article class="conceptCard"><div class="conceptIcon"></div><div><h3>${title}</h3><p>${body}</p></div></article>`).join("")}</div>
      <p class="sourceNote">Reference: NASA SVS flight-derived trajectory, NASA AROW ephemeris, and NASA Artemis II press kit. Distances are compressed for screen learning.</p>
      <div class="missionList" id="missionList"></div>
    </aside>
  </main>
`;

const dom = Object.fromEntries(
  ["activeDay", "activeLabel", "captionTitle", "captionShort", "briefingDay", "briefingLabel", "briefingModeLabel", "briefingTitle", "briefingText", "watchText", "whyText", "tryText", "holdBriefingButton", "syncBriefingButton", "briefingPrevButton", "briefingNextButton", "scrubber", "playButton", "restartButton", "prevButton", "nextButton", "speedSelect", "viewSelect", "fullscreenButton", "timelineMarkers", "missionList"].map((id) => [id, document.querySelector(`#${id}`)])
);

const state = {
  time: clamp(Number(localStorage.getItem("artemis-three-time") || 0), 0, DURATION),
  playing: true,
  speed: 1,
  view: localStorage.getItem("artemis-three-view") || "cinematic",
  briefingMode: localStorage.getItem("artemis-briefing-mode") || "hold",
  selectedId: localStorage.getItem("artemis-briefing-id") || "launch",
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
let activeLabel = null;
let lastActiveId = null;
let composer = null;
const markerRefs = [];

dom.timelineMarkers.innerHTML = milestones.map((item) => `<button class="marker" data-jump="${item.id}" style="left:${item.t}%" type="button" aria-label="Jump to ${item.label}"><span>${item.label}</span></button>`).join("");
dom.missionList.innerHTML = milestones.map((item) => `<button class="missionItem" data-briefing="${item.id}" type="button"><span>${item.day}</span><strong>${item.label}</strong><em></em></button>`).join("");
document.querySelectorAll("[data-jump]").forEach((button) => {
  const item = milestones.find((milestone) => milestone.id === button.dataset.jump);
  button.addEventListener("click", () => jumpTo(item.t, item.id));
});
document.querySelectorAll("[data-briefing]").forEach((button) => {
  button.addEventListener("click", () => selectBriefing(button.dataset.briefing));
});
dom.scrubber.addEventListener("input", (event) => setTime(Number(event.target.value), true));
dom.playButton.addEventListener("click", () => {
  state.playing = !state.playing;
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
dom.holdBriefingButton.addEventListener("click", () => setBriefingMode("hold"));
dom.syncBriefingButton.addEventListener("click", () => setBriefingMode("follow"));
dom.briefingPrevButton.addEventListener("click", () => stepBriefing(-1));
dom.briefingNextButton.addEventListener("click", () => stepBriefing(1));
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
const stageFrame = document.querySelector(".stageFrame");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050814);
scene.fog = new THREE.Fog(0x050814, 11, 28);

const camera = new THREE.PerspectiveCamera(39, 16 / 9, 0.1, 100);
camera.position.set(-1.1, 5.35, 10.6);
camera.lookAt(0.15, -0.08, 0.15);

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
orbit.target.set(0.15, -0.08, 0.15);

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
    state.time = (state.time + delta * 5.8 * state.speed) % DURATION;
    localStorage.setItem("artemis-three-time", String(state.time.toFixed(2)));
    updateDom();
  }
  updateScene();
  orbit.update();
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
    new THREE.SphereGeometry(0.95, 96, 96),
    new THREE.MeshStandardMaterial({ map: earthMap, emissiveMap: earthMap, emissive: 0x17304a, emissiveIntensity: 0.18, roughness: 0.62, metalness: 0.02 })
  );
  earth.position.copy(EARTH);
  earth.rotation.y = -0.72;
  scene.add(earth);

  const cloudShell = new THREE.Mesh(
    new THREE.SphereGeometry(0.973, 96, 96),
    new THREE.MeshStandardMaterial({ map: createCloudTexture(), transparent: true, opacity: 0.18, roughness: 0.9, depthWrite: false })
  );
  cloudShell.position.copy(EARTH);
  scene.add(cloudShell);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.08, 96, 96),
    new THREE.MeshBasicMaterial({ color: 0x68b7ff, transparent: true, opacity: 0.18, side: THREE.BackSide, blending: THREE.AdditiveBlending })
  );
  atmosphere.position.copy(EARTH);
  scene.add(atmosphere);

  const earthGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: createRadialTexture("#74caff", "#1b79d8"), transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  earthGlow.position.copy(EARTH);
  earthGlow.scale.set(2.65, 2.65, 1);
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
  if (active.id !== lastActiveId) {
    lastActiveId = active.id;
    if (activeLabel) scene.remove(activeLabel);
    activeLabel = createLabel(active.label);
    activeLabel.position.copy(pointAt(active.t / DURATION).add(new THREE.Vector3(0.22, 0.28, 0)));
    scene.add(activeLabel);
  }

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
    target = point.clone().add(tangent.clone().multiplyScalar(0.38));
    position = point.clone().add(tangent.clone().multiplyScalar(-2.45)).add(safeSide.multiplyScalar(1.4)).add(new THREE.Vector3(0, 1.18, 0.45));
  } else if (state.view === "earth") {
    target = EARTH.clone().lerp(point, 0.2);
    position = EARTH.clone().add(new THREE.Vector3(-0.75, 2.15, 4.35));
  } else if (state.view === "moon") {
    target = MOON.clone().lerp(point, 0.25);
    position = MOON.clone().add(new THREE.Vector3(1.7, 1.65, 3.25));
  } else {
    const lunarWeight = smoothstep(0.44, 0.66, progress) * (1 - smoothstep(0.74, 0.92, progress));
    const earthReturn = smoothstep(0.76, 1, progress);
    const anchor = EARTH.clone().lerp(MOON, lunarWeight).lerp(EARTH, earthReturn * 0.72);
    target = anchor.lerp(point, 0.34 + Math.sin(progress * Math.PI) * 0.18);
    const orbitAngle = progress * Math.PI * 1.58 + 0.8;
    const distance = 5.9 + smoothstep(0.24, 0.62, progress) * 1.7 - smoothstep(0.82, 1, progress) * 0.8;
    position = target.clone().add(new THREE.Vector3(Math.cos(orbitAngle) * distance, 2.55 + Math.sin(progress * Math.PI * 2) * 0.52, Math.sin(orbitAngle) * distance));
  }

  camera.position.lerp(position, 0.034);
  orbit.target.lerp(target, 0.055);
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
  if (pause) state.playing = false;
  localStorage.setItem("artemis-three-time", String(state.time.toFixed(2)));
  updateDom();
}

function jumpTo(time, id = null) {
  if (id) selectBriefing(id, false);
  setTime(time, true);
}

function selectBriefing(id, render = true) {
  state.selectedId = id;
  state.briefingMode = "hold";
  localStorage.setItem("artemis-briefing-id", state.selectedId);
  localStorage.setItem("artemis-briefing-mode", state.briefingMode);
  if (render) updateDom();
}

function setBriefingMode(mode) {
  state.briefingMode = mode;
  if (mode === "follow") state.selectedId = milestones[activeIndex()].id;
  localStorage.setItem("artemis-briefing-mode", state.briefingMode);
  localStorage.setItem("artemis-briefing-id", state.selectedId);
  updateDom();
}

function stepBriefing(direction) {
  const selected = selectedIndex();
  const next = milestones[clamp(selected + direction, 0, milestones.length - 1)];
  selectBriefing(next.id);
}

function updateDom() {
  const active = milestones[activeIndex()];
  if (state.briefingMode === "follow") state.selectedId = active.id;
  const briefing = selectedMilestone();
  const [watch, why, task] = briefingIntel[briefing.id];
  dom.activeDay.textContent = active.day;
  dom.activeLabel.textContent = active.label;
  dom.captionTitle.textContent = active.title;
  dom.captionShort.textContent = active.short;
  dom.briefingDay.textContent = briefing.day;
  dom.briefingLabel.textContent = briefing.label;
  dom.briefingModeLabel.textContent = briefing.id === active.id ? "Now in view" : "Briefing held";
  dom.briefingTitle.textContent = briefing.title;
  dom.briefingText.textContent = briefing.dialog;
  dom.watchText.textContent = watch;
  dom.whyText.textContent = why;
  dom.tryText.textContent = task;
  dom.scrubber.value = String(state.time);
  dom.playButton.textContent = state.playing ? "Pause" : "Play";
  dom.playButton.setAttribute("aria-label", state.playing ? "Pause" : "Play");
  dom.viewSelect.value = state.view;
  dom.holdBriefingButton.classList.toggle("active", state.briefingMode === "hold");
  dom.syncBriefingButton.classList.toggle("active", state.briefingMode === "follow");
  dom.briefingPrevButton.disabled = selectedIndex() === 0;
  dom.briefingNextButton.disabled = selectedIndex() === milestones.length - 1;
  document.querySelectorAll("[data-jump]").forEach((button) => button.classList.toggle("active", button.dataset.jump === active.id));
  document.querySelectorAll("[data-briefing]").forEach((button) => {
    button.classList.toggle("active", button.dataset.briefing === active.id);
    button.classList.toggle("selected", button.dataset.briefing === briefing.id);
    button.querySelector("em").textContent = button.dataset.briefing === active.id ? "in view" : "";
  });
}

function selectedMilestone() {
  return milestones.find((item) => item.id === state.selectedId) || milestones[activeIndex()];
}

function selectedIndex() {
  return milestones.findIndex((item) => item.id === selectedMilestone().id);
}

function smoothstep(edge0, edge1, value) {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
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
