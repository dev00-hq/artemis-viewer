import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import orionAtlasUrl from "./assets/orion-texture-atlas.png";
import { createI18n } from "./i18n.js";
import { en } from "./locales/en.js";
import { es } from "./locales/es.js";
import "@fontsource/source-sans-pro/latin-400.css";
import "@fontsource/source-sans-pro/latin-600.css";
import "@fontsource/source-sans-pro/latin-700.css";
import "@fontsource/source-sans-pro/latin-ext-400.css";
import "@fontsource/source-sans-pro/latin-ext-600.css";
import "@fontsource/source-sans-pro/latin-ext-700.css";
import "./styles.css";

const DURATION = 100;
const ORION_ATLAS_SIZE = 1254;
const EARTH_TEXTURE_URL = "/assets/earth-blue-marble-april.jpg";
const MOON_MODEL_URL = "/assets/moon_nasa_lro_small.glb";
const EARTH = new THREE.Vector3(-3.55, -0.1, 0);
const MOON = new THREE.Vector3(4.75, 0.18, -1.1);
const CAMERA_FOV = 28.8;
const CAMERA_ZOOM_OUT = 1.6;
const ORION_WORLD_SCALE = 0.2856;
const CARD_POSITION_STORAGE_KEY = "artemis-card-positions-v1";
const CARD_SIZE_STORAGE_KEY = "artemis-card-sizes-v1";
const NOTE_COLLAPSE_STORAGE_KEY = "artemis-notes-collapsed-v2";
const LOCALE_STORAGE_KEY = "artemis-locale";
const EXPANDED_IMAGE_PLAYBACK_FACTOR = 10;

const locales = { en, es };
const requestedLocale = localStorage.getItem(LOCALE_STORAGE_KEY) || "en";
const i18n = createI18n(locales, requestedLocale);
const copy = i18n.messages;
const { ui } = copy;
document.documentElement.lang = i18n.locale;
document.title = ui.title;

const milestones = copy.mission.milestones.map(
  ([id, t, label, day, title, short, dialog]) => ({
    id,
    t,
    label,
    day,
    title,
    short,
    dialog,
  }),
);

const playbackSegmentSeconds = {
  launch: 5,
  orbit: 5,
  tli: 5,
  coast: 5,
  flyby: 5,
  return: 5,
  entry: 5,
};

const observationNotes = copy.mission.observationNotes;
const officialSources = copy.sources;
const sceneCardLessons = Object.fromEntries(
  Object.entries(copy.cards.lessons).map(([id, lesson]) => [
    id,
    {
      ...lesson,
      sources: lesson.sourceIds.map((sourceId) => officialSources[sourceId]),
    },
  ]),
);
const sceneCardImages = copy.cards.images;
const chileHighlights = copy.chile.highlights.map((item) => ({
  ...item,
  sources: item.sourceIds.map((sourceId) => officialSources[sourceId]),
}));

const sceneCards = [
  ["launch", "cardLaunch"],
  ["orbit", "cardOrbit"],
  ["tli", "cardTli"],
  ["coast", "cardCoast"],
  ["flyby", "cardFlyby"],
  ["return", "cardReturn"],
  ["entry", "cardEntry"],
].map(([id, className], index) => {
  const lesson = sceneCardLessons[id];
  return {
    ...milestones.find((item) => item.id === id),
    className,
    number: index + 1,
    image: sceneCardImages[id],
    lessonTitle: lesson.title,
    lessonBody: lesson.body,
    lessonCue: lesson.cue,
    sources: lesson.sources,
  };
});

document.querySelector("#root").innerHTML = `
  <main class="missionShell">
    <section class="stageFrame" id="stageFrame" aria-label="${ui.sceneLabel}">
      <div id="game" aria-label="${ui.gameLabel}"></div>
      <header class="missionHeader">
        <h1>${ui.title}</h1>
      </header>
      <div class="topTools" aria-label="${ui.sceneTools}">
        <button class="roundButton" type="button" id="infoButton" aria-label="${ui.missionInformation}" title="${ui.missionInformation}">i</button>
        <button class="languageButton" type="button" id="languageButton" aria-label="${ui.languageOptions[i18n.locale]}" title="${ui.languageOptions[i18n.locale]}" data-locale="${i18n.locale}"><img src="/assets/lang-${i18n.locale}.png" alt=""></button>
        <label class="roundSelect" title="${ui.cameraView}"><span>${ui.cameraView}</span><select id="viewSelect" aria-label="${ui.cameraView}"><option value="cinematic" selected>${ui.cameraViews.cinematic}</option><option value="alma">${ui.cameraViews.alma}</option></select></label>
        <button class="almaExitButton" type="button" id="almaExitButton" aria-label="${ui.returnToCinematic}" title="${ui.returnToCinematic}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.2 4.8 9.9l4.7 4.7 1.4-1.4-2.3-2.3h5.6c2.6 0 4.8 2.1 4.8 4.8v1.1h2v-1.1c0-3.7-3-6.8-6.8-6.8H8.6l2.3-2.3-1.4-1.4Z" /></svg>
        </button>
        <button class="roundButton fullscreenButton" type="button" id="fullscreenButton" aria-label="${ui.enterFullscreen}" title="${ui.fullscreen}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5h2V5h3V3Zm8 0v2h3v3h2V3h-5ZM5 16H3v5h5v-2H5v-3Zm14 3h-3v2h5v-5h-2v3Z" /></svg>
        </button>
      </div>
      <aside class="chilePanel" id="chilePanel" aria-label="${copy.chile.title}">
        <div class="chilePanelHeader">
          <span>${copy.chile.kicker}</span>
          <strong>${copy.chile.title}</strong>
        </div>
        ${chileHighlights
          .map(
            (item) => `
          <article class="chileItem" data-chile-id="${item.id}">
            <button class="chileMedia" type="button" aria-label="${i18n.t("ui.expandPhoto", { caption: item.image.caption })}">
              <img src="${item.image.src}" alt="${item.image.alt}" loading="lazy" decoding="async">
              <em>${item.image.caption}</em>
            </button>
            <div>
              <strong>${item.title}</strong>
              <p>${item.body}</p>
              <div class="chileLinks">
                ${item.sources.map((source) => `<a href="${source.url}" target="_blank" rel="noreferrer">${source.label}</a>`).join("")}
                ${item.id === "alma" ? `<button type="button" id="almaFocusButton">${copy.chile.focusAlma}</button>` : ""}
              </div>
            </div>
          </article>
        `,
          )
          .join("")}
      </aside>
      <div class="chileImageOverlay" id="chileImageOverlay" aria-hidden="true">
        <button class="chileImageBackdrop" type="button" id="chileImageBackdrop" aria-label="${ui.closePhoto}"></button>
        <figure class="chileImageFigure">
          <img id="chileExpandedImage" alt="">
          <figcaption id="chileExpandedCaption"></figcaption>
        </figure>
      </div>
      <div class="sceneCards" aria-label="${ui.annotations}">
        ${sceneCards
          .map(
            (item) => `
          <article class="sceneCard ${item.className}" data-card-id="${item.id}" aria-label="${item.label}">
            <button class="sceneCardMedia" type="button" aria-label="${i18n.t("ui.expandPhoto", { caption: item.image.caption })}">
              <img src="${item.image.src}" alt="${item.image.alt}" loading="lazy" decoding="async">
              <span>${item.number}</span>
              <em class="sceneCardCaption">${item.image.caption}</em>
            </button>
            <div class="sceneCardCopy">
              <strong>${item.label}</strong>
              <em>${item.day}</em>
              <p>${item.lessonBody}</p>
            </div>
            <div class="sceneCardSources">
              <button class="sceneCardJump" data-jump="${item.id}" type="button">${ui.focusMoment}</button>
              ${item.sources.map((source) => `<a href="${source.url}" target="_blank" rel="noreferrer">${source.label}</a>`).join("")}
            </div>
            <span class="sceneCardResizeHandle" aria-hidden="true"></span>
          </article>
        `,
          )
          .join("")}
      </div>
      <aside class="observationPanel" id="observationPanel" aria-label="${ui.observationNote}">
        <div class="observationHeader">
          <h2>${ui.observationNote}</h2>
          <button class="collapseButton" type="button" id="noteCollapseButton" aria-label="${ui.collapseObservationNote}" title="${ui.collapseNote}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10h10v4H7v-4Z" /></svg>
          </button>
        </div>
        <article>
          <span id="noteNumber">1</span>
          <div><strong id="noteTitle"></strong><p id="noteBody"></p></div>
        </article>
      </aside>
      <div class="missionConsole" aria-label="${ui.playbackControls}">
        <button class="playButton" type="button" id="playButton" aria-label="${ui.pause}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path id="playIcon" d="M8 5v14l11-7L8 5Z" /></svg>
        </button>
        <div class="metReadout"><span>${ui.met}</span><strong id="metTime">01:12:43:18</strong><em id="activeDay">${i18n.t("ui.time.day", { day: 1 })}</em></div>
        <div class="timelineRail">
          <input class="scrubber" id="scrubber" type="range" min="0" max="${DURATION}" step="0.1" aria-label="${ui.timeline}" />
          <div class="timelineMarkers" id="timelineMarkers"></div>
        </div>
        <div class="nextMoment">
          <span>${ui.nextKeyMoment}</span>
          <strong id="nextMomentLabel"></strong>
          <em id="nextMomentEta"></em>
          <button type="button" id="nextButton" aria-label="${ui.nextKeyMomentAria}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h3v14H5V5Zm5 0 9 7-9 7V5Z" /></svg>
          </button>
        </div>
        <button class="followButton" type="button" id="followButton" aria-label="${ui.followOrion}"><span></span>${ui.followOrion}</button>
      </div>
      <div class="utilityControls">
        <button type="button" id="prevButton">${ui.prev}</button>
        <button type="button" id="restartButton">${ui.restart}</button>
        <label>${ui.speed}<select id="speedSelect" aria-label="${ui.speed}"><option value="0.6">0.6x</option><option value="1" selected>1x</option><option value="1.6">1.6x</option><option value="2.4">2.4x</option></select></label>
      </div>
    </section>
  </main>
`;

