import { useEffect, useRef, useState } from 'react';
import { useProgress } from '@react-three/drei';
import './LoadingScreen.css';

// ── Écran de chargement ──────────────────────────────────────────────────────
// Overlay plein écran au-dessus du canevas : le plateau et les cases (textures
// via useTexture) se chargent derrière pendant que le logo Passe du noir &
// blanc à la couleur, révélé de gauche à droite comme une barre de 0 à 100 %.
//
// La progression vient de useProgress (drei) : elle agrège tout ce qui passe
// par le LoadingManager de three, c'est-à-dire exactement les textures du
// plateau, des cases, des billets et les polices Text3D demandées au
// démarrage. Le préchargement d'arrière-plan des gros modèles GLB ne démarre
// qu'APRÈS cet écran (cf. App.jsx → onLoadingDone → startDeferredPreload3D),
// sinon la barre attendrait aussi ces dizaines de Mo.

// Version noir & blanc (couche de fond) et version couleur (couche révélée).
const LOGO_NB_URL = '/LogoPortfolioNB.png';
const LOGO_COLOR_URL = '/LogoPortfolio.png';

// Affichage minimum : même si tout est déjà en cache, la barre reste lisible.
const MIN_DISPLAY_MS = 1200;
// Temps laissé au lissage pour faire glisser la barre jusqu'à 100 %.
const FINISH_MS = 800;
// Durée du fondu de sortie (à maintenir en cohérence avec LoadingScreen.css).
const FADE_MS = 700;
// Fraction de la distance restante parcourue à chaque frame par le lissage.
const SMOOTHING = 0.1;

// Précharge les deux images du logo : on n'affiche le logo que lorsqu'elles
// sont décodées, pour éviter un apparition en deux temps (fond puis couleur).
function preloadLogoImages() {
  const urls = [LOGO_NB_URL, LOGO_COLOR_URL];
  return Promise.all(
    urls.map(
      (url) =>
        new Promise((resolve) => {
          const image = new Image();
          image.onload = resolve;
          image.onerror = resolve; // même en échec on affiche l'écran
          image.src = url;
        })
    )
  );
}

function LoadingScreen({ onLoadingDone }) {
  // Progression brute remontée par le LoadingManager de three.
  const { active, progress, total } = useProgress();

  const [displayed, setDisplayed] = useState(0); // % lissé, affiché
  const [logoReady, setLogoReady] = useState(false);
  const [fading, setFading] = useState(false); // fondu de sortie en cours
  const [unmounted, setUnmounted] = useState(false); // composant retiré du DOM

  // Refs miroirs lus par la boucle rAF (écrites dans des effets, jamais
  // pendant le rendu : le projet est compilé avec React Compiler).
  const targetRef = useRef(0); // cible de la barre (progression brute)
  const readyRef = useRef(false); // scène + logo prêts → cible 100 %
  const mountedAtRef = useRef(0); // instant du montage (affichage minimum)

  // Les assets sont considérés comme chargés dès qu'aucun transfert n'est en
  // cours et qu'au moins un a été demandé. On ne teste pas progress >= 100 :
  // en cas d'échec d'un asset (404…), il ne l'atteindrait jamais et on
  // resterait bloqué sur l'écran de chargement.
  const sceneReady = total > 0 && !active;

  // Instant de référence pour l'affichage minimum + précharge du logo.
  useEffect(() => {
    mountedAtRef.current = performance.now();
    let cancelled = false;
    preloadLogoImages().then(() => {
      if (!cancelled) setLogoReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Mise à jour des refs miroirs après chaque rendu.
  useEffect(() => {
    targetRef.current = progress;
    readyRef.current = sceneReady && logoReady;
  }, [progress, sceneReady, logoReady]);

  // Boucle de lissage : la valeur affichée rattrape sa cible frame par frame,
  // ce qui transforme les sauts de progression brute en glissement fluide.
  useEffect(() => {
    if (unmounted) return undefined;
    let frame;
    const tick = () => {
      setDisplayed((value) => {
        const target = readyRef.current ? 100 : targetRef.current;
        const next = value + (target - value) * SMOOTHING;
        // Fin exacte : le lissage asymptotique n'atteint jamais tout à fait 100.
        return target - next < 0.3 ? target : next;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [unmounted]);

  // Séquence de sortie : attendre l'affichage minimum + le temps que la barre
  // finisse sa course, puis fondu, puis retrait du DOM. C'est aussi au début
  // du fondu que le préchargement d'arrière-plan des modèles 3D est lancé
  // (onLoadingDone), la scène étant dès lors visible et interactive.
  useEffect(() => {
    if (!sceneReady || !logoReady || fading || unmounted) return undefined;
    const startDelay = Math.max(0, MIN_DISPLAY_MS - (performance.now() - mountedAtRef.current));
    const fadeTimer = setTimeout(() => {
      onLoadingDone?.();
      setFading(true);
    }, startDelay + FINISH_MS);
    const unmountTimer = setTimeout(() => setUnmounted(true), startDelay + FINISH_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, [sceneReady, logoReady, fading, unmounted, onLoadingDone]);

  if (unmounted) return null;

  return (
    <div className={`loading-screen${fading ? ' loading-screen--fading' : ''}`}>
      {logoReady && (
        <div className="loading-screen__content">
          {/* La variable CSS pilote le remplissage de la version couleur. */}
          <div
            className="loading-screen__logo"
            style={{ '--loading-progress': `${displayed}%` }}
          >
            <img className="loading-screen__logo-nb" src={LOGO_NB_URL} alt="" draggable="false" />
            <img
              className="loading-screen__logo-color"
              src={LOGO_COLOR_URL}
              alt=""
              draggable="false"
            />
          </div>
          <p className="loading-screen__percent">{Math.floor(displayed)} %</p>
        </div>
      )}
    </div>
  );
}

export default LoadingScreen;
