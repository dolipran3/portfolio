import { useGLTF, useTexture } from '@react-three/drei';

// ── Registre central des assets 3D des cases ────────────────────────────────
// Les modèles générés par IA sont lourds (7 à 17 Mo aujourd'hui, 4 à 6 modèles
// au total soit potentiellement 60-90 Mo) : on ne les télécharge PAS tous au
// chargement de la page. Deux déclencheurs, par ordre de priorité :
//   1. le survol d'une case (intention claire de l'utilisateur) ;
//   2. un préchargement d'arrière-plan, un modèle à la fois, du plus léger au
//      plus lourd, une fois la scène interactive (startDeferredPreload3D).
// useGLTF.preload met en cache le modèle DÉJÀ ANALYSÉ : quand on clique, le
// rendu est synchrone, sans attente réseau ni coût de parsing.
export const CASE_3D_ASSETS = {
  'flappy-ia': { glb: '/falppyFinal-draco.glb', description: '/descriptionFlappyIa.webp' },
  memory: { glb: '/memory-draco.glb', description: '/memoryDes.webp' },
  curation: { glb: '/aspect-draco-defaut.glb', description: '/curationDes.webp' },
  voxBridge: { glb: '/voxBridge-draco-defaut.glb', description: '/VoxBridgeDes.webp' },
  v1Portfolio: { glb: '/v1Portfolio-draco-defaut.glb', description: '/V1PortfolioDes.webp' },
  worximity: { glb: '/worximity-draco-defaut.glb', description: '/WorximityDes.webp' },
  sentiment: { glb: '/sentiment3D-draco.glb', description: '/sentimentDes.webp' },
  loisir: {description: '/Loisirs.webp' },
  parcoursPro: {description: '/ParcoursProDes.webp' },
  parcoursScolaire: {description: '/ParcoursScolaireDes.webp' },
  benevolat: {description: '/BenevolatDes.webp' },
  // curation: { glb: '/curation-draco.glb', description: '/descriptionCuration.webp' },
};

// Les GLB sont compressés en Draco (décodage géométrie dans des Web Workers
// de DRACOLoader → plus de parsing lourd sur le main thread). Three est livré
// avec les décodeurs : on les sert depuis public/draco plutôt que depuis le
// CDN gstatic de Google (pas de dépendance réseau pour décoder).
useGLTF.setDecoderPath('/draco/');

// Ordre de préchargement en arrière-plan : du plus léger au plus lourd.
// À tenir à jour en ajoutant les nouvelles cases selon leur taille estimée.
const PRELOAD_ORDER = ['flappy-ia', 'memory', 'sentiment', 'curation', 'voxBridge', 'v1Portfolio', 'worximity'];

// Délai entre le lancement de deux modèles : chaque GLB continue de se
// télécharger en fond pendant qu'on attend, on ne démarre donc le suivant
// qu'après ce délai pour ne jamais saturer la connexion.
const PRELOAD_DELAY_MS = 3000;

// Fréquence à laquelle on réessaie quand une animation de caméra est en cours.
const CAMERA_BUSY_POLL_MS = 200;

// Exécute les callbacks quand le navigateur est au repos (fallback si absent).
const whenIdle = (cb) =>
  typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback(cb, { timeout: 4000 })
    : setTimeout(cb, 2000);

// ── Extraction du parsing lourd hors des animations ─────────────────────────
// Le parsing d'un GLB de 15 Mo se fait sur le main thread, comme l'animation
// de la caméra (gsap). S'il tombe pendant un zoom, les frames tombent.
// CameraController signale donc ses animations via setCameraBusy, et le
// scheduler ci-dessous ne lance JAMAIS un parsing pendant ce temps.
// Le téléchargement réseau lui-même (autre thread) n'est pas concerné.
let cameraBusy = false;

export function setCameraBusy(busy) {
  cameraBusy = busy;
}

// File d'attente prioritaire : le survol d'une case passe devant l'ordre
// d'arrière-plan. Un type préchargé (déjà en cache) est ignoré.
const preloaded = new Set();
const queue = [];
let drainArmed = false;

// Notifie le Prewarm3D (compilation shaders + upload GPU des textures) quand
// un modèle devient disponible en cache, pour que le premier affichage de la
// description ne paie pas ce coût pendant une animation de caméra.
const preloadedListeners = new Set();

export function onCase3DPreloaded(callback) {
  preloadedListeners.add(callback);
  return () => preloadedListeners.delete(callback);
}

// Promesse résolue quand le type est en cache (immédiate si déjà préchargé) :
// permet de différer une animation tant que son avenir n'est pas prêt, pour
// que le décodage du GLB ne tombe jamais pendant le mouvement.
export function whenCase3DPreloaded(type) {
  if (!CASE_3D_ASSETS[type] || preloaded.has(type)) return Promise.resolve(type);
  return new Promise((resolve) => {
    const unsubscribe = onCase3DPreloaded((done) => {
      if (done !== type) return;
      unsubscribe();
      resolve(type);
    });
  });
}

function enqueue(type, highPriority) {
  if (preloaded.has(type) || !CASE_3D_ASSETS[type]) return;
  const index = queue.indexOf(type);
  if (index >= 0) queue.splice(index, 1);
  if (highPriority) queue.unshift(type);
  else queue.push(type);
  scheduleDrain();
}

function scheduleDrain() {
  if (drainArmed) return;
  drainArmed = true;
  whenIdle(drain);
}

function drain() {
  // Une animation de caméra est en cours : on remet la charge lourde à plus
  // tard, le téléchargement en cours continue de lui-même en fond.
  if (cameraBusy) {
    setTimeout(drain, CAMERA_BUSY_POLL_MS);
    return;
  }

  const type = queue.shift();
  if (!type) {
    drainArmed = false; // file vide : on se réarme au prochain enqueue
    return;
  }

  if (!preloaded.has(type)) {
    preloaded.add(type);
    const assets = CASE_3D_ASSETS[type];
    // Certaines cases n'ont pas de modèle 3D (ex. loisir, carte seule) :
    // on ne précharge que la texture de description, sinon useGLTF.preload
    // partirait sur un GLB non défini et ferait planter le navigateur.
    if (assets.glb) useGLTF.preload(assets.glb);
    useTexture.preload(assets.description);
    preloadedListeners.forEach((callback) => callback(type));
  }

  // On espace les lancements pour ne pas saturer la connexion, puis on
  // continue la file (drainArmed reste à true : la boucle continue).
  setTimeout(drain, PRELOAD_DELAY_MS);
}

// ── Points d'entrée ─────────────────────────────────────────────────────────

// Délai d'anticipation avant de traiter un survol : un pointeur qui traverse
// la case sans s'arrêter ne déclenche pas un parsing de 15 Mo. Et si un clic
// arrive dans ce délai, le parsing sera repoussé après l'animation par le
// garde cameraBusy au moment du drain.
const HOVER_DELAY_MS = 250;
const hoverTimers = new Map(); // type -> timer

// Survol d'une case : priorité maximale dans la file, avec un court délai.
export function preloadCase3D(type) {
  if (preloaded.has(type) || !CASE_3D_ASSETS[type] || hoverTimers.has(type)) return;
  hoverTimers.set(type, setTimeout(() => {
    hoverTimers.delete(type);
    enqueue(type, true);
  }, HOVER_DELAY_MS));
}

// Préchargement prioritaire immédiat (clic sur une flèche de navigation) :
// passe devant la file d'arrière-plan, sans délai d'anticipation.
export function requestImmediatePreload3D(type) {
  enqueue(type, true);
}

let deferredStarted = false;

// À appeler une fois au démarrage (Scene.jsx) : au repos, précharge tous les
// modèles un par un, sans bloquer la première interaction de l'utilisateur.
export function startDeferredPreload3D() {
  if (deferredStarted || typeof window === 'undefined') return;
  deferredStarted = true;
  PRELOAD_ORDER.forEach((type) => enqueue(type, false));
}