const dom = Object.fromEntries(
  [
    "activeDay",
    "metTime",
    "nextMomentLabel",
    "nextMomentEta",
    "noteNumber",
    "noteTitle",
    "noteBody",
    "noteCollapseButton",
    "observationPanel",
    "scrubber",
    "playButton",
    "playIcon",
    "infoButton",
    "chilePanel",
    "almaFocusButton",
    "chileImageOverlay",
    "chileImageBackdrop",
    "chileExpandedImage",
    "chileExpandedCaption",
    "almaExitButton",
    "restartButton",
    "prevButton",
    "nextButton",
    "speedSelect",
    "viewSelect",
    "followButton",
    "fullscreenButton",
    "timelineMarkers",
  ].map((id) => [id, document.querySelector(`#${id}`)]),
);

const savedView = localStorage.getItem("artemis-three-view");
const initialView = ["cinematic", "alma"].includes(savedView)
  ? savedView
  : "cinematic";
if (savedView !== initialView) {
  localStorage.setItem("artemis-three-view", initialView);
}

const state = {
  time: clamp(
    Number(localStorage.getItem("artemis-three-time") || 42),
    0,
    DURATION,
  ),
  playing: localStorage.getItem("artemis-three-playing") !== "false",
  speed: 1,
  view: initialView,
  notesCollapsed: localStorage.getItem(NOTE_COLLAPSE_STORAGE_KEY) !== "false",
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
  "centripetal",
);
const pathPoints = curve.getSpacedPoints(980);

let trail = null;
let composer = null;
let cardDrag = null;
let cardResize = null;
let cardPositions = loadCardPositions();
let cardSizes = loadCardSizes();
let expandedCardId = null;
let expandedChileId = null;
const markerRefs = [];
const sceneCardRefs = [];

dom.timelineMarkers.innerHTML = milestones
  .slice(0, -1)
  .map((item, index) => {
    const shortDay = item.day.replace(ui.timelineFlightPrefix, "");
    return `<button class="marker" data-jump="${item.id}" style="left:${item.t}%" type="button" aria-label="${i18n.t("ui.jumpTo", { label: item.label })}"><span>${index + 1}</span><strong>${item.label}</strong><em>${shortDay}</em></button>`;
  })
  .join("");
document.querySelectorAll("[data-jump]").forEach((button) => {
  const item = milestones.find(
    (milestone) => milestone.id === button.dataset.jump,
  );
  button.addEventListener("click", () => jumpTo(item.t, item.id));
});
document.querySelectorAll(".sceneCard").forEach((element) => {
  const item = milestones.find(
    (milestone) => milestone.id === element.dataset.cardId,
  );
  if (item) {
    sceneCardRefs.push({ element, item });
    setupSceneCardDrag(element, item);
    setupSceneCardResize(element, item);
    element
      .querySelector(".sceneCardMedia")
      ?.addEventListener("click", () => toggleSceneCardImage(element, item));
  }
});
document.querySelectorAll(".chileItem").forEach((element) => {
  const item = chileHighlights.find(
    (highlight) => highlight.id === element.dataset.chileId,
  );
  element
    .querySelector(".chileMedia")
    ?.addEventListener("click", () => toggleChileImage(element, item));
});
document.querySelector("#languageButton")?.addEventListener("click", () => {
  const nextLocale = i18n.locale === "en" ? "es" : "en";
  localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
  window.location.reload();
});
dom.infoButton.addEventListener("click", () => {
  dom.chilePanel.classList.toggle("visible");
});
dom.almaFocusButton?.addEventListener("click", () => {
  state.view = "alma";
  dom.chilePanel.classList.remove("visible");
  closeExpandedChileImage();
  localStorage.setItem("artemis-three-view", state.view);
  updateDom();
});
dom.almaExitButton.addEventListener("click", () => {
  state.view = "cinematic";
  localStorage.setItem("artemis-three-view", state.view);
  updateDom();
});
dom.chileImageBackdrop.addEventListener("click", closeExpandedChileImage);
dom.scrubber.addEventListener("input", (event) =>
  setTime(Number(event.target.value), true),
);
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
  updateDom();
});
dom.followButton.addEventListener("click", () => {
  state.view = "cinematic";
  localStorage.setItem("artemis-three-view", state.view);
  updateDom();
});
dom.noteCollapseButton.addEventListener("click", () => {
  state.notesCollapsed = !state.notesCollapsed;
  localStorage.setItem(NOTE_COLLAPSE_STORAGE_KEY, String(state.notesCollapsed));
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
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeExpandedSceneCard();
    closeExpandedChileImage();
  }
});
document.addEventListener("pointerdown", (event) => {
  if (expandedCardId && !event.target.closest(".sceneCard.expanded")) {
    closeExpandedSceneCard();
  }
  if (
    expandedChileId &&
    !event.target.closest(".chileImageFigure") &&
    !event.target.closest(".chileMedia")
  ) {
    closeExpandedChileImage();
  }
});

const mount = document.querySelector("#game");
const stageFrame = document.querySelector("#stageFrame");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050814);
scene.fog = new THREE.Fog(0x050814, 11, 28);

const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 16 / 9, 0.1, 100);
camera.position.set(0.05, 1.28, 7.85).multiplyScalar(CAMERA_ZOOM_OUT);
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
const bloom = new UnrealBloomPass(
  new THREE.Vector2(mount.clientWidth, mount.clientHeight),
  0.24,
  0.42,
  0.68,
);
composer.addPass(bloom);

