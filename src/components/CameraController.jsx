import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { gsap } from 'gsap';
import * as THREE from 'three';
import { setCameraBusy } from './case3DAssets';

// Positions clés de la caméra (valeurs de départ). INITIAL_POSITION est la
// position de base face au plateau, AVANT toute rotation : quand la caméra
// est tournée, la vue initiale est cette position pivôtée d'autant autour de
// l'axe vertical Z (cf. returnToInitial).
const INITIAL_POSITION = { px: 0, py: -25, pz: 25 };
const TOP_POSITION = { px: 0, py: 0, pz: 20 };
// Point que la caméra regarde (le centre de la scène)
const CENTER_TARGET = { tx: 0, ty: 0, tz: 0 };

const TWO_PI = Math.PI * 2;

const CameraController = forwardRef(function CameraController({ setView, focusedCase, view, onZoomToCase, onUnfocus, onNavDone, onOpenChatbot, navPhase }, ref) {
  const { camera } = useThree();

  // Le "proxy" est l'état animé par GSAP (position + point regardé).
  // Il est appliqué à la caméra à chaque frame dans useFrame.
  const proxy = useRef({ ...INITIAL_POSITION, ...CENTER_TARGET, roll: 0 });

  // Phase de navigation par flèche en cours ('exit' | 'enter' | null).
  // Passée par une ref : l'effet de focus la lit au moment où la case change,
  // sans que le nettoyage de la phase en fin de navigation ne relance
  // l'animation de zoom.
  const navPhaseRef = useRef(navPhase);
  navPhaseRef.current = navPhase;

  // Vecteur "up" de la caméra (qui pointe vers le haut de l'écran).
  // En vue du dessus, on le fait tourner autour de l'axe Z pour orienter la caméra.
  const upProxy = useRef({ x: 0, y: 0, z: 1 });

  // Angle de rotation (en radians) qui pilote le vecteur "up".
  // C'est lui que GSAP anime pour faire pivoter la caméra en vue du dessus.
  const upAngleProxy = useRef({ z: 0 });

  // Angle cible de la rotation en cours : permet d'éviter de relancer
  // une animation déjà en route vers le même angle.
  const targetAngleRef = useRef(0);

  // Pendant la navigation entre projets, l'orientation de la caméra est
  // prise en charge par un slerp direct (depuis la pose de départ vers la
  // pose de fin, cf. effet de focus) et NON par le pipeline lookAt + rotateZ.
  // Ce quaternion ref sert de surcharge dans useFrame ; null en dehors.
  const quatOverride = useRef(null);

  // Référence vers l'animation GSAP en cours pour pouvoir l'arrêter
  // (kill) si une nouvelle animation est déclenchée avant la fin.
  const currentTween = useRef(null);

  // Verrou de transition : pendant qu'on revient de la vue "case" vers
  // "top" (case désélectionnée), on ignore les autres événements de
  // molette pour éviter d'enchaîner un retour jusqu'à "initial".
  const unfocusingToTop = useRef(false);

  // Verrou de geste molette en vue "top" : un même geste de scroll, même
  // très grand (rafale d'impulsions wheel), ne déclenche qu'une seule
  // rotation. Le minuteur est repoussé à chaque impulsion et libère le
  // geste dès que le flux s'arrête.
  const scrollGestureTimer = useRef(null);

  // Retourne l'angle vers lequel il faut aller pour tourner de "from" à "to"
  // en passant par le chemin le plus court (ex. de 350° à 10° => +20°).
  const getShortestAngleTarget = (from, to) => {
    const delta = THREE.MathUtils.euclideanModulo(to - from + Math.PI, TWO_PI) - Math.PI;
    return from + delta;
  };

  // Le "roll" de la caméra est appliqué après le lookAt (rotateZ autour de
  // l'axe de visée), plutôt qu'en passant par le vecteur "up". C'est ce qui
  // évite le roulis instable des cases tournées : quand on regarde le long de
  // l'axe de rotation, un "up" aligné rendrait le repère de lookAt dégénéré.
  // Ici on garde toujours un "up" de base orthogonal à la direction de visée.
  const syncRollFromAngle = () => {
    if (!proxy.current) return;
    proxy.current.roll = upAngleProxy.current.z;
  };

  // Retour à la vue du dessus : remonte la caméra en conservant le roulis de
  // la case sélectionnée, sauf pour les cases de coin dont on reprend la
  // rotation diagonale vers la rotation cardinale adjacente. Déclenché par
  // la molette, la touche Échap ou un clic dans l'arrière-plan.
  const unfocusToTop = useCallback(() => {
    if (!focusedCase) return;
    if (unfocusingToTop.current) return;
    if (currentTween.current) currentTween.current.kill();
    quatOverride.current = null;

    // On récupère la dernière rotation de la case avant de perdre sa
    // référence : on revient en vue du dessus en conservant ce roulis.
    const lastAngle = focusedCase.rotation?.[2] ?? 0;

    // Cases de coin : le roulis diagonal de la case ne doit pas être conservé
    // au retour en vue du dessus. On aligne la caméra sur la rotation
    // cardinale adjacente (angle du coin → axe de la case de côté voisine),
    // ex. coin [6, 6] à 3π/4 → π/2, coin [6, −6] à π/4 → 0,
    // coin [−6, 6] à −3π/4 → −π, coin [−6, −6] à −π/4 → −π/2.
    const exitAngle =
      focusedCase.type === 'corner'
        ? Math.floor(lastAngle / (Math.PI / 2)) * (Math.PI / 2)
        : lastAngle;
    const currentAngle = upAngleProxy.current.z;

    // On raisonne en chemin le plus court, modulo 2π : si la caméra est déjà
    // alignée sur la rotation de la case (le cas normal en sortie de vue
    // "case"), il n'y a plus aucune rotation à exécuter → pas de temps mort
    // avant que la caméra ne remonte. Évite aussi le tour de 360° quand
    // l'angle interne vaut -π alors que la case est déclarée à +π.
    const alignedAngle = getShortestAngleTarget(currentAngle, exitAngle);
    const sweep = alignedAngle - currentAngle;
    const needsRoll = Math.abs(sweep) > 0.001;

    onUnfocus?.();
    setView('top');
    unfocusingToTop.current = true;

    const rotDuration = needsRoll
      ? Math.min(Math.abs(sweep) / Math.PI, 1) * 0.55
      : 0;

    const tl = gsap.timeline();
    currentTween.current = tl;

    if (needsRoll) {
      tl.to(upAngleProxy.current, {
        z: alignedAngle,
        duration: rotDuration,
        ease: 'power2.inOut',
        overwrite: 'auto',
        onUpdate: syncRollFromAngle,
        onComplete: syncRollFromAngle,
      }, 0);
    } else {
      // Déjà aligné : on synchronise l'angle et le roulis à l'identique.
      upAngleProxy.current.z = alignedAngle;
      syncRollFromAngle();
    }

    // La caméra remonte à la vue du dessus, en conservant le roulis FINAL
    // (rotation de la case, ou rotation cardinale adjacente pour les coins)
    // (roll appliqué via rotateZ après le lookAt).
    tl.to(proxy.current, {
      ...TOP_POSITION,
      ...CENTER_TARGET,
      duration: 0.5,
      ease: 'power2.out',
    }, rotDuration);

    // On relâche le verrou une fois le retour vers "top" terminé.
    tl.eventCallback('onComplete', () => {
      unfocusingToTop.current = false;
    });

    targetAngleRef.current = alignedAngle;
  }, [focusedCase, onUnfocus, setView]);

  // Passage de la vue "initiale" à la vue "du dessus" : la caméra monte
  // au-dessus de la scène. Déclenché par un clic sur le plateau ou une case.
  // Mouvement exactement inverse de la descente (returnToInitial) : la
  // caméra remonte en ligne droite vers la verticale pendant que le "up"
  // bascule du plan de la rotation vers sa cible, sans toucher au roulis —
  // l'orientation du plateau à l'écran reste stable du début à la fin.
  const goToTop = useCallback(() => {
    if (currentTween.current) currentTween.current.kill();
    quatOverride.current = null;

    const tl = gsap.timeline();
    currentTween.current = tl;

    const alreadyTop = view === 'top';

    // Rotation mémorisée (normalisée sur (−π, π], cf. returnToInitial) :
    // en vue initiale elle est portée par la position pivôtée de la caméra,
    // la montée la réexprime en roulis à l'arrivée (voir onComplete).
    upAngleProxy.current.z = THREE.MathUtils.euclideanModulo(
      upAngleProxy.current.z + Math.PI, TWO_PI) - Math.PI;
    const angle = upAngleProxy.current.z;
    const hasRotation = Math.abs(angle) > 0.001;
    targetAngleRef.current = angle;

    // Durées synchronisées en présence de rotation (l'orientation du
    // plateau doit rester exactement stable pendant la montée) ; sinon on
    // garde le rythme d'origine.
    const moveDuration = hasRotation && !alreadyTop ? 0.35 : 0.2;
    const upDuration = hasRotation && !alreadyTop ? 0.35 : 0.4;

    // 1) La caméra monte au-dessus de la scène. Avec rotation : même easing
    //    que le tween du "up" pour que les deux progressions restent
    //    synchronisées (l'orientation du plateau doit rester stable).
    tl.to(proxy.current, {
      ...TOP_POSITION,
      ...CENTER_TARGET,
      duration: moveDuration,
      ...(hasRotation && !alreadyTop ? { ease: 'power2.inOut' } : {}),
    }, 0);

    // 2) On bascule le "up" du plan de la rotation vers sa cible, sauf si on
    //    était déjà en vue du dessus : dans ce cas on garde la rotation.
    if (!alreadyTop) {
      tl.to(upProxy.current, {
        x: -Math.sin(angle), y: Math.cos(angle), z: 0,
        duration: upDuration,
        ease: 'power2.inOut',
        overwrite: 'auto',
      }, 0);
    }

    // 3) La vue "top" n'est activée qu'une fois l'animation terminée. La
    //    caméra est alors à la verticale : bascule de représentation
    //    invisible (up (−sinθ, cosθ, 0) sans roulis ≡ up (0,1,0) avec le
    //    roulis θ) pour retrouver le pipeline standard de la vue top.
    tl.eventCallback('onComplete', () => {
      if (!alreadyTop) {
        upProxy.current.x = 0;
        upProxy.current.y = 1;
        upProxy.current.z = 0;
        proxy.current.roll = angle;
      }
      setView('top');
    });
  }, [setView, view]);

  // Retour de la vue "du dessus" à la vue "initiale" : la caméra redescend
  // face au plateau. Déclenché par un clic sur le fond ou le centre du plateau.
  // La rotation n'est ni déroulée ni animée : elle est reportée sur la
  // géométrie du mouvement. La descente est la copie exacte de la descente
  // "sans rotation", rigidement pivôtée d'un angle θ autour de l'axe
  // vertical Z : la caméra glisse en ligne droite vers la position initiale
  // pivôtée (ex. π/2 => (25, 0, 25)) pendant que le "up" rejoint +Z, le
  // roulis valant 0 sur toute la durée. Le plateau garde ainsi exactement
  // la même orientation à l'écran du début à la fin, sans le moindre salto.
  const returnToInitial = useCallback(() => {
    if (currentTween.current) currentTween.current.kill();
    quatOverride.current = null;
    setView('initial');

    // Rotation courante, normalisée sur (−π, π] : la valeur interne peut
    // avoir accumulé plusieurs tours de molette, or seule sa valeur mod 2π
    // a un effet visuel — la renormalisation est invisible et évite les
    // spins à répétition dans les tweens.
    upAngleProxy.current.z = THREE.MathUtils.euclideanModulo(
      upAngleProxy.current.z + Math.PI, TWO_PI) - Math.PI;
    const angle = upAngleProxy.current.z;
    const hasRotation = Math.abs(angle) > 0.001;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // Position initiale de base pivôtée d'un angle θ autour de Z :
    // ex. (0, -25, 25) avec une rotation de π/2 donne (25, 0, 25).
    const rotatedPx = INITIAL_POSITION.px * cos - INITIAL_POSITION.py * sin;
    const rotatedPy = INITIAL_POSITION.px * sin + INITIAL_POSITION.py * cos;

    // La rotation reste mémorisée (upAngleProxy / targetAngleRef) : la
    // montée vers la vue du dessus la réexprimera en roulis (goToTop).
    targetAngleRef.current = angle;

    const tl = gsap.timeline();
    currentTween.current = tl;

    // Étape 1 (uniquement s'il y a une rotation) : bascule de représentation
    // invisible à l'écran — en pose de dessus, un roulis θ avec up (0,1,0)
    // équivaut PILE à un up (−sinθ, cosθ, 0) sans roulis. Le "up" suit l'ARC
    // (rotation autour de Z) et non la corde : un lerp vectoriel ferait
    // dévier sa direction de façon non linéaire (et passerait par le vecteur
    // nul à θ = π), ce qui faisait vibrer l'image au lieu de la laisser
    // immobile. Un seul tween de progression pilote up + roulis : la
    // compensation est donc exacte à chaque frame.
    const switchAt = hasRotation ? 0.1 : 0;
    if (hasRotation) {
      const switchState = { p: 0 };
      tl.to(switchState, {
        p: 1,
        duration: switchAt,
        ease: 'power2.inOut',
        onUpdate: () => {
          const p = switchState.p;
          upProxy.current.x = -Math.sin(angle * p);
          upProxy.current.y = Math.cos(angle * p);
          upProxy.current.z = 0;
          proxy.current.roll = angle * (1 - p);
        },
      }, 0);
    }

    // Étape 2 : descente — la caméra glisse en ligne droite vers la position
    // initiale pivôtée pendant que le "up" rejoint +Z (mêmes durée et easing
    // pour que la compensation reste exacte en permanence). À l'arrivée, la
    // rotation est entièrement portée par la position pivôtée de la caméra.
    tl.to(proxy.current, {
      px: rotatedPx,
      py: rotatedPy,
      pz: INITIAL_POSITION.pz,
      ...CENTER_TARGET,
      duration: 0.35,
      ease: 'power2.inOut',
    }, switchAt);
    tl.to(upProxy.current, {
      x: 0, y: 0, z: 1,
      duration: 0.35,
      ease: 'power2.inOut',
      overwrite: 'auto',
    }, switchAt);
  }, [setView]);

  // Applique le proxy à la caméra à chaque frame rendue.
  useFrame(() => {
    // Signale au préchargeur qu'une animation est en cours (le tween de la
    // frame passée reste actif, mort ou déjà relancé : isActive est la
    // source de vérité). Pendant ce temps, aucun parsing de modèle lourd
    // n'est lancé, sinon les frames tomberaient pendant les mouvements.
    setCameraBusy(Boolean(currentTween.current?.isActive()));

    const { px, py, pz, tx, ty, tz, roll = 0 } = proxy.current;
    camera.position.set(px, py, pz);

    // Override d'orientation (navigation par flèche) : le quaternion calculé
    // par le slerp remplace entièrement lookAt + rotateZ. C'est ce qui évite
    // que le repère de lookAt (construit autour de l'up fixe (0,1,0) et
    // dégénéré près de l'axe Y) ne génère une rotation parasite sur Z quand
    // le regard change d'axe du plateau.
    if (quatOverride.current) {
      camera.quaternion.copy(quatOverride.current);
      return;
    }

    camera.up.set(upProxy.current.x, upProxy.current.y, upProxy.current.z);
    camera.lookAt(tx, ty, tz);
    // Roulis appliqué APRÈS le lookAt, autour de l'axe de visée : l'"up"
    // reste toujours orthogonal à la direction de visée, donc le repère de
    // lookAt ne devient jamais dégénéré quand on regarde le long de l'axe
    // de rotation d'une case.
    camera.rotateZ(roll);
  });

  // En vue "top", la molette fait pivoter la caméra par pas de Math.PI/2
  // autour de l'axe vertical : scroller vers l'avant (+deltaY) tourne d'un
  // quart de tour positif, vers l'arrière (-deltaY) d'un quart de tour négatif.
  // On part de la cible précédente (targetAngleRef, toujours multiple de π/2)
  // et non de la valeur vivante : si un second scroll interrompt l'animation,
  // la cible cumule les quarts de tour et la caméra ne se fige jamais sur un
  // angle intermédiaire.
  const rotateBy = useCallback((delta) => {
    if (currentTween.current) currentTween.current.kill();
    quatOverride.current = null;

    const target = targetAngleRef.current + delta;
    targetAngleRef.current = target;

    const tl = gsap.timeline();
    currentTween.current = tl;
    tl.to(upAngleProxy.current, {
      z: target,
      duration: 0.5,
      ease: 'power2.inOut',
      overwrite: 'auto',
      onUpdate: syncRollFromAngle,
      onComplete: syncRollFromAngle,
    });
  }, []);

  // La molette ne sert plus à basculer entre les vues "initiale" et "du dessus" :
  // ces transitions se font uniquement par clic. En vue "case", scroller vers le
  // haut reste le geste pour revenir à la vue du dessus.
  useEffect(() => {
    const handleScroll = (event) => {
      // Pendant la transition de retour vers "top", on ignore la molette.
      if (unfocusingToTop.current) return;

      // En vue "top", la molette fait tourner la caméra d'un quart de tour
      // dans un sens ou dans l'autre selon la direction du scroll. Un geste
      // déjà en cours (gros scroll = plusieurs impulsions) est ignoré et son
      // verrou est repoussé : il faut un nouveau geste, petit ou grand, pour
      // déclencher la rotation suivante.
      if (view === 'top' && !focusedCase) {
        if (scrollGestureTimer.current) {
          clearTimeout(scrollGestureTimer.current);
          scrollGestureTimer.current = setTimeout(() => {
            scrollGestureTimer.current = null;
          }, 300);
          return;
        }
        rotateBy(event.deltaY > 0 ? Math.PI / 2 : -Math.PI / 2);
        scrollGestureTimer.current = setTimeout(() => {
          scrollGestureTimer.current = null;
        }, 300);
        return;
      }

      // Quand une case est sélectionnée, le seul geste possible est de
      // scroller vers le haut pour revenir à la vue du dessus.
      if (focusedCase) {
        if (event.deltaY > 0) return;
        unfocusToTop();
      }
    };

    window.addEventListener('wheel', handleScroll);
    return () => {
      window.removeEventListener('wheel', handleScroll);
      if (scrollGestureTimer.current) clearTimeout(scrollGestureTimer.current);
    };
  }, [focusedCase, unfocusToTop, view, rotateBy]);

  // Quand une case est cliquée : la caméra se rapproche face à elle,
  // puis glisse selon l'axe correspondant à la rotation de la case.
  useEffect(() => {
    if (!focusedCase) return;
    if (unfocusingToTop.current) unfocusingToTop.current = false; // on relâche le verrou en cas de nouvelle sélection
    if (currentTween.current) currentTween.current.kill();
    quatOverride.current = null;

    const [x, y, z] = focusedCase.position;
    const rotation = focusedCase.rotation?.[2] ?? 0;

    // On choisit le chemin de rotation le plus court vers cet angle.
    const animatedTarget = getShortestAngleTarget(upAngleProxy.current.z, rotation);

    // Case d'angle : la caméra zoome face à la case tout en roulant pour
    // s'aligner sur sa rotation, puis à la fin de l'animation on ouvre la
    // destination de la case : le chatbot (présentation de Baptiste) pour
    // la case Départ, la page cible pour les autres. Pas de glisse de
    // "l'étape 2" : les angles des coins ne correspondent à aucun axe
    // cardinal, la glisse n'aurait pas de direction valide.
    if (focusedCase.type === 'corner') {
      const tl = gsap.timeline();
      currentTween.current = tl;

      if (Math.abs(animatedTarget - targetAngleRef.current) > 0.001) {
        targetAngleRef.current = animatedTarget;
        tl.to(upAngleProxy.current, {
          z: animatedTarget,
          duration: 0.6,
          ease: 'power2.inOut',
          overwrite: 'auto',
          onUpdate: syncRollFromAngle,
          onComplete: syncRollFromAngle,
        }, 0);
      }

      tl.to(proxy.current, {
        px: x,
        py: y,
        pz: z + 7.5,
        tx: x, ty: y, tz: z,
        duration: 1.1,
        ease: 'power3.inOut',
        onComplete: () => {
          if (focusedCase.chatbot) {
            onOpenChatbot?.();
          } else {
            window.open(focusedCase.url ?? 'https://www.google.com', '_blank', 'noopener');
          }
        },
      }, 0);

      return;
    }


    const tol = 0.01;
    let dx = 0;
    let dy = 0;
    let dtx = 0;
    let dty = 0;
    if (Math.abs(rotation) < tol) {
      dy = 1;
      dty = 100;
    } else if (Math.abs(Math.abs(rotation) - Math.PI) < tol) {
      dy = -1;
      dty = -100;
    } else if (Math.abs(rotation - Math.PI / 2) < tol) {
      dx = -1;
      dtx = -100;
    } else if (Math.abs(rotation + Math.PI / 2) < tol) {
      dx = 1;
      dtx = 100;
    }

    const SLIDE_DISTANCE = 1;

    const tl = gsap.timeline();
    currentTween.current = tl;

    // Navigation par flèche (arrivée du projet suivant) : on ne rejoue PAS la
    // séquence complète "zoom face à la case puis glisse", qui ferait repasser
    // par une vue 3D de la case avant de réafficher la description.
    if (navPhaseRef.current === 'enter') {
      // Endroit exact de la "vue description" du projet suivant (position de
      // fin de l'Étape 2 de la sélection classique).
      const endPx = (x * dx**2) + dx * SLIDE_DISTANCE;
      const endPy = (y * dy**2) + dy * SLIDE_DISTANCE;
      const endPz = z + 3;

      // Pose de fin = orientation d'une sélection classique de cette case :
      // lookAt final (cible sur l'axe du plateau) + roulis aligné, appliqué
      // autour de l'axe de visée (l'équivalent de rotateZ).
      const endQuat = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().lookAt(
          new THREE.Vector3(endPx, endPy, endPz),
          new THREE.Vector3(dtx, dty, 0),
          new THREE.Vector3(0, 1, 0)
        )
      );
      endQuat.multiply(new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        animatedTarget
      ));

      // Pose de départ : l'orientation actuelle de la caméra, quelle qu'elle
      // soit (vue description, fin de sélection, etc.).
      const startQuat = camera.quaternion.clone();

      // La position et l'orientation sont animées indépendamment : la
      // translation vient du proxy, l'orientation d'un slerp du quaternion
      // (plus courte rotation possible de la pose de départ à la pose de
      // fin). Aucun passage par lookAt en cela : le repère de lookAt (up fixe
      // (0,1,0), dégénéré près de l'axe Y) ne peut plus générer de rotation
      // parasite sur Z pendant le changement d'axe — le regard vire de l'axe
      // X vers l'axe Y (ou l'inverse) d'un seul mouvement continu.
      const quatState = { t: 0 };
      quatOverride.current = new THREE.Quaternion();
      quatOverride.current.copy(startQuat);

      // La cible du proxy est figée à la pose de fin dès maintenant (sans
      // tween) : l'orientation vient du slerp pendant le mouvement, et le
      // lookAt reprend pile sur cette pose à la fin, sans saut.
      proxy.current.tx = dtx;
      proxy.current.ty = dty;
      proxy.current.tz = 0;
      // Roulis final synchronisé : upAngleProxy/targetAngleRef restent
      // cohérents pour les allez-retours case/top ultérieurs.
      proxy.current.roll = animatedTarget;
      upAngleProxy.current.z = animatedTarget;
      targetAngleRef.current = animatedTarget;

      tl.to(proxy.current, {
        px: endPx,
        py: endPy,
        pz: endPz,
        duration: 1.4,
        ease: 'power2.inOut',
      }, 0);
      tl.to(quatState, {
        t: 1,
        duration: 1.4,
        ease: 'power2.inOut',
        onUpdate: () => {
          quatOverride.current?.slerpQuaternions(startQuat, endQuat, quatState.t);
        },
      }, 0);

      // Fin du mouvement caméra : on rend la main au pipeline lookAt
      // standard et on purge la transition.
      tl.eventCallback('onComplete', () => {
        quatOverride.current = null;
        onNavDone?.();
      });
      return;
    }

    // Sélection classique (clic sur une case depuis la vue du dessus).

    // Rotation d'abord : si la case suivante est sur un autre côté du
    // plateau, la caméra pivote (chemin le plus court = dans le sens du
    // côté visé) AVANT de se déplacer vers elle.
    let moveAt = 0;
    if (Math.abs(animatedTarget - targetAngleRef.current) > 0.001) {
      moveAt = 0.6;
      targetAngleRef.current = animatedTarget;
      tl.to(upAngleProxy.current, {
        z: animatedTarget,
        duration: 0.6,
        ease: 'power2.inOut',
        overwrite: 'auto',
        onUpdate: syncRollFromAngle,
        onComplete: syncRollFromAngle,
      }, 0);
    }

    // Étape 1 : zoom face à la case.
    tl.to(proxy.current, {
      px: x,
      py: y,
      pz: z + 3,
      tx: x, ty: y, tz: z,
      duration: 0.8,
      ease: 'power3.inOut',
      onComplete: () => onZoomToCase?.(),
    }, moveAt)
    // Étape 2 : glisse le long de l'axe de la rotation, regard fixé vers le haut,
    // et roule la caméra pour l'aligner sur la rotation de la case.
    .to(proxy.current, {
      px: (x * dx**2) + dx * SLIDE_DISTANCE,
      py: (y * dy**2) + dy * SLIDE_DISTANCE,
      pz: z + 3,
      tx: dtx, ty: dty, tz: 0,
      duration: 3,
      ease: 'power3.inOut',
    }, moveAt + 0.8);
  }, [focusedCase, onZoomToCase, onOpenChatbot]);

  // Touche Échap (en vue "case") : revient à la vue du dessus.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') unfocusToTop();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [unfocusToTop]);

  // Expose le retour à la vue du dessus pour les clics d'arrière-plan
  // (appelés depuis Scene sur le plateau / le fond), plus l'arrêt d'urgence
  // des animations en cours (glisse de fin d'Étape 2, potentiellement longue).
  useImperativeHandle(ref, () => ({
    returnToTop: unfocusToTop,
    goToTop,
    returnToInitial,
    stopAnimation: () => {
      if (currentTween.current) currentTween.current.kill();
    },
  }));

  return null;
});

export default CameraController;
