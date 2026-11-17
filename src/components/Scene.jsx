import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import Background from './Background';
import CameraController from './CameraController';
import BoardTitle from './BoardTitle';
import BoardName from './BoardName';
import Tutorial from './Tutorial';
import LapCounter from './LapCounter';
import { requestImmediatePreload3D, whenCase3DPreloaded } from './case3DAssets';
import Prewarm3D from './Prewarm3D';
import useIsMobile from '../hooks/useIsMobile';

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

import Ship from './3DUnique/Ship';
import Car from './3DUnique/Car';
import Dice from './3DUnique/Dice';

import B1 from './billets/B1'
import B5 from './billets/B5'
import B10 from './billets/B10'
import B20 from './billets/B20'
import B50 from './billets/B50'
import B100 from './billets/B100'
import B500 from './billets/B500'

import AvenueFlappyIa from './billets/AvenueFlappyIa';
import AvenueV1Portfolio from './billets/AvenueV1Portfolio';
import AvenueVoxBrige from './billets/AvenueVoxBridge';
import AvenueCuration from './billets/AvenueCuration';
import AvenueBenevolat from './billets/AvenueBenevolat';
import PrisonGithub from './billets/PrisonGithub';
import CaisseCommunaute from './billets/CaisseCommunaute';
import Chance from './billets/Chance';
import ChanceDivice from './billets/ChanceDivice';



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

function LightWithHelper() {
  // const ref = useRef();
  // useHelper(ref, SpotLightHelper, 1, 'red'); // Taille: 1, Couleur: rouge
  return <spotLight 
        // ref={ref}
        position={[0, -1, 15]} 
        intensity={600}
        penumbra={0.18}
        castShadow={true}
      />;
}