let previous = performance.now();
renderer.setAnimationLoop((now) => {
  const delta = (now - previous) / 1000;
  previous = now;
  if (state.playing) {
    state.time = advancePlaybackTime(state.time, delta * state.speed);
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
      new THREE.PointsMaterial({
        size: 0.035,
        transparent: true,
        opacity: 0.86,
        vertexColors: true,
      }),
    ),
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
    }),
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
    new THREE.MeshStandardMaterial({
      map: earthMap,
      emissiveMap: earthMap,
      emissive: 0x17304a,
      emissiveIntensity: 0.18,
      roughness: 0.62,
      metalness: 0.02,
    }),
  );
  earth.position.copy(EARTH);
  earth.rotation.y = -0.72;
  addAlmaMarker(earth);
  scene.add(earth);

  const cloudShell = new THREE.Mesh(
    new THREE.SphereGeometry(1.21, 96, 96),
    new THREE.MeshStandardMaterial({
      map: createCloudTexture(),
      transparent: true,
      opacity: 0.18,
      roughness: 0.9,
      depthWrite: false,
    }),
  );
  cloudShell.position.copy(EARTH);
  scene.add(cloudShell);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.34, 96, 96),
    new THREE.MeshBasicMaterial({
      color: 0x68b7ff,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    }),
  );
  atmosphere.position.copy(EARTH);
  scene.add(atmosphere);

  const earthGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createRadialTexture("#74caff", "#1b79d8"),
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
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
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 96, 96),
    new THREE.MeshStandardMaterial({
      map: moonTexture,
      bumpMap: moonTexture,
      bumpScale: 0.045,
      roughness: 0.94,
    }),
  );
  moon.add(sphere);
  moon.position.copy(MOON);
  moon.userData.fallback = sphere;
  return moon;
}

function addAlmaMarker(earth) {
  const marker = new THREE.Group();
  const surface = latLonToSphere(-23.0232, -67.7546, 1.206);
  marker.position.copy(surface);
  marker.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    surface.clone().normalize(),
  );

  const pinMaterial = new THREE.MeshBasicMaterial({
    color: 0xf0c361,
    transparent: true,
    opacity: 0.94,
    depthWrite: false,
  });
  const pin = new THREE.Mesh(new THREE.SphereGeometry(0.026, 18, 18), pinMaterial);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.054, 0.006, 8, 32),
    new THREE.MeshBasicMaterial({
      color: 0x83d8ff,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    }),
  );
  ring.rotation.x = Math.PI / 2;

  marker.add(ring, pin);
  earth.add(marker);
  scene.userData.almaMarker = marker;
}

function latLonToSphere(latDegrees, lonDegrees, radius) {
  const lat = THREE.MathUtils.degToRad(latDegrees);
  const lon = THREE.MathUtils.degToRad(lonDegrees);
  const cosLat = Math.cos(lat);
  // SphereGeometry's equirectangular UVs place longitude on the X/Z circle:
  // 0 degrees is +X, and western longitudes move toward +Z.
  return new THREE.Vector3(
    radius * cosLat * Math.cos(lon),
    radius * Math.sin(lat),
    -radius * cosLat * Math.sin(lon),
  );
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
    },
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
  const material = new THREE.LineBasicMaterial({
    color: 0x31526d,
    transparent: true,
    opacity: 0.16,
  });
  for (let x = -5; x <= 6; x += 1) {
    grid.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x, -1.85, -2.35),
          new THREE.Vector3(x, -1.85, 2.35),
        ]),
        material,
      ),
    );
  }
  for (let z = -2; z <= 2; z += 1) {
    grid.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-5.4, -1.85, z),
          new THREE.Vector3(6.35, -1.85, z),
        ]),
        material,
      ),
    );
  }
  scene.add(grid);

  const dropMaterial = new THREE.LineBasicMaterial({
    color: 0xf6c453,
    transparent: true,
    opacity: 0.16,
  });
  milestones.slice(1, -1).forEach((item) => {
    const point = pointAt(item.t / DURATION);
    scene.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          point,
          new THREE.Vector3(point.x, -1.85, point.z),
        ]),
        dropMaterial,
      ),
    );
  });
}

function createTrajectory() {
  scene.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(curve, 900, 0.0075, 8, false),
      new THREE.MeshBasicMaterial({
        color: 0x5fd8d4,
        transparent: true,
        opacity: 0.34,
      }),
    ),
  );
  scene.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(curve, 900, 0.0024, 6, false),
      new THREE.MeshBasicMaterial({
        color: 0xdfffff,
        transparent: true,
        opacity: 0.56,
      }),
    ),
  );
  addDirectionChevrons();
}

function createMarkers() {
  const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xf6c453 });
  const flybyMaterial = new THREE.MeshBasicMaterial({ color: 0xff805d });
  const markerGlowTexture = createRadialTexture("#fff0b3", "#f6c453");
  milestones.forEach((item) => {
    const marker = new THREE.Group();
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.027, 16, 16),
      item.id === "flyby" ? flybyMaterial : markerMaterial,
    );
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: markerGlowTexture,
        transparent: true,
        opacity: item.id === "flyby" ? 0.38 : 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.set(0.14, 0.14, 1);
    marker.add(glow, dot);
    marker.position.copy(pointAt(item.t / DURATION));
    markerRefs.push({ id: item.id, mesh: marker, glow });
    scene.add(marker);
  });
}

function createOrion() {
  const root = new THREE.Group();
  root.scale.setScalar(ORION_WORLD_SCALE);
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
  const plumeMat = new THREE.MeshBasicMaterial({
    color: 0x73d9ff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const plasmaMat = new THREE.MeshBasicMaterial({
    color: 0xff8a3d,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const capsule = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.28, 0.42, 72, 1, false),
    capsuleMat,
  );
  capsule.rotation.x = Math.PI / 2;
  capsule.position.z = 0.16;
  root.add(capsule);

  const heat = new THREE.Mesh(
    new THREE.CylinderGeometry(0.29, 0.29, 0.056, 72),
    heatMat,
  );
  heat.rotation.x = Math.PI / 2;
  heat.position.z = -0.08;
  root.add(heat);

  const adapter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.23, 0.21, 0.1, 64),
    whiteMat,
  );
  adapter.rotation.x = Math.PI / 2;
  adapter.position.z = -0.17;
  root.add(adapter);

  const service = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.48, 72),
    serviceMat,
  );
  service.rotation.x = Math.PI / 2;
  service.position.z = -0.46;
  root.add(service);

  const serviceBand = new THREE.Mesh(
    new THREE.TorusGeometry(0.225, 0.011, 10, 64),
    frameMat,
  );
  serviceBand.position.z = -0.23;
  root.add(serviceBand);

  const aftBand = new THREE.Mesh(
    new THREE.TorusGeometry(0.225, 0.012, 10, 64),
    frameMat,
  );
  aftBand.position.z = -0.7;
  root.add(aftBand);

  const engine = new THREE.Mesh(
    new THREE.ConeGeometry(0.13, 0.24, 40, 1, true),
    darkMat,
  );
  engine.rotation.x = -Math.PI / 2;
  engine.position.z = -0.82;
  root.add(engine);

  const engineLip = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.011, 10, 48),
    goldMat,
  );
  engineLip.position.z = -0.93;
  root.add(engineLip);

  const docking = new THREE.Mesh(
    new THREE.TorusGeometry(0.092, 0.012, 12, 56),
    frameMat,
  );
  docking.position.z = 0.43;
  root.add(docking);

  [-0.085, 0.085].forEach((x) => {
    const window = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.016, 0.045),
      windowMat,
    );
    window.position.set(x, 0.235, 0.14);
    window.rotation.x = 0.55;
    root.add(window);
  });

  [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((angle) => {
    addServiceDetail(root, angle, darkMat, goldMat, frameMat);
  });

  [-1, 1].forEach((side) => {
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.34, 10),
      frameMat,
    );
    antenna.rotation.z = side * 0.58;
    antenna.position.set(side * 0.24, 0.02, -0.08);
    root.add(antenna);

    const thruster = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.05, 16),
      darkMat,
    );
    thruster.rotation.x = Math.PI / 2;
    thruster.position.set(side * 0.22, -0.1, -0.62);
    root.add(thruster);
  });

  [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((angle) => {
    addSolarWing(root, angle, panelMat, frameMat, goldMat);
  });

  const plume = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.72, 36, 1, true),
    plumeMat,
  );
  plume.rotation.x = -Math.PI / 2;
  plume.position.z = -1.08;
  root.add(plume);

  const plasma = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 32, 18),
    plasmaMat,
  );
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
    capsuleMat: new THREE.MeshPhysicalMaterial({
      map: atlasTexture(0, 0, 610, 610),
      color: 0xf5f6f2,
      metalness: 0.22,
      roughness: 0.46,
      clearcoat: 0.22,
    }),
    heatMat: new THREE.MeshStandardMaterial({
      map: atlasTexture(627, 0, 627, 610),
      color: 0xb28460,
      roughness: 0.72,
      metalness: 0.08,
    }),
    serviceMat: new THREE.MeshStandardMaterial({
      map: atlasTexture(627, 610, 627, 644),
      color: 0xbec3c5,
      roughness: 0.36,
      metalness: 0.62,
    }),
    panelMat: new THREE.MeshStandardMaterial({
      map: atlasTexture(0, 815, 610, 390),
      color: 0x224fa7,
      emissive: 0x071f55,
      emissiveIntensity: 0.18,
      roughness: 0.2,
      metalness: 0.18,
    }),
    frameMat: new THREE.MeshStandardMaterial({
      map: atlasTexture(627, 610, 627, 644),
      color: 0xd8e0e5,
      metalness: 0.58,
      roughness: 0.28,
    }),
    darkMat: new THREE.MeshStandardMaterial({
      map: atlasTexture(0, 610, 610, 205),
      color: 0x25282b,
      metalness: 0.82,
      roughness: 0.22,
    }),
    windowMat: new THREE.MeshPhysicalMaterial({
      map: atlasTexture(0, 610, 610, 205),
      color: 0x05070b,
      emissive: 0x174c8a,
      emissiveIntensity: 0.1,
      roughness: 0.08,
      clearcoat: 0.85,
    }),
    goldMat: new THREE.MeshStandardMaterial({
      color: 0xc39846,
      metalness: 0.82,
      roughness: 0.28,
    }),
    whiteMat: new THREE.MeshStandardMaterial({
      map: atlasTexture(0, 0, 610, 610),
      color: 0xf3f4ee,
      roughness: 0.52,
      metalness: 0.2,
    }),
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
  const radiator = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.012, 0.25),
    darkMat,
  );
  radiator.position
    .copy(radial.clone().multiplyScalar(0.225))
    .add(new THREE.Vector3(0, 0, -0.47));
  radiator.rotation.z = tangentAngle;
  root.add(radiator);

  [-0.08, 0.08].forEach((offset) => {
    const thruster = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.026, 0.06, 16),
      goldMat,
    );
    thruster.position
      .copy(radial.clone().multiplyScalar(0.24))
      .add(new THREE.Vector3(0, 0, -0.5 + offset));
    thruster.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), radial);
    root.add(thruster);
  });

  const latch = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.018, 0.04),
    frameMat,
  );
  latch.position
    .copy(radial.clone().multiplyScalar(0.235))
    .add(new THREE.Vector3(0, 0, -0.25));
  latch.rotation.z = tangentAngle;
  root.add(latch);
}

function addSolarWing(root, angle, panelMat, frameMat, goldMat) {
  const group = new THREE.Group();
  const radial = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
  const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1, 0.11), goldMat);
  hinge.position
    .copy(radial.clone().multiplyScalar(0.28))
    .add(new THREE.Vector3(0, 0, -0.42));
  hinge.rotation.z = angle;
  group.add(hinge);

  const boom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.01, 0.42, 10),
    frameMat,
  );
  boom.position
    .copy(radial.clone().multiplyScalar(0.48))
    .add(new THREE.Vector3(0, 0, -0.42));
  boom.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), radial);
  group.add(boom);

  for (let segment = 0; segment < 2; segment += 1) {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.54, 0.03, 0.25),
      panelMat,
    );
    panel.position
      .copy(radial.clone().multiplyScalar(0.72 + segment * 0.5))
      .add(new THREE.Vector3(0, 0, -0.42));
    panel.rotation.z = angle;
    group.add(panel);
  }

  for (let i = 0; i <= 4; i += 1) {
    const rib = new THREE.Mesh(
      new THREE.BoxGeometry(0.008, 0.038, 0.28),
      frameMat,
    );
    rib.position
      .copy(radial.clone().multiplyScalar(0.47 + i * 0.24))
      .add(new THREE.Vector3(0, 0, -0.42));
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
  const gravityTarget =
    progress < 0.64 ? EARTH : progress < 0.74 ? MOON : EARTH;
  const radial = point.clone().sub(gravityTarget).normalize();
  const side = new THREE.Vector3().crossVectors(radial, tangent).normalize();
  const up = new THREE.Vector3().crossVectors(tangent, side).normalize();
  const matrix = new THREE.Matrix4().makeBasis(side, up, tangent);
  const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(matrix);
  targetQuaternion.multiply(
    new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      Math.sin(progress * Math.PI * 5.2) * 0.28,
    ),
  );
  orion.position.copy(point);
  orion.quaternion.slerp(targetQuaternion, 0.24);

  const burn = enginePulse(state.time);
  orion.userData.plume.visible = burn > 0.02;
  orion.userData.plumeMat.opacity = 0.1 + burn * 0.56;
  orion.userData.plume.scale.set(
    0.72 + burn * 0.65,
    0.72 + burn * 0.65,
    0.86 + burn * 1.1,
  );
  orion.userData.engineGlow.intensity = 0.75 + burn * 2.3;
  const entry = enginePulse(state.time, [90], 5.4);
  orion.userData.plasma.visible = entry > 0.02;
  orion.userData.plasmaMat.opacity = entry * 0.34;
  orion.userData.plasma.scale.set(
    1 + entry * 0.4,
    0.82 + entry * 0.2,
    1.45 + entry * 0.52,
  );

  if (trail) {
    trail.geometry.dispose();
    scene.remove(trail);
  }
  trail = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(
      pathPoints.slice(
        0,
        Math.max(2, Math.floor(pathPoints.length * progress)),
      ),
    ),
    new THREE.LineBasicMaterial({
      color: 0xf6c453,
      transparent: true,
      opacity: 0.46,
    }),
  );
  scene.add(trail);

  const active = milestones[activeIndex()];
  markerRefs.forEach((marker) => {
    const activeScale = marker.id === active.id ? 1.22 : 0.82;
    marker.mesh.scale.setScalar(activeScale);
    marker.glow.material.opacity = marker.id === active.id ? 0.42 : 0.18;
  });
  scene.userData.earth.rotation.y += 0.0022;
  scene.userData.cloudShell.rotation.y += 0.003;
  scene.userData.atmosphere.rotation.y += 0.0013;
  scene.userData.moon.rotation.y += 0.001;
  updateCamera(progress, point, tangent);
}

function updateCamera(progress, point, tangent) {
  let target = new THREE.Vector3(0.2, -0.08, 0.15);
  let position = new THREE.Vector3(-1.1, 5.35, 10.6);

  if (state.view === "alma") {
    const shot = almaMarkerShot();
    target = shot.target;
    position = shot.position;
  } else {
    const shot = cinematicShot(
      milestones[activeIndex()].id,
      progress,
      point,
      tangent,
    );
    target = shot.target;
    position = shot.position;
  }

  camera.position.lerp(
    zoomedCameraPosition(position, target),
    state.view === "alma" ? 0.14 : 0.04,
  );
  if (state.view === "alma") {
    orbit.target.copy(target);
  } else {
    orbit.target.lerp(target, 0.06);
  }
}

function zoomedCameraPosition(position, target) {
  return target
    .clone()
    .add(position.clone().sub(target).multiplyScalar(CAMERA_ZOOM_OUT));
}

function almaMarkerShot() {
  const marker = scene.userData.almaMarker;
  const target = new THREE.Vector3();
  if (!marker) return { target: EARTH.clone(), position: new THREE.Vector3(-0.8, 2.2, 6.2) };
  marker.getWorldPosition(target);

  const normal = target.clone().sub(EARTH).normalize();
  const up = new THREE.Vector3(0, 1, 0)
    .sub(normal.clone().multiplyScalar(normal.y))
    .normalize();
  const side = new THREE.Vector3().crossVectors(up, normal).normalize();
  return {
    target,
    position: target
      .clone()
      .add(normal.multiplyScalar(3.05))
      .add(up.multiplyScalar(0.56))
      .add(side.multiplyScalar(0.34)),
  };
}

function cinematicShot(id, progress, point, tangent) {
  const drift = new THREE.Vector3(
    Math.sin(progress * Math.PI * 2.1) * 0.08,
    Math.cos(progress * Math.PI * 1.7) * 0.06,
    Math.sin(progress * Math.PI * 1.3) * 0.08,
  );
  const shots = {
    launch: bodyTurnShot(EARTH, 1.18, point, tangent, {
      distance: 4.75,
      back: 0.82,
      lift: 1.45,
      centerWeight: 0.36,
    }),
    orbit: bodyTurnShot(EARTH, 1.18, point, tangent, {
      distance: 5.05,
      back: 0.92,
      lift: 1.52,
      centerWeight: 0.32,
    }),
    tli: tliDepartureShot(progress, point, tangent),
    coast: coastEstablishingShot(progress, point, tangent),
    flyby: lunarFlybyShot(progress, point, tangent),
    return: pathTravelShot(point, tangent, {
      distance: 4.8,
      side: 2.1,
      lift: 1.7,
      lookAhead: 0.62,
      earthContext: 0.08,
    }),
    entry: bodyTurnShot(EARTH, 1.18, point, tangent, {
      distance: 4.3,
      back: 0.74,
      lift: 1.18,
      centerWeight: 0.34,
    }),
    splashdown: bodyTurnShot(EARTH, 1.18, point, tangent, {
      distance: 4.1,
      back: 0.62,
      lift: 1.08,
      centerWeight: 0.36,
    }),
  };
  const shot = shots[id] || shots.coast;
  const forwardBreath = tangent
    .clone()
    .multiplyScalar(0.08 * Math.sin(progress * Math.PI * 3.2));
  return {
    target: shot.target
      .add(drift.clone().multiplyScalar(0.45))
      .add(forwardBreath),
    position: shot.position.add(drift),
  };
}

function tliDepartureShot(progress, point, tangent) {
  const earthSafe = bodyTurnShot(EARTH, 1.18, point, tangent, {
    distance: 5.5,
    back: 1.1,
    lift: 1.55,
    centerWeight: 0.26,
  });
  const travel = pathTravelShot(point, tangent, {
    distance: 4.9,
    side: 1.85,
    lift: 1.58,
    lookAhead: 0.74,
    earthContext: 0.1,
  });
  const release = smoothstep(0.3, 0.42, progress);
  return blendShot(earthSafe, travel, release);
}

function coastEstablishingShot(progress, point, tangent) {
  const travel = pathTravelShot(point, tangent, {
    distance: 4.9,
    side: 1.85,
    lift: 1.58,
    lookAhead: 0.74,
    earthContext: 0.1,
  });
  const wide = {
    target: EARTH.clone()
      .lerp(MOON, 0.46)
      .lerp(point, 0.38)
      .add(new THREE.Vector3(-0.1, 0.22, 0.08)),
    position: EARTH.clone()
      .lerp(MOON, 0.44)
      .add(new THREE.Vector3(-2.55, 2.52, 6.75)),
  };
  const approach = lunarApproachShot(progress, point, tangent);
  const establish = smoothstep(0.42, 0.5, progress);
  const approachMove = smoothstep(0.51, 0.58, progress);
  return blendShot(blendShot(travel, wide, establish), approach, approachMove);
}

function lunarApproachShot(progress, point, tangent) {
  return lunarTurnRailShot(
    progress,
    point,
    tangent,
    { distance: 5.45, back: 1.18, lift: 1.54, centerWeight: 0.16 },
    0.062,
  );
}

function lunarFlybyShot(progress, point, tangent) {
  const approach = lunarApproachShot(progress, point, tangent);
  const safeMoon = lunarTurnRailShot(
    progress,
    point,
    tangent,
    { distance: 4.15, back: 0.92, lift: 1.24, centerWeight: 0.22 },
    0.044,
  );
  const travel = pathTravelShot(point, tangent, {
    distance: 4.9,
    side: 2.2,
    lift: 1.62,
    lookAhead: 0.7,
    earthContext: 0.04,
  });
  const enter = smoothstep(0.58, 0.65, progress);
  const exit = smoothstep(0.64, 0.72, progress);
  return blendShot(blendShot(approach, safeMoon, enter), travel, exit);
}

function lunarTurnRailShot(progress, point, tangent, options, leadMax) {
  const leadIn = smoothstep(0.49, 0.58, progress);
  const leadOut = 1 - smoothstep(0.66, 0.74, progress);
  const railProgress = progress + leadMax * leadIn * leadOut;
  const railPoint = pointAt(railProgress);
  const railTangent = tangentAt(railProgress);
  const railShot = bodyTurnShot(MOON, 0.52, railPoint, railTangent, options);
  const currentTarget = point
    .clone()
    .add(tangent.clone().multiplyScalar(0.34))
    .lerp(MOON, options.centerWeight ?? 0.18);
  return {
    target: railShot.target.clone().lerp(currentTarget, 0.38),
    position: railShot.position,
  };
}

function tangentAt(progress) {
  const before = pointAt(progress - 0.004);
  const after = pointAt(progress + 0.004);
  return after.sub(before).normalize();
}

function pathTravelShot(point, tangent, options = {}) {
  const side = new THREE.Vector3().crossVectors(
    tangent,
    new THREE.Vector3(0, 1, 0),
  );
  if (side.lengthSq() < 0.001) side.set(1, 0, 0);
  side.normalize();
  const lift = options.lift ?? 1.5;
  const distance = options.distance ?? 4.4;
  const sideDistance = options.side ?? 1.8;
  const lookAhead = options.lookAhead ?? 0.5;
  const earthContext = options.earthContext ?? 0;
  const target = point
    .clone()
    .add(tangent.clone().multiplyScalar(lookAhead))
    .lerp(EARTH, earthContext)
    .add(new THREE.Vector3(0, 0.08, 0));
  const position = point
    .clone()
    .add(tangent.clone().multiplyScalar(-distance))
    .add(side.multiplyScalar(sideDistance))
    .add(new THREE.Vector3(0, lift, 0));
  return { target, position };
}

function blendShot(a, b, amount) {
  const t = smoothstep(0, 1, amount);
  return {
    target: a.target.clone().lerp(b.target, t),
    position: a.position.clone().lerp(b.position, t),
  };
}

function bodyTurnShot(center, radius, point, tangent, options) {
  const radial = point.clone().sub(center);
  if (radial.lengthSq() < 0.001) radial.set(1, 0, 0);
  radial.normalize();
  const turnNormal = new THREE.Vector3()
    .crossVectors(radial, tangent)
    .normalize();
  if (turnNormal.lengthSq() < 0.001) turnNormal.set(0, 1, 0);
  if (turnNormal.y < 0) turnNormal.multiplyScalar(-1);
  const distance = options.distance ?? 4.5;
  const back = options.back ?? 0.8;
  const lift = options.lift ?? 1.25;
  const centerWeight = options.centerWeight ?? 0.3;
  const position = center
    .clone()
    .add(radial.clone().multiplyScalar(radius + distance))
    .add(tangent.clone().multiplyScalar(-back))
    .add(turnNormal.multiplyScalar(lift));
  const target = point
    .clone()
    .lerp(center, centerWeight)
    .add(tangent.clone().multiplyScalar(0.16));
  return keepShipInFrontOfBody({ center, radius, point, target, position });
}

function keepShipInFrontOfBody({ center, radius, point, target, position }) {
  const toShip = point.clone().sub(center);
  const toCamera = position.clone().sub(center);
  if (toShip.lengthSq() < 0.001 || toCamera.lengthSq() < 0.001)
    return { target, position };
  const sameHemisphere = toShip.normalize().dot(toCamera.normalize());
  if (sameHemisphere < 0.18) {
    const correction = point
      .clone()
      .sub(center)
      .normalize()
      .multiplyScalar(radius + 4.8);
    position
      .copy(center)
      .add(correction)
      .add(new THREE.Vector3(0, 1.25, 0));
  }
  return { target, position };
}

function cinematicFollowShot(id, progress, point, tangent, safeSide) {
  if (
    id === "launch" ||
    id === "orbit" ||
    id === "tli" ||
    id === "entry" ||
    id === "splashdown"
  ) {
    const composed = cinematicShot(id, progress, point, tangent);
    const safe = bodyTurnShot(EARTH, 1.18, point, tangent, {
      distance: 3.9,
      back: 0.66,
      lift: 1.34,
      centerWeight: 0.22,
    });
    return {
      target: composed.target.clone().lerp(safe.target, 0.68),
      position: composed.position.clone().lerp(safe.position, 0.72),
    };
  }
  if (id === "flyby") {
    const composed = cinematicShot(id, progress, point, tangent);
    const approach = lunarApproachShot(progress, point, tangent);
    const safe = lunarTurnRailShot(
      progress,
      point,
      tangent,
      { distance: 3.65, back: 0.72, lift: 1.12, centerWeight: 0.18 },
      0.04,
    );
    const travel = pathTravelShot(point, tangent, {
      distance: 4.35,
      side: 1.9,
      lift: 1.62,
      lookAhead: 0.72,
      earthContext: 0.04,
    });
    const enter = smoothstep(0.58, 0.65, progress);
    const exit = smoothstep(0.64, 0.72, progress);
    const release = blendShot(blendShot(approach, safe, enter), travel, exit);
    return {
      target: composed.target.clone().lerp(release.target, 0.72),
      position: composed.position.clone().lerp(release.position, 0.76),
    };
  }
  if (id === "return") {
    const composed = cinematicShot(id, progress, point, tangent);
    const travel = pathTravelShot(point, tangent, {
      distance: 4.35,
      side: 1.95,
      lift: 1.64,
      lookAhead: 0.66,
      earthContext: 0.06,
    });
    return {
      target: composed.target.clone().lerp(travel.target, 0.68),
      position: composed.position.clone().lerp(travel.position, 0.72),
    };
  }
  const systemAnchor =
    id === "coast"
      ? EARTH.clone().lerp(MOON, 0.5)
      : EARTH.clone().lerp(point, id === "return" ? 0.42 : 0.28);
  const composed = cinematicShot(id, progress, point, tangent);
  const chaseTarget = point
    .clone()
    .add(tangent.clone().multiplyScalar(0.42))
    .lerp(systemAnchor, 0.28);
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
  return centers.reduce(
    (peak, center) =>
      Math.max(peak, Math.exp(-((time - center) ** 2) / (width * width))),
    0,
  );
}

function addDirectionChevrons() {
  const material = new THREE.MeshBasicMaterial({
    color: 0xf6c453,
    transparent: true,
    opacity: 0.42,
  });
  [0.18, 0.34, 0.5, 0.68, 0.84].forEach((t) => {
    const point = pointAt(t);
    const tangent = pointAt(Math.min(1, t + 0.01))
      .sub(pointAt(Math.max(0, t - 0.01)))
      .normalize();
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.028, 0.095, 16),
      material,
    );
    cone.position.copy(point);
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
    scene.add(cone);
  });
}

function addRing(center, radius, normal, color, opacity) {
  const n = normal.clone().normalize();
  const a =
    Math.abs(n.dot(new THREE.Vector3(0, 1, 0))) > 0.9
      ? new THREE.Vector3(1, 0, 0)
      : new THREE.Vector3(0, 1, 0);
  const u = new THREE.Vector3().crossVectors(n, a).normalize();
  const v = new THREE.Vector3().crossVectors(n, u).normalize();
  const points = [];
  for (let i = 0; i <= 160; i += 1) {
    const angle = (i / 160) * Math.PI * 2;
    points.push(
      center
        .clone()
        .add(u.clone().multiplyScalar(Math.cos(angle) * radius))
        .add(v.clone().multiplyScalar(Math.sin(angle) * radius)),
    );
  }
  scene.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
    ),
  );
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
      ctx.ellipse(
        x,
        y,
        70 + (i % 5) * 18,
        9 + (i % 3) * 5,
        (i % 9) * 0.3,
        0,
        Math.PI * 2,
      );
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
    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      4,
      width / 2,
      height / 2,
      width / 2,
    );
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
  if (camera.aspect < 1.2 && camera.position.length() < 13)
    camera.position.set(0, 5.7, 14.4);
  const expanded = document.querySelector(".sceneCard.expanded");
  if (expanded) sizeExpandedSceneCard(expanded);
}

async function toggleFullscreen() {
  try {
    if (!fullscreenElement()) {
      await (stageFrame.requestFullscreen?.() ||
        stageFrame.webkitRequestFullscreen?.());
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
  dom.fullscreenButton.setAttribute(
    "aria-label",
    fullscreen ? ui.exitFullscreen : ui.enterFullscreen,
  );
  dom.fullscreenButton.title = fullscreen ? ui.exitFullscreen : ui.fullscreen;
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
  return milestoneIndexForTime(state.time);
}

function milestoneIndexForTime(time) {
  return milestones.reduce(
    (best, item, index) => (time >= item.t ? index : best),
    0,
  );
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
  const next =
    milestones.find((item) => item.t > state.time) ||
    milestones[milestones.length - 1];
  const eta = secondsToNextMilestone(state.time) / Math.max(state.speed, 0.01);
  dom.activeDay.textContent = missionDayLabel(state.time);
  dom.metTime.textContent = metFromTime(state.time);
  dom.nextMomentLabel.textContent = next.label;
  dom.nextMomentEta.textContent =
    eta === 0
      ? ui.time.now
      : i18n.t("ui.time.in", { eta: formatPlaybackEta(eta) });
  dom.noteNumber.textContent = String(activeIndex() + 1);
  dom.noteTitle.textContent = activeNote[0];
  dom.noteBody.textContent = activeNote[1];
  dom.scrubber.value = String(state.time);
  dom.playButton.setAttribute("aria-label", state.playing ? ui.pause : ui.play);
  dom.playIcon.setAttribute(
    "d",
    state.playing ? "M7 5h4v14H7V5Zm6 0h4v14h-4V5Z" : "M8 5v14l11-7L8 5Z",
  );
  dom.viewSelect.value = state.view;
  dom.followButton.classList.toggle("active", state.view === "cinematic");
  dom.almaExitButton.classList.toggle("visible", state.view === "alma");
  if (state.view !== "cinematic") expandedCardId = null;
  dom.observationPanel.classList.toggle("collapsed", state.notesCollapsed);
  dom.noteCollapseButton.setAttribute(
    "aria-label",
    state.notesCollapsed
      ? ui.expandObservationNote
      : ui.collapseObservationNote,
  );
  dom.noteCollapseButton.title = state.notesCollapsed
    ? ui.expandNote
    : ui.collapseNote;
  document.querySelectorAll("[data-jump]").forEach((button) => {
    const item = milestones.find(
      (milestone) => milestone.id === button.dataset.jump,
    );
    const isActive = button.dataset.jump === active.id;
    button.classList.toggle("active", isActive);
  });
  sceneCardRefs.forEach(({ element, item }) => {
    const isActive = item.id === active.id;
    const visibility = sceneCardVisibility(item, active.id);
    if (expandedCardId && expandedCardId !== active.id) expandedCardId = null;
    element.classList.toggle("active", isActive);
    element.classList.toggle("visible", visibility.visible);
    element.classList.toggle("expanded", expandedCardId === item.id);
    element.style.setProperty("--card-delay", `${visibility.delay}ms`);
  });
  dom.chileImageOverlay.classList.toggle("visible", Boolean(expandedChileId));
  dom.chileImageOverlay.setAttribute(
    "aria-hidden",
    expandedChileId ? "false" : "true",
  );
}

function advancePlaybackTime(time, elapsedSeconds) {
  let nextTime = time;
  let remainingSeconds = elapsedSeconds;
  while (remainingSeconds > 0) {
    if (nextTime >= DURATION) return 0;
    const segmentIndex = Math.min(
      milestoneIndexForTime(nextTime),
      milestones.length - 2,
    );
    const segmentEnd = milestones[segmentIndex + 1].t;
    const rate = playbackRateForSegment(segmentIndex);
    const secondsToEnd = Math.max(0, (segmentEnd - nextTime) / rate);
    if (remainingSeconds < secondsToEnd) {
      return nextTime + remainingSeconds * rate;
    }
    remainingSeconds -= secondsToEnd;
    nextTime = segmentEnd;
  }
  return nextTime >= DURATION ? 0 : nextTime;
}

function playbackRateForSegment(segmentIndex) {
  const start = milestones[segmentIndex];
  const end = milestones[segmentIndex + 1];
  const expandedFactor = expandedCardId ? EXPANDED_IMAGE_PLAYBACK_FACTOR : 1;
  return (
    (end.t - start.t) / (playbackSegmentSeconds[start.id] * expandedFactor)
  );
}

function secondsToNextMilestone(time) {
  let seconds = 0;
  let cursor = time;
  while (cursor < DURATION) {
    const segmentIndex = Math.min(
      milestoneIndexForTime(cursor),
      milestones.length - 2,
    );
    const segmentEnd = milestones[segmentIndex + 1].t;
    const rate = playbackRateForSegment(segmentIndex);
    seconds += Math.max(0, (segmentEnd - cursor) / rate);
    return seconds;
  }
  return 0;
}

function formatPlaybackEta(seconds) {
  if (seconds < 1) return ui.time.now;
  if (seconds < 60)
    return i18n.t("ui.time.second", { value: Math.ceil(seconds) });
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.ceil(seconds % 60);
  return remainder
    ? i18n.t("ui.time.minuteSecond", { minutes, seconds: remainder })
    : i18n.t("ui.time.minute", { value: minutes });
}

function sceneCardVisibility(item, activeId) {
  if (!item) return { visible: false, delay: 0 };
  if (state.view !== "cinematic") return { visible: false, delay: 0 };
  const active = item.id === activeId;
  const card = sceneCards.find((candidate) => candidate.id === item.id);
  return { visible: active, delay: card ? 90 : 0 };
}

function updateSceneCardLayout(activeId) {
  const width = stageFrame.clientWidth;
  const height = stageFrame.clientHeight;
  if (!width || !height) return;
  sceneCardRefs.forEach(({ element, item }) => {
    const isActive = state.view === "cinematic" && item.id === activeId;
    if (cardDrag?.element === element || cardResize?.element === element) {
      element.classList.toggle("offscreen", !isActive);
      return;
    }
    applySceneCardSize(element, item.id, width, height);
    const placed =
      expandedCardId === item.id
        ? expandedCardSlot(width, height)
        : resolvedCardSlot(item.id, width, height);
    element.style.setProperty("--card-x", `${placed.x}px`);
    element.style.setProperty("--card-y", `${placed.y}px`);
    element.classList.toggle("offscreen", !isActive);
  });
}

function resolvedCardSlot(id, width, height) {
  const saved = cardPositions[id];
  if (!saved) return defaultCardSlot(id, width, height);
  const bounds = cardPositionBounds(
    width,
    height,
    resolvedCardSize(id, width, height),
  );
  return {
    x: clamp(saved.x * width, bounds.minX, bounds.maxX),
    y: clamp(saved.y * height, bounds.minY, bounds.maxY),
  };
}

function cardPositionBounds(width, height, cardSize = defaultCardSize(width)) {
  const consoleTop = height - 156;
  const headerBottom = 150;
  const cardHalf = cardSize.width / 2 + 19;
  return {
    minX: cardHalf,
    maxX: width - cardHalf,
    minY: headerBottom + 72,
    maxY: consoleTop - 74,
  };
}

function defaultCardSlot(id, width, height) {
  const bounds = cardPositionBounds(
    width,
    height,
    resolvedCardSize(id, width, height),
  );
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
    x: clamp(width * xRatio, bounds.minX, bounds.maxX),
    y: clamp(height * yRatio, bounds.minY, bounds.maxY),
  };
}

function expandedCardSlot(width, height) {
  const bounds = cardPositionBounds(width, height);
  return {
    x: width / 2,
    y: clamp(height * 0.46, bounds.minY, bounds.maxY),
  };
}

function defaultCardSize(width) {
  return {
    width: width <= 1120 ? 330 : 390,
    height: 214,
  };
}

function cardSizeBounds(width, height) {
  return {
    minWidth: width <= 1120 ? 300 : 340,
    maxWidth: Math.max(width <= 1120 ? 300 : 340, width - 44),
    minHeight: 188,
    maxHeight: Math.max(260, height - 190),
  };
}

function resolvedCardSize(id, width, height) {
  const fallback = defaultCardSize(width);
  const saved = cardSizes[id];
  if (!saved) return fallback;
  const bounds = cardSizeBounds(width, height);
  return {
    width: clamp(saved.width * width, bounds.minWidth, bounds.maxWidth),
    height: clamp(saved.height * height, bounds.minHeight, bounds.maxHeight),
  };
}

function applySceneCardSize(element, id, width, height) {
  if (expandedCardId === id) return;
  const size = resolvedCardSize(id, width, height);
  element.style.setProperty("--card-width", `${size.width}px`);
  element.style.setProperty("--card-height", `${size.height}px`);
}

function toggleSceneCardImage(element, item) {
  expandedCardId = expandedCardId === item.id ? null : item.id;
  if (expandedCardId === item.id) {
    sizeExpandedSceneCard(element);
  }
  updateDom();
  updateSceneCardLayout(milestones[activeIndex()].id);
}

function closeExpandedSceneCard() {
  if (!expandedCardId) return;
  expandedCardId = null;
  updateDom();
  updateSceneCardLayout(milestones[activeIndex()].id);
}

function toggleChileImage(element, item) {
  const id = element.dataset.chileId;
  expandedChileId = expandedChileId === id ? null : id;
  if (expandedChileId === id && item) {
    dom.chileExpandedImage.src = item.image.src;
    dom.chileExpandedImage.alt = item.image.alt;
    dom.chileExpandedCaption.textContent = item.image.caption;
  }
  updateDom();
}

function closeExpandedChileImage() {
  if (!expandedChileId) return;
  expandedChileId = null;
  updateDom();
}

function sizeExpandedSceneCard(element) {
  const image = element.querySelector(".sceneCardMedia img");
  const naturalWidth = image?.naturalWidth || 390;
  const naturalHeight = image?.naturalHeight || 260;
  const maxCardWidth = Math.max(320, stageFrame.clientWidth - 44);
  const maxImageHeight = Math.max(220, stageFrame.clientHeight - 260);
  const maxImageWidth = maxCardWidth - 28;
  const scale = Math.min(
    1,
    maxImageWidth / naturalWidth,
    maxImageHeight / naturalHeight,
  );
  const imageWidth = Math.round(naturalWidth * scale);
  const imageHeight = Math.round(naturalHeight * scale);
  element.style.setProperty("--expanded-card-width", `${imageWidth + 28}px`);
  element.style.setProperty("--expanded-image-height", `${imageHeight}px`);
}

function setupSceneCardDrag(element, item) {
  element.addEventListener(
    "click",
    (event) => {
      if (element.dataset.dragged === "true") {
        event.preventDefault();
        event.stopImmediatePropagation();
        element.dataset.dragged = "false";
      }
    },
    true,
  );

  element.addEventListener("pointerdown", (event) => {
    if (event.target.closest("a, button, .sceneCardResizeHandle")) return;
    if (event.button !== 0 || window.matchMedia("(max-width: 820px)").matches)
      return;
    const width = stageFrame.clientWidth;
    const height = stageFrame.clientHeight;
    if (!width || !height) return;
    const current = resolvedCardSlot(item.id, width, height);
    cardDrag = {
      element,
      id: item.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: current.x,
      originY: current.y,
      moved: false,
    };
    element.setPointerCapture(event.pointerId);
    element.classList.add("dragging");
  });

  element.addEventListener("pointermove", (event) => {
    if (
      !cardDrag ||
      cardDrag.pointerId !== event.pointerId ||
      cardDrag.element !== element
    )
      return;
    const width = stageFrame.clientWidth;
    const height = stageFrame.clientHeight;
    const bounds = cardPositionBounds(width, height);
    const next = {
      x: clamp(
        cardDrag.originX + event.clientX - cardDrag.startX,
        bounds.minX,
        bounds.maxX,
      ),
      y: clamp(
        cardDrag.originY + event.clientY - cardDrag.startY,
        bounds.minY,
        bounds.maxY,
      ),
    };
    const moved =
      Math.hypot(
        event.clientX - cardDrag.startX,
        event.clientY - cardDrag.startY,
      ) > 4;
    cardDrag.moved = cardDrag.moved || moved;
    element.style.setProperty("--card-x", `${next.x}px`);
    element.style.setProperty("--card-y", `${next.y}px`);
    if (cardDrag.moved) {
      event.preventDefault();
    }
  });

  element.addEventListener("pointerup", (event) =>
    finishSceneCardDrag(event, element),
  );
  element.addEventListener("pointercancel", (event) =>
    finishSceneCardDrag(event, element),
  );
}

function finishSceneCardDrag(event, element) {
  if (
    !cardDrag ||
    cardDrag.pointerId !== event.pointerId ||
    cardDrag.element !== element
  )
    return;
  element.classList.remove("dragging");
  if (cardDrag.moved) {
    const width = stageFrame.clientWidth;
    const height = stageFrame.clientHeight;
    const bounds = cardPositionBounds(width, height);
    const x = clamp(
      cardDrag.originX + event.clientX - cardDrag.startX,
      bounds.minX,
      bounds.maxX,
    );
    const y = clamp(
      cardDrag.originY + event.clientY - cardDrag.startY,
      bounds.minY,
      bounds.maxY,
    );
    cardPositions = {
      ...cardPositions,
      [cardDrag.id]: { x: x / width, y: y / height },
    };
    localStorage.setItem(
      CARD_POSITION_STORAGE_KEY,
      JSON.stringify(cardPositions),
    );
    element.dataset.dragged = "true";
  }
  cardDrag = null;
}

function setupSceneCardResize(element, item) {
  const handle = element.querySelector(".sceneCardResizeHandle");
  if (!handle) return;
  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || window.matchMedia("(max-width: 820px)").matches)
      return;
    event.preventDefault();
    event.stopPropagation();
    const width = stageFrame.clientWidth;
    const height = stageFrame.clientHeight;
    if (!width || !height) return;
    const current = resolvedCardSize(item.id, width, height);
    cardResize = {
      element,
      id: item.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      width: current.width,
      height: current.height,
    };
    handle.setPointerCapture(event.pointerId);
    element.classList.add("resizing");
  });

  handle.addEventListener("pointermove", (event) => {
    if (
      !cardResize ||
      cardResize.pointerId !== event.pointerId ||
      cardResize.element !== element
    )
      return;
    const width = stageFrame.clientWidth;
    const height = stageFrame.clientHeight;
    const bounds = cardSizeBounds(width, height);
    const nextWidth = clamp(
      cardResize.width + event.clientX - cardResize.startX,
      bounds.minWidth,
      bounds.maxWidth,
    );
    const nextHeight = clamp(
      cardResize.height + event.clientY - cardResize.startY,
      bounds.minHeight,
      bounds.maxHeight,
    );
    element.style.setProperty("--card-width", `${nextWidth}px`);
    element.style.setProperty("--card-height", `${nextHeight}px`);
    event.preventDefault();
  });

  handle.addEventListener("pointerup", (event) =>
    finishSceneCardResize(event, element),
  );
  handle.addEventListener("pointercancel", (event) =>
    finishSceneCardResize(event, element),
  );
}

