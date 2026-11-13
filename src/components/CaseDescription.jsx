import { Suspense, useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF} from '@react-three/drei';
import { gsap } from 'gsap';

import { SwapCards } from './SwapCards';

// Fait apparaître ses enfants en douceur (scale 0 -> 1) au lieu d'un pop
// brutal, au cas où un chargement n'était pas terminé (connexion lente).
// On anime un <group> externe sans prop "scale" : r3f ne réécrase donc pas
// la valeur animée quand le composant parent se re-render.
export function Entrance({ children }) {
  const ref = useRef();

  useLayoutEffect(() => {
    const group = ref.current;
    if (!group) return;
    group.scale.setScalar(0);
    const tween = gsap.to(group.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: 0.35,
      ease: 'power2.out',
    });
    return () => {
      tween.kill();
    };
  }, []);

  return <group ref={ref}>{children}</group>;
}

// Distance (en unités monde) parcourue par l'animation de glisse : assez
// grande pour sortir complètement du champ de la caméra (ou en venir).
const SLIDE_DISTANCE = 8;
const SLIDE_DURATION = 0.5;

// Glisse ses enfants hors du champ ou depuis le hors-champ jusqu'à leur
// position, pendant la navigation entre deux projets via les flèches.
// transition : { direction: -1 | 1, phase: 'exit' | 'enter' }, où
// +1 = flèche droite, -1 = flèche gauche :
// - phase 'exit' : la description sort vers le côté OPPOSÉ à la flèche ;
// - phase 'enter' : la suivante arrive depuis le côté de la flèche.
// Le côté de l'écran correspond en monde à (cos roll, sin roll) : la caméra
// regarde le plateau le long de l'axe -Z avec un roulis aligné sur la
// rotation de la case (roll appliqué par rotateZ après le lookAt).
export function SlideGroup({ transition, caseRotation = 0, children }) {
  const ref = useRef();

  useLayoutEffect(() => {
    const group = ref.current;
    if (!group || !transition) return undefined;

    const { direction, phase } = transition;
    const dirX = Math.cos(caseRotation);
    const dirY = Math.sin(caseRotation);
    const setOffset = (t) => group.position.set(t * dirX, t * dirY, 0);

    // Sortie : on part de la position normale vers le bord opposé.
    // Entrée : on démarre au bord du côté de la flèche et on revient à 0.
    const proxy = { t: phase === 'enter' ? direction * SLIDE_DISTANCE : 0 };
    setOffset(proxy.t);
    const tween = gsap.to(proxy, {
      t: phase === 'exit' ? -direction * SLIDE_DISTANCE : 0,
      duration: SLIDE_DURATION,
      ease: 'power2.inOut',
      onUpdate: () => setOffset(proxy.t),
    });
    return () => {
      tween.kill();
    };
  }, [transition, caseRotation]);

  return <group ref={ref}>{children}</group>;
}

function SpinningCube({ glbUrl, spinAxis = 'y', rotation = [Math.PI / 2, 0, 0], position = [0, 2.2, 3], scale = 0.9 }) {
  const ref = useRef();
  const { scene } = useGLTF(glbUrl);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation[spinAxis] += delta;
  });

  return (
    <group position={position}>
      <Entrance>
        <primitive
          ref={ref}
          object={scene}
          rotation={rotation}
          scale={scale}
          castShadow
          receiveShadow
          onClick={(e) => e.stopPropagation()}
        />
      </Entrance>
    </group>
  );
}

// Description 3D générique d'une case : cube qui tourne + carte de description.
// Les valeurs par défaut correspondent à la case Memory.
// Le cube n'est rendu que si la case possède un modèle GLB (glbUrl défini) :
// certaines cases (ex. loisir) n'ont pas encore de modèle 3D, seulement une carte.
export default function CaseDescription({ glbUrl, descriptionUrl, cube = {}, card = {}, transition, caseRotation }) {
  return (
    <SlideGroup transition={transition} caseRotation={caseRotation}>
      {glbUrl && (
        <Suspense fallback={null}>
          <SpinningCube glbUrl={glbUrl} {...cube} />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <group position={[1, -1, 3.4]}>
          <Entrance>
            <SwapCards textureUrl={descriptionUrl} {...card} />
          </Entrance>
        </group>
      </Suspense>
    </SlideGroup>
  );
}