// Le plateau central est défini dans case/Plateau.jsx : la texture du centre
// y est chargée via useTexture, qui doit être appelée depuis un composant
// rendu À L'INTÉRIEUR du <Canvas> et qui suspend pendant le chargement, d'où
// le Suspense côté scène.
function Scene({ onOpenChatbot }) {

  const isMobile = useIsMobile();
  const [view, setView] = useState('initial'); // 'initial', 'top' ou 'case'
  const [focusedCase, setFocusedCase] = useState(null); // null ou { position, rotation }
  const [showCaseDetails, setShowCaseDetails] = useState(false);
  // Transition en cours entre deux projets via les flèches :
  // { direction: -1 | 1, phase: 'exit' | 'enter' } ou null.
  const [navTransition, setNavTransition] = useState(null);
  const cameraRef = useRef();
  const navTimersRef = useRef([]);

  // Nombre de tours complets du plateau effectués à la molette en vue du
  // dessus (comptés par CameraController). Sert au compteur affiché à partir
  // du 2e tour et au basculement de la texture du centre au-delà de 30 tours.
  const [lapCount, setLapCount] = useState(0);

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

  // Le préchargement d'arrière-plan des modèles 3D (startDeferredPreload3D)
  // est déclenché par l'écran de chargement une fois terminé (App.jsx) :
  // les gros GLB ne doivent pas rallonger la barre de progression, qui ne
  // couvre que le plateau, les cases et leurs textures.

  const handleSelect = useCallback((caseData) => {
    // Sur mobile : les clics ne changent plus les vues du plateau. Seules
    // les cases de coin restent actives, en ouvrant directement leur
    // destination (lien externe ou chatbot) sans zoom caméra.
    if (isMobile) {
      if (caseData.type === 'corner') {
        if (caseData.chatbot) {
          onOpenChatbot?.();
        } else {
          window.open(caseData.url ?? 'https://www.google.com', '_blank', 'noopener');
        }
      }
      return;
    }
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
  }, [view, isMobile, onOpenChatbot]);

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
    // Sur mobile : aucun changement de vue au clic (plateau, fond, ciel,
    // clic dans le vide via onPointerMissed).
    if (isMobile) return;
    if (view === 'case') {
      cameraRef.current?.returnToTop();
      return;
    }
    if (view === 'top') {
      cameraRef.current?.returnToInitial();
      return;
    }
    cameraRef.current?.goToTop();
  }, [view, isMobile]);

  return (
    <div>
      <Canvas
      shadows={true}
      // DPR plafonné à 1.5 : par défaut r3f rend au DPR natif (2 sur écran
      // Retina = 4× plus de pixels par frame, fill rate très lourd).
      dpr={[1, 1.5]}
      // 219ebc
      style={{ 
        width: '100vw', 
        height: '100vh', 
        background: '#180900', 
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

      <ambientLight intensity={0.8} />
      <LightWithHelper/>
      <CameraController 
        ref={cameraRef}
        setView={setView}  
        focusedCase={focusedCase} 
        view={view}
        navPhase={navTransition?.phase}
        onZoomToCase={handleZoomToCase}
        onUnfocus={handleUnfocus}
        onNavDone={handleNavDone}
        onOpenChatbot={onOpenChatbot}
        onLapChange={setLapCount} />

      <Background onClick={handleBackgroundClick} />
      

      <Suspense fallback={null}>
        <Plateau onClick={handleBackgroundClick} lapCount={lapCount} />
      </Suspense>

      <BoardTitle position={[0, 0, 0.9]} />
      <BoardName position={[-1.2, -1.2, 0.6]} />

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
        <Ship position={[9, -7, 0]} rotation={[Math.PI/2, 0, 0]} scale={0.7} />
      </Suspense>

      <Suspense fallback={null}>
        <Car position={[9, -9, 0]} rotation={[Math.PI/2, Math.PI/4, 0]} scale={0.4} />
      </Suspense>

      <Suspense fallback={null}>
        <Dice position={[2.6, 3, 1.4]} rotation={[0, 0, Math.PI/8]} scale={0.4} />
        <Dice position={[3, 1.9, 1.4]} rotation={[0, -Math.PI/2, 0]} scale={0.4} />
      </Suspense>


      <Suspense fallback={null}>
        <CaisseCommunaute position={[-2.4, -2.4, 0.96]} rotation={[-Math.PI/2, -Math.PI/4, 0]} dimension={[2.2*1.1, 0.1, 3*1.1]}/>
      </Suspense>

      {/* Visible uniquement sur mobile : la carte Chance retournée au clic. */}
      {isMobile && (
        <Suspense fallback={null}>
          <ChanceDivice position={[0, -20, 20]} rotation={[-Math.PI/4, Math.PI, 0]} dimension={[2.2, 0.1, 3]}/>
          <ChanceDivice position={[0, 20, 20]} rotation={[Math.PI/4, Math.PI, Math.PI]} dimension={[2.2, 0.1, 3]}/>
          <ChanceDivice position={[20, 0, 20]} rotation={[Math.PI, Math.PI/4, Math.PI/2]} dimension={[2.2, 0.1, 3]}/>
          <ChanceDivice position={[-20, 0, 20]} rotation={[Math.PI, -Math.PI/4, -Math.PI/2]} dimension={[2.2, 0.1, 3]}/>
          {/* <ChanceDivice position={[0, 0, 13]} rotation={[Math.PI/2, 0, 0]} dimension={[2.2, 0.1, 3]}/> */}
        </Suspense>
      )}

      <Suspense fallback={null}>
        <CaisseCommunaute position={[-2.4, -2.4, 1.1]} rotation={[-Math.PI/2, -Math.PI*3/8, 0]} dimension={[2.2*1.1, 0.1, 3*1.1]}/>
      </Suspense>
      {/* Effet néon désactivé : le texte « COMING SOON » est désormais un
          matériau 3D classique (blanc, rugueux), sans émission ni Bloom. */}
      
      <Suspense fallback={null}>
        <B1 position={[-13, 6.5, 0.01]}/>
      </Suspense>
      <Suspense fallback={null}>
        <B1 position={[-13, 6.5, 0.03]} rotation={[-Math.PI/2, Math.PI/16, 0]}/>
      </Suspense>
      <Suspense fallback={null}>
        <B5 position={[-13.2, 3.4, 0.01]} rotation={[-Math.PI/2, 0, 0]}/>
      </Suspense>
      <Suspense fallback={null}>
        <B5 position={[-13.5, 3.2, 0.03]} rotation={[-Math.PI/2, Math.PI/32, 0]}/>
      </Suspense>
      <Suspense fallback={null}>
        <B5 position={[-13.6, 3.1, 0.05]} rotation={[-Math.PI/2, -Math.PI/32, 0]}/>
      </Suspense>

      <Suspense fallback={null}>
        <B20 position={[-12.5, 0, 0.01]} rotation={[-Math.PI/2, Math.PI/32, 0]}/>
      </Suspense>
      <Suspense fallback={null}>
        <B100 position={[-18.2, 0.4, 0.01]} rotation={[-Math.PI/2, 0, 0]}/>
        <B100 position={[-18.5, 0.2, 0.03]} rotation={[-Math.PI/2, Math.PI/32, 0]}/>
        <B100 position={[-18.6, 0.1, 0.05]} rotation={[-Math.PI/2, -Math.PI/32, 0]}/>
      </Suspense>

      <Suspense fallback={null}>
        <AvenueBenevolat position={[-12.5, -4, 0.05]} rotation={[-Math.PI/2, Math.PI/2, 0]}/>
        <AvenueCuration position={[-12.5, -8, 0.05]} rotation={[-Math.PI/2, Math.PI/2, 0]}/>
      </Suspense>

      {/* ------------------------------- bas --------------------------------------- */}
      <Suspense fallback={null}>
        <B10 position={[-5, -10, 0.01]} rotation={[-Math.PI/2, Math.PI/128, 0]}/>
        <B10 position={[-5, -10.2, 0.03]} rotation={[-Math.PI/2, Math.PI/128, 0]}/>
        <B10 position={[-5, -10.4, 0.05]} rotation={[-Math.PI/2, Math.PI/128, 0]}/>
      </Suspense>
      
      <Suspense fallback={null}>
        <B20 position={[-5, -13, 0.01]} rotation={[-Math.PI/2, Math.PI/128, 0]}/>
        <B20 position={[-5, -13.2, 0.03]} rotation={[-Math.PI/2, Math.PI/128, 0]}/>
        <B20 position={[-5, -13.4, 0.05]} rotation={[-Math.PI/2, Math.PI/128, 0]}/>
      </Suspense>

      <Suspense fallback={null}>
        <B50 position={[-0, -10, 0.01]} rotation={[-Math.PI/2, Math.PI/128, 0]}/>
        <B50 position={[-0, -10.2, 0.03]} rotation={[-Math.PI/2, Math.PI/128, 0]}/>
      </Suspense>
      
      <Suspense fallback={null}>
        <B100 position={[-0, -13, 0.01]} rotation={[-Math.PI/2, Math.PI/128, 0]}/>
        <B100 position={[-0, -13.2, 0.03]} rotation={[-Math.PI/2, Math.PI/128, 0]}/>
        <B100 position={[-0, -13.4, 0.05]} rotation={[-Math.PI/2, Math.PI/128, 0]}/>
        <B100 position={[-0, -13.6, 0.07]} rotation={[-Math.PI/2, Math.PI/128, 0]}/>
      </Suspense>
      
      <Suspense fallback={null}>
        <AvenueFlappyIa position={[5, -11, 0.05]} rotation={[-Math.PI/2, 0, 0]}/>
        <AvenueV1Portfolio position={[5, -12.5, 0.1]} rotation={[-Math.PI/2, 0, 0]}/>
        <AvenueVoxBrige position={[5, -14, 0.15]} rotation={[-Math.PI/2, 0, 0]}/>
      </Suspense>

      {/* ------------------------------- haut --------------------------------------- */}
      <Suspense fallback={null}></Suspense>
      <B500 position={[6, 13.6, 0.07]} rotation={[-Math.PI/2, -Math.PI*3/4, 0]}/>
      
      <Suspense fallback={null}>
        <Chance position={[-3, 11.6, 1.85]} rotation={[0, Math.PI/8,-Math.PI/2]}/>
        <CaisseCommunaute position={[-1.45, 11.6, 1.85]} rotation={[0, -Math.PI/8,Math.PI/2]}/>
      </Suspense>

      <Suspense fallback={null}>
        <Chance position={[-4.45, 11.6, 1.85]} rotation={[0, -Math.PI/8,Math.PI/2]}/>
        <Chance position={[-5.90, 11.6, 1.85]} rotation={[0, Math.PI/8,-Math.PI/2]}/>
      </Suspense>

      <Suspense fallback={null}>
        <CaisseCommunaute position={[-3.65, 11.6, 3.7]} rotation={[-Math.PI/2, Math.PI/2, 0]}/>
      </Suspense>

      <Suspense fallback={null}>
        <Chance position={[-3, 11.6, 5.5]} rotation={[0, -Math.PI/8,Math.PI/2]}/>
        <Chance position={[-4.45, 11.6, 5.5]} rotation={[0, Math.PI/8,-Math.PI/2]}/>
      </Suspense>

      {/* ------------------------------- Droite --------------------------------------- */}
      <Suspense fallback={null}>
      <B1 position={[12, 2, 0.025]} rotation={[-Math.PI/2, Math.PI/128, 0]}/>
      <B1 position={[12, 4, 0.016]} rotation={[-Math.PI/2, -Math.PI*35/128, 0]}/>
      <B1 position={[11, 3, 0.021]} rotation={[-Math.PI/2, Math.PI/4, 0]}/></Suspense>

      <Suspense fallback={null}>
        <B10 position={[13, 1, 0.02]} rotation={[-Math.PI/2, Math.PI/2, 0]}/>
        <B10 position={[13, 5, 0.03]} rotation={[-Math.PI/2, Math.PI*100/128, 0]}/>
        <B10 position={[10, 4, 0.01]} rotation={[-Math.PI/2, Math.PI*50/128, 0]}/>
      </Suspense>

      <Suspense fallback={null}>
        <B20 position={[13, 0, 0.019]} rotation={[-Math.PI/2, Math.PI/128, 0]}/>
        <B20 position={[13, -1, 0.017]} rotation={[-Math.PI/2, - Math.PI*86/128, 0]}/>
        <B20 position={[12, -6, 0.015]} rotation={[-Math.PI/2, Math.PI*3/128, 0]}/>
      </Suspense>

      <Suspense fallback={null}>
        <B50 position={[14, 0, 0.035]} rotation={[-Math.PI/2, -Math.PI*39/128, 0]}/>
        <B50 position={[15, 1, 0.04]} rotation={[-Math.PI/2, -Math.PI*13/128, 0]}/>
      </Suspense>

      <Suspense fallback={null}>
        <B100 position={[12, -0, 0.15]} rotation={[-Math.PI/2, Math.PI*68/128, 0]}/>
        <B100 position={[16, -4, 0.03]} rotation={[-Math.PI/2, -Math.PI*17/128, 0]}/>
        <B100 position={[12, 3.4, 0.13]} rotation={[-Math.PI/2, Math.PI*108/128, 0]}/>
      </Suspense>

      <Suspense fallback={null}>
        <PrisonGithub position={[12, -3.4, 0.13]} rotation={[-Math.PI/2, -Math.PI/2, 0]}/>
      </Suspense>

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

      {/* Compteur de tours du plateau : badge en haut au milieu de la page,
          visible à partir du 2e tour complet effectué à la molette. */}
      {lapCount >= 2 && <LapCounter laps={lapCount} />}
    </div>
  );
}

export default Scene;