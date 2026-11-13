import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Clone, useGLTF, Stats } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import Background from './Background';
import Grass from './Grass';
import GrassTufts from './GrassTufts';
import CameraController from './CameraController';
import BoardTitle from './BoardTitle';
import Tutorial from './Tutorial';
import { startDeferredPreload3D, requestImmediatePreload3D, whenCase3DPreloaded } from './case3DAssets';
import Prewarm3D from './Prewarm3D';

import DescriptionFlappyIa from './DescriptionFlappyIa';
import DescriptionMemory from './DescriptionMemory';
import DescriptionSentiment from './DescriptionSentiment';
import DescriptionCuration from './DescriptionCuration';
import DescriptionVoxBridge from './DescriptionVoxBridge';
import DescriptionWorximity from './DescriptionWorximity';
import DescriptionV1Portfolio from './DescriptionV1Portfolio';
import DescriptionLoisir from './DescriptionLoisir';
import DescriptionParcoursPro from './DescriptionParcoursPro';
import DescriptionBenevolat from './DescriptionBenevolat';
import DescriptionParcoursScolaire from './DescriptionParcoursScolaire';
import DescriptionNavigator from './DescriptionNavigator';
import DescriptionComingSoon from './DescriptionComingSoon';

import { FlappyIaCase } from './case/FlappyIaCase';
import { MemoryCase } from './case/MemoryCase'
import { SentimentCase } from './case/Sentiment'
import { ParcoursPro } from './case/ParcoursPro'
import { ParcoursScolaire } from './case/ParcoursScolaire'
import { Worximity } from './case/Worximity'
import { Loisir } from './case/Loisir'
import { V1Portfolio } from './case/V1Portfolio'
import { CurationCase } from './case/Curation'
import { VoxBridge } from './case/Voxbridge';
import { Benevolat } from './case/Benevolat';
import { StartCase } from './case/StartCase';
import { GithubCase } from './case/GithubCase';
import { CvCase } from './case/CvCase';
import { LinkdinCase } from './case/LinkdinCase';
import { ComingSoonCase } from './case/ComingSoon';
import Plateau from './case/Plateau';


// Destinations des cases de coin, ouvertes à la fin du zoom caméra. La case
// Départ n'a pas d'URL : elle ouvre le chatbot (présentation personnelle,
// cf. Chatbot.jsx et App.jsx).
const LINKDIN_URL = 'https://www.linkedin.com/in/baptiste-le-bail/';
const GITHUB_URL = 'https://github.com/dolipran3'
const CV_URL = '/BaptisteLeBailCv.pdf';

// Durées (en secondes) de la séquence de navigation entre projets via les
// flèches. SLIDE_* : glisse de la description ; NAV_CAMERA : caméra (pivot +
// déplacement fusionnés en un seul mouvement). Valeurs à maintenir en
// cohérence avec GSAP dans CaseDescription / CameraController.
const SLIDE_EXIT_DURATION = 0.55;
// const SLIDE_ENTER_DURATION = 0.5;
// const NAV_CAMERA_DURATION = 1.4;

// Commutateur d'herbe : quelle approche afficher (cf. le bloc <Canvas>).
const GRASS_MODE = 'tufts'; // 'instanced' | 'tufts' | 'both'

// Les 12 cases navigables (toutes sauf les 4 cases de coin) dans l'ordre
// où elles se suivent autour du plateau : flèche droite = case suivante,
// flèche gauche = case précédente, en boucle. Les cases de coin n'y
// figurent pas : les flèches ne permettent jamais d'y aller.
const RING_OF_CASES = [
  { position: [-3, -6, 0.5], rotation: [0, 0, 0], type: 'voxBridge' },
  { position: [0, -6, 0.5], rotation: [0, 0, 0], type: 'v1Portfolio' },
  { position: [3, -6, 0.5], rotation: [0, 0, 0], type: 'flappy-ia' },
  { position: [6, -3, 0.5], rotation: [0, 0, Math.PI / 2], type: 'curation' },
  { position: [6, 0, 0.5], rotation: [0, 0, Math.PI / 2], type: 'memory' },
  { position: [6, 3, 0.5], rotation: [0, 0, Math.PI / 2], type: 'sentiment' },
  { position: [3, 6, 0.5], rotation: [0, 0, Math.PI], type: 'worximity' },
  { position: [0, 6, 0.5], rotation: [0, 0, Math.PI], type: 'comingSoon' },
  { position: [-3, 6, 0.5], rotation: [0, 0, Math.PI], type: 'loisir' },
  { position: [-6, 3, 0.5], rotation: [0, 0, -Math.PI / 2], type: 'parcoursPro' },
  { position: [-6, 0, 0.5], rotation: [0, 0, -Math.PI / 2], type: 'parcoursScolaire' },
  { position: [-6, -3, 0.5], rotation: [0, 0, -Math.PI / 2], type: 'benevolat' },
];

// Les arbres autour du plateau : un clone indépendant par instance
// (un Object3D ne peut avoir qu'un parent), géométries et matériaux partagés.
// <Clone> propage castShadow / receiveShadow aux meshes enfants.
// useGLTF suspend tant que le GLB n'est pas chargé, d'où le Suspense côté scène.
function Trees() {
  const { scene } = useGLTF('/arbre_low_poly.glb');
  return (
    <>
      <Clone object={scene} position={[10, 0, 0]} rotation={[Math.PI/2, 0, 0]} scale={[0.5, 0.5, 0.5]} castShadow />
      <Clone object={scene} position={[15, 3, 0]} rotation={[Math.PI/2, Math.PI/2, 0]} scale={[0.5, 0.5, 0.5]} castShadow />
      <Clone object={scene} position={[-14, 6, 0]} rotation={[Math.PI/2, 0, 0]} scale={[0.5, 0.5, 0.5]} castShadow />
      <Clone object={scene} position={[-13, -3, 0]} rotation={[Math.PI/2, -Math.PI/8, 0]} scale={[0.5, 0.5, 0.5]} castShadow />
      <Clone object={scene} position={[-16, 5, 0]} rotation={[Math.PI/2, Math.PI/4, 0]} scale={[0.5, 0.5, 0.5]} castShadow />
      <Clone object={scene} position={[0, 10, 0]} rotation={[Math.PI/2, 0, 0]} scale={[0.5, 0.5, 0.5]} castShadow />
      <Clone object={scene} position={[0, -12, 0]} rotation={[Math.PI/2, 0, 0]} scale={[0.5, 0.5, 0.5]} castShadow />
      <Clone object={scene} position={[3, -15, 0]} rotation={[Math.PI/2, 0, 0]} scale={[0.5, 0.5, 0.5]} castShadow />
    </>
  );
}