function finishSceneCardResize(event, element) {
  if (
    !cardResize ||
    cardResize.pointerId !== event.pointerId ||
    cardResize.element !== element
  )
    return;
  element.classList.remove("resizing");
  const width = stageFrame.clientWidth;
  const height = stageFrame.clientHeight;
  const bounds = cardSizeBounds(width, height);
  const nextWidth = clamp(
    cardResize.width + event.clientX - cardResize.startX,
    bounds.minWidth,
    bounds.maxWidth,
  );
  const nextHeight = clamp(
    cardResize.height + event.clientY - cardResize.startY,
    bounds.minHeight,
    bounds.maxHeight,
  );
  cardSizes = {
    ...cardSizes,
    [cardResize.id]: { width: nextWidth / width, height: nextHeight / height },
  };
  localStorage.setItem(CARD_SIZE_STORAGE_KEY, JSON.stringify(cardSizes));
  cardResize = null;
  updateSceneCardLayout(milestones[activeIndex()].id);
}

function loadCardPositions() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(CARD_POSITION_STORAGE_KEY) || "{}",
    );
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([, value]) => Number.isFinite(value?.x) && Number.isFinite(value?.y),
      ),
    );
  } catch {
    return {};
  }
}

function loadCardSizes() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(CARD_SIZE_STORAGE_KEY) || "{}",
    );
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([, value]) =>
          Number.isFinite(value?.width) && Number.isFinite(value?.height),
      ),
    );
  } catch {
    return {};
  }
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
  return i18n.t("ui.time.day", {
    day: Math.max(0, Math.floor((time / DURATION) * 10)),
  });
}

function smoothstep(edge0, edge1, value) {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