// Le plateau central est défini dans case/Plateau.jsx : la texture du centre
// y est chargée via useTexture, qui doit être appelée depuis un composant
// rendu À L'INTÉRIEUR du <Canvas> et qui suspend pendant le chargement, d'où
// le Suspense côté scène.
function Scene({ onOpenChatbot }) {

  const [view, setView] = useState('initial'); // 'initial', 'top' ou 'case'
  const [focusedCase, setFocusedCase] = useState(null); // null ou { position, rotation }
  const [showCaseDetails, setShowCaseDetails] = useState(false);
  // Transition en cours entre deux projets via les flèches :
  // { direction: -1 | 1, phase: 'exit' | 'enter' } ou null.
  const [navTransition, setNavTransition] = useState(null);
  const cameraRef = useRef();
  const navTimersRef = useRef([]);

  // Chronomètres de la séquence de navigation : on les annule proprement.
  const clearNavTimers = useCallback(() => {
    navTimersRef.current.forEach(clearTimeout);
    navTimersRef.current = [];
  }, []);

  useEffect(() => {
    return () => {
      navTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  // Préchargement des modèles 3D en arrière-plan (un par un, du plus léger au
  // plus lourd) une fois la scène reposée, en complément du survol des cases.
  useEffect(() => {
    startDeferredPreload3D();
  }, []);

  const handleSelect = useCallback((caseData) => {
    // Déjà en vue "case" : on revient à la vue du dessus au lieu de
    // basculer directement sur la case cliquée.
    if (view === 'case') {
      cameraRef.current?.returnToTop();
      return;
    }
    // En vue "initiale" : un clic sur une case passe en vue "top"
    // sans zoomer dessus ni basculer en vue "case".
    if (view === 'initial') {
      cameraRef.current?.goToTop();
      return;
    }
    setFocusedCase(caseData);
    setShowCaseDetails(false);
    setView('case');
  }, [view]);

  // Appelé quand le zoom face à la case (Étape 1) est terminé :
  // à partir de là seulement on peut afficher la description.
  const handleZoomToCase = useCallback(() => {
    setShowCaseDetails(true);
  }, []);

  const handleUnfocus = useCallback(() => {
    // Si on quitte une case pendant une navigation par flèche : plus aucune
    // bascule à faire (sinon la description du projet suivant surgirait
    // depuis la vue du dessus une fois le décodage terminé).
    clearNavTimers();
    setNavTransition(null);
    setFocusedCase(null);
    setShowCaseDetails(false);
  }, [clearNavTimers]);

  // Navigation entre les cases via les flèches de la description :
  // on passe à la case voisine dans l'anneau (direction -1 ou +1).
  // Séquence : slide de sortie de l'ancienne description → attente que les
  // assets du projet suivant soient décodés (pour ne jamais faire ce travail
  // pendant les animations, sinon elles saccadent) → bascule + glisse
  // d'entrée pendant le déplacement caméra.
  const handleNavigate = useCallback((direction) => {
    if (view !== 'case' || !focusedCase || navTransition) return;
    const index = RING_OF_CASES.findIndex(
      (c) => c.position[0] === focusedCase.position?.[0]
        && c.position[1] === focusedCase.position?.[1]
    );
    if (index === -1) return;
    if (index === -1) return;
    const next = RING_OF_CASES[(index + direction + RING_OF_CASES.length) % RING_OF_CASES.length];

    // Le projet suivant doit être décodé avant que la caméra bouge :
    // préchargage prioritaire immédiat, devant tout le reste.
    requestImmediatePreload3D(next.type);

    // On fige l'éventuelle glisse de caméra en cours (peut durer 3 s après
    // l'arrivée sur une case) : elle se prolongerait pendant la sortie ET
    // bloquerait la file de préchargement via cameraBusy.
    cameraRef.current?.stopAnimation();

    clearNavTimers();
    // Phase 1 : la description actuelle glisse hors du champ, vers le côté
    // opposé à la flèche cliquée.
    setNavTransition({ direction, phase: 'exit' });

    // Phase 2 (différée) : dès que la sortie est finie ET le projet suivant
    // décodé, on bascule : la caméra pivote puis se replace en un seul
    // mouvement pendant que la nouvelle description glisse depuis le hors
    // champ. Si le projet est resté long à charger, l'écran est statique
    // pendant l'attente (la sortie est déjà finie), donc invisible.
    navTimersRef.current.push(setTimeout(() => {
      whenCase3DPreloaded(next.type).then(() => {
        setFocusedCase(next);
        setNavTransition({ direction, phase: 'enter' });
      });
    }, SLIDE_EXIT_DURATION * 1000));

    // Fin de la séquence : nettoyée par onNavDone, appelé par la caméra à la
    // fin de son mouvement unique.
  }, [view, focusedCase, navTransition, clearNavTimers]);

  // Appelé par CameraController à la fin du mouvement caméra de navigation :
  // la transition n'a plus de raison d'être.
  const handleNavDone = useCallback(() => {
    setNavTransition(null);
  }, []);

  // Clic dans l'arrière-plan (fond ou plateau) :
  // - en vue "case" : retour à la vue du dessus ;
  // - en vue "top" : retour à la vue initiale ;
  // - en vue "initiale" : passage à la vue du dessus.
  const handleBackgroundClick = useCallback(() => {
    if (view === 'case') {
      cameraRef.current?.returnToTop();
      return;
    }
    if (view === 'top') {
      cameraRef.current?.returnToInitial();
      return;
    }
    cameraRef.current?.goToTop();
  }, [view]);

  return (
    <div>
      <Canvas
      shadows={true}
      // DPR plafonné à 1.5 : par défaut r3f rend au DPR natif (2 sur écran
      // Retina = 4× plus de pixels par frame, fill rate très lourd).
      dpr={[1, 1.5]}
      style={{ 
        width: '100vw', 
        height: '100vh', 
        background: '#219ebc', 
        position: 'absolute', 
        top: 0, 
        left: 0 
      }}
      camera={{   
        position: [0, -15, 15], 
        fov: 50,
        near: 0.1,
        far: 500
      }}
      onPointerMissed={handleBackgroundClick}
      >
      {/* Préparation GPU des modèles préchargés (shaders + textures) */}
      <Prewarm3D />

      {/* Lumières */}

      <ambientLight intensity={Math.PI / 2} />

      <pointLight 
        position={[10, 10, 10]} 
        decay={0} 
        intensity={Math.PI} 
        castShadow={true}
      />
      <CameraController 
        ref={cameraRef}
        setView={setView}  
        focusedCase={focusedCase} 
        view={view}
        navPhase={navTransition?.phase}
        onZoomToCase={handleZoomToCase}
        onUnfocus={handleUnfocus}
        onNavDone={handleNavDone}
        onOpenChatbot={onOpenChatbot} />

      <Background onClick={handleBackgroundClick} />
      

      <Suspense fallback={null}>
        <Plateau onClick={handleBackgroundClick} />
      </Suspense>

      <BoardTitle position={[0, 0, 0.9]} />

      {/* La description (cube + cartes) n'apparaît qu'après le zoom face à la case.
          navigation par flèches : "transition" pilote la glisse hors champ /
          depuis le hors champ, en suivant la rotation de la case ciblée. */}
      {showCaseDetails && focusedCase?.type === 'flappy-ia' && (
        <Suspense fallback={null}>
          <DescriptionFlappyIa transition={navTransition} caseRotation={focusedCase.rotation?.[2] ?? 0} />
        </Suspense>
      )}

      {showCaseDetails && focusedCase?.type === 'memory' && (
        <Suspense fallback={null}>
          <DescriptionMemory transition={navTransition} caseRotation={focusedCase.rotation?.[2] ?? 0} />
        </Suspense>
      )}

      {showCaseDetails && focusedCase?.type === 'sentiment' && (
        <Suspense fallback={null}>
          <DescriptionSentiment transition={navTransition} caseRotation={focusedCase.rotation?.[2] ?? 0} />
        </Suspense>
      )}

      {showCaseDetails && focusedCase?.type === 'curation' && (
        <Suspense fallback={null}>
          <DescriptionCuration transition={navTransition} caseRotation={focusedCase.rotation?.[2] ?? 0} />
        </Suspense>
      )}

      {showCaseDetails && focusedCase?.type === 'voxBridge' && (
        <Suspense fallback={null}>
          <DescriptionVoxBridge transition={navTransition} caseRotation={focusedCase.rotation?.[2] ?? 0} />
        </Suspense>
      )}

      {showCaseDetails && focusedCase?.type === 'v1Portfolio' && (
        <Suspense fallback={null}>
          <DescriptionV1Portfolio transition={navTransition} caseRotation={focusedCase.rotation?.[2] ?? 0} />
        </Suspense>
      )}

      {showCaseDetails && focusedCase?.type === 'worximity' && (
        <Suspense fallback={null}>
          <DescriptionWorximity transition={navTransition} caseRotation={focusedCase.rotation?.[2] ?? 0} />
        </Suspense>
      )}

      {showCaseDetails && focusedCase?.type === 'loisir' && (
        <Suspense fallback={null}>
          <DescriptionLoisir transition={navTransition} caseRotation={focusedCase.rotation?.[2] ?? 0} />
        </Suspense>
      )}

      {showCaseDetails && focusedCase?.type === 'parcoursPro' && (
        <Suspense fallback={null}>
          <DescriptionParcoursPro transition={navTransition} caseRotation={focusedCase.rotation?.[2] ?? 0} />
        </Suspense>
      )}

      {showCaseDetails && focusedCase?.type === 'parcoursScolaire' && (
        <Suspense fallback={null}>
          <DescriptionParcoursScolaire transition={navTransition} caseRotation={focusedCase.rotation?.[2] ?? 0} />
        </Suspense>
      )}

      {showCaseDetails && focusedCase?.type === 'benevolat' && (
        <Suspense fallback={null}>
          <DescriptionBenevolat transition={navTransition} caseRotation={focusedCase.rotation?.[2] ?? 0} />
        </Suspense>
      )}

      {showCaseDetails && focusedCase?.type === 'comingSoon' && (
        <Suspense fallback={null}>
          <DescriptionComingSoon transition={navTransition} caseRotation={focusedCase.rotation?.[2] ?? 0} />
        </Suspense>
      )}

      {/* haut */}
      <ComingSoonCase 
        position={[0, 6, 0.5]} 
        rotation={[0, 0, Math.PI]} 
        view={view} 
        onSelect={handleSelect} />
      <Worximity
        position={[3, 6, 0.5]} 
        rotation={[0, 0, Math.PI]} 
        view={view} 
        onSelect={handleSelect}  />

      <Loisir 
        position={[-3, 6, 0.5]} 
        rotation={[0, 0, Math.PI]} 
        view={view} 
        onSelect={handleSelect}  />

      {/* bas */}

      <V1Portfolio position={[0, -6, 0.5]} view={view} onSelect={handleSelect} />
      <FlappyIaCase position={[3, -6, 0.5]} view={view} onSelect={handleSelect} />
      <VoxBridge position={[-3, -6, 0.5]} view={view} onSelect={handleSelect} />

      {/* droite */}

      <MemoryCase 
        position={[6, 0, 0.5]} 
        rotation={[0, 0, Math.PI/2]} 
        view={view} 
        onSelect={handleSelect}  />
      <SentimentCase 
        position={[6, 3, 0.5]} 
        rotation={[0, 0, Math.PI/2]} 
        view={view} 
        onSelect={handleSelect}  />
      <CurationCase
        position={[6, -3, 0.5]} 
        rotation={[0, 0, Math.PI/2]} 
        view={view} 
        onSelect={handleSelect}  />

      {/* gauche */}
      <ParcoursPro 
        position={[-6, 3, 0.5]} 
        rotation={[0, 0, -Math.PI/2]} 
        view={view} 
        onSelect={handleSelect}  />
      <ParcoursScolaire 
        position={[-6, 0, 0.5]} 
        rotation={[0, 0, -Math.PI/2]} 
        view={view} 
        onSelect={handleSelect}  />
      <Benevolat 
        position={[-6, -3, 0.5]} 
        rotation={[0, 0, -Math.PI/2]} 
        view={view} 
        onSelect={handleSelect}  />

      {/* la case Départ : à la fin du zoom caméra, le chatbot s'ouvre et se
          présente (lecture de infoPerso.md message par message) */}

      <GithubCase
        position={[6, 6, 0.5]}
        rotation={[0, 0, Math.PI*3/4]}
        view={view}
        onSelect={handleSelect}
        url={GITHUB_URL} />
      <LinkdinCase
        position={[-6, 6, 0.5]}
        rotation={[0, 0, -Math.PI*3/4]}
        view={view}
        onSelect={handleSelect}
        url={LINKDIN_URL} />
      <StartCase
        position={[6, -6, 0.5]}
        rotation={[0, 0, Math.PI/4]}
        view={view}
        onSelect={handleSelect} />
      <CvCase
        position={[-6, -6, 0.5]}
        rotation={[0, 0, -Math.PI/4]}
        view={view}
        onSelect={handleSelect}
        url={CV_URL} />

      <Suspense fallback={null}>
        <Trees />
      </Suspense>

      {/* Herbe instanciée autour du plateau (anneau à l'extérieur des cases et
          des arbres), animée par un vent sinus. Pas de GLB ni de texture à
          charger : pas besoin de Suspense, tout le réglage est dans Grass.jsx. */}
      {/* Comparaison des deux systèmes d'herbe (ils couvrent la MÊME zone
          annulaire, cf. les deux fichiers) :
          - 'instanced' → Grass.jsx (option B) : 1 draw call, ~2200 brins
            individuels fins, vent par brin ;
          - 'tufts'     → GrassTufts.jsx (option A) : ~60 touffes modélisées
            clonées, vent par touffe entière ;
          - 'both'      → les deux superposés (mélange des deux échelles). */}
      {GRASS_MODE === 'instanced' || GRASS_MODE === 'both' ? <Grass /> : null}
      {GRASS_MODE === 'tufts' || GRASS_MODE === 'both' ? <GrassTufts /> : null}

      <Stats className="stats" />

      {/* Bloom pour l'effet néon du texte « COMING SOON » (DescriptionComingSoon) :
          le texte émet une luminance très supérieure au reste de la scène, donc
          lui seul dépasse le seuil et produit le halo. Activé uniquement quand
          la vue néon est affichée, pour ne pas payer une passe de rendu en plus
          le reste du temps. */}
      <EffectComposer enabled={showCaseDetails && focusedCase?.type === 'comingSoon'}>
        <Bloom mipmapBlur intensity={1.6} luminanceThreshold={0.9} luminanceSmoothing={0.2} />
      </EffectComposer>
    </Canvas>
      {/* Flèches de navigation entre cases : overlay HTML posé AU-DESSUS du
          canevas, donc rendu en dehors de <Canvas> (r3f n'accepte que du 3D
          à l'intérieur, d'où le plantage page blanche si on le met dedans).
          Affiché dès qu'une description est visible, sauf pour les coins. */}
      {showCaseDetails && focusedCase && focusedCase.type !== 'corner' && (
        <DescriptionNavigator onNavigate={handleNavigate} />
      )}

      {/* Tutoriel de première visite : doigt qui montre de cliquer sur le
          plateau puis sur une case, puis flèches qui désignent le retour
          en arrière et le changement de projet en vue description. Non
          cliquable, posé au-dessus du canevas comme DescriptionNavigator. */}
      <Tutorial view={view} navigating={Boolean(navTransition)} />
    </div>
  );
}

export default Scene;