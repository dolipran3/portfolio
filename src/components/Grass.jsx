import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ============================================================================
   GRASS — herbe instanciée autour du plateau
   ----------------------------------------------------------------------------
   Pourquoi cette approche et pas d'autre :
   - Un <instancedMesh> dessine TOUS les brins en UN SEUL draw call. Même des
     milliers de brins coûtent donc quasiment rien au GPU (vs. 1 draw call par
     <Clone> comme pour les arbres, qui reste raisonnable pour 8 arbres mais
     pas pour 2000 brins).
   - Les positions aléatoires sont générées UNE fois dans un useMemo : si le
     tirage était fait pendant le rendu, chaque re-render (hover des cases,
     changement de vue...) redistribuerait toute l'herbe. Règle React : le
     random sort du cycle de rendu.
   - Le vent est recalculé côté CPU dans useFrame en réécrivant la matrice de
     chaque instance. C'est O(nombre de brins) par frame, très suffisant pour
     ~2 à 3 mille brins. (Au-delà, la suite logique serait d'animer les brins
     dans le vertex shader, mais ce projet n'a aucun shader custom et ce n'est
     pas nécessaire à cette échelle.)

   ⚠ Convention du projet : le monde est « Z-up » (l'axe vertical est Z, cf.
   CameraController : up = {0,0,1}). Un cône Three.js pointe par défaut vers
   +Y : on le redresse donc avec une rotation de π/2 sur X pour qu'il pousse
   le long de +Z, comme l'herbe doit le faire sur ce sol.
   ============================================================================ */

/* ---------------------------------------------------------------------------
   RÉGLAGES (tout se règle ici, le composant n'a aucune prop)
   --------------------------------------------------------------------------- */

// Anneau d'herbe : rayon minimum et maximum autour du centre de la scène.
// Les cases occupent tout le carré |x| ≤ 7.5 / |y| ≤ 7.5 (plateau 9×9 jusqu'à
// 4.5, cases 3×3 en bordure jusqu'à 7.5) : la zone libre commence donc à ~8.
const GRASS_RING = {
  inner: 8,   // à l'extérieur des cases
  outer: 14,  // jusqu'aux arbres (posés à 10-16 du centre)
};

// Nombre total de brins. Point de réglage perf principal : si le FPS baisse
// (cf. <Stats /> déjà présent dans la scène), réduire ce nombre d'abord.
const GRASS_COUNT = 1000;

// Forme d'un brin : cône triangulaire (3 segments radiaux = 3 faces), très
// low-poly, cohérent avec le style de la scène. Tip en +Y avant redressement.
const BLADE = {
  radius: 0.05,
  height: 0.6,
};

// Position des troncs d'arbres (cf. Trees() dans Scene.jsx) : on évite de
// planter des brins dans les troncs.
const TREE_POSITIONS = [
  [10, 0], [15, 3], [-14, 6], [-13, -3],
  [-16, 5], [0, 10], [0, -12], [3, -15],
];
const TREE_TRUNK_RADIUS = 0.9;

// Le vent : c'est une oscillation sinusoïdale (chaque brin penche puis
// revient) dont la phase est décalée par la POSITION du brin le long de la
// direction du vent → la rafale « traverse » la prairie au lieu de tout
// faire bouger en même temps (impossible côté réel, effet immédiatement
// reconnaissable comme du vent).
const WIND = {
  angle: 0.8,       // direction du vent dans le plan du sol (radians)
  speed: 1.6,       // fréquence d'oscillation d'un brin (rad/s)
  strength: 0.14,   // inclinaison maximale (radians) : subtile, sinon c'est du blé
  waveLength: 0.35, // « spatialité » de la vague : plus grand = vagues plus larges
  gustSpeed: 0.3,   // vitesse des rafales globales (le vent souffle par à-coups)
};

// const GRASS_BASE_COLOR = '#4d9a47';
const GRASS_BASE_COLOR = '#219ebc';

// Distance (cos/sin précalculés) : projeter [x,y] sur la direction du vent
// donne le déphasage de la vague pour ce brin (vent cohérent, cf. commentaire
// sur WIND).
const WIND_DIR_X = Math.cos(WIND.angle);
const WIND_DIR_Y = Math.sin(WIND.angle);

/* ---------------------------------------------------------------------------
   GÉNÉRATION — positions et caractéristiques fixes de chaque brin
   --------------------------------------------------------------------------- */

// Tire une position au hasard dans l'anneau, ou null si elle est occupée
// (plateau + cases, ou tronc d'arbre).
function sampleGroundPosition() {
  const { inner, outer } = GRASS_RING;
  const angle = Math.random() * Math.PI * 2;
  // Racine carrée sur le rayon : répartition uniforme en SURFACE du disque.
  // Sans elle, les brins s'accumuleraient au centre (pi bias classique).
  const radius = Math.sqrt(
    THREE.MathUtils.lerp(inner * inner, outer * outer, Math.random())
  );
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;

  // Terres occupées : plateau + 16 cases = tout le carré |x|,|y| ≤ 7.5
  // (+ une marge de 0.1 pour ne pas voir de brins affleurer les bords).
  if (Math.abs(x) < 7.6 && Math.abs(y) < 7.6) return null;

  // Pas de brins dans les troncs d'arbres.
  for (const [tx, ty] of TREE_POSITIONS) {
    const dx = x - tx;
    const dy = y - ty;
    if (dx * dx + dy * dy < TREE_TRUNK_RADIUS * TREE_TRUNK_RADIUS) return null;
  }

  return { x, y };
}

// Crée le tableau de brins : chaque entrée est immuable (créée une seule
// fois), seule la matrice d'instance se met à jour dans useFrame.
function generateBlades() {
  const blades = new Array(GRASS_COUNT);
  let placed = 0;
  // Garde-fou : on abandonne après trop d'essais (au cas où l'anneau deviendrait
  // trop étroit pour GRASS_COUNT brins), sinon boucle infinie.
  let attempts = 0;

  while (placed < GRASS_COUNT && attempts < GRASS_COUNT * 20) {
    attempts++;
    const pos = sampleGroundPosition();
    if (!pos) continue;

    // Caractère « naturel » : chaque brin a sa taille, son inclinaison
    // max (flex), son déphasage (phase) et sa teinte (tint) propres —
    // du bruit pur, appliqué ensuite sans plus jamais être régénéré.
    blades[placed++] = {
      x: pos.x,
      y: pos.y,
      yaw: Math.random() * Math.PI * 2,   // rotation autour de son axe : variété de silhouette
      width: 0.5 + Math.random() * 0.6,   // épaisseur relative
      height: 1.7 + Math.random() * 0.7,  // hauteur relative
      flex: 0.6 + Math.random() * 0.8,    // souplesse : amplifie son balancement
      phase: Math.random() * Math.PI * 2, // déphasage propre (brins désynchronisés)
      tint: Math.random() - 0.5,          // variation de couleur [+ vert clair, - vert foncé]
    };
  }

  // Si le garde-fou a tronqué, on renvoie juste moins de brins.
  return blades.slice(0, placed);
}

/* ---------------------------------------------------------------------------
   COMPOSANT
   --------------------------------------------------------------------------- */

export function Grass() {
  const meshRef = useRef();

  // Helpers créés une fois (useMemo) : un Object3D sert de « fabrique de
  // matrices » (on y règle position/rotation/scale, il compose la matrice),
  // un Color sert à écrire les couleurs d'instance.
  // ⚠ rotation.order = 'ZYX' : par défaut Three.js applique les rotations
  // d'Euler au vecteur dans l'ordre Z puis Y puis X ('XYZ' inversé). Ici l'axe
  // vertical est Z et le brin est redressé par rotation X (π/2) : si le yaw
  // (rotation Z) était appliqué EN PREMIER, il inclinerait l'axe +Y du cône
  // DANS LE PLAN DU SOL avant le redressement → brins couchés. Avec 'ZYX',
  // le redressement X est appliqué en premier, et le yaw Z est joué en
  // dernier : le brin, une fois vertical, tourne autour de son propre axe.
  const dummy = useMemo(() => {
    const d = new THREE.Object3D();
    d.rotation.order = 'ZYX';
    return d;
  }, []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  // Les brins : générés UNE fois pour la vie du composant (cf. commentaire
  // intro : le random ne doit pas dépendre des re-renders).
  const blades = useMemo(() => generateBlades(), []);

  // Réglages faits UNE fois au montage :
  useEffect(() => {
    const mesh = meshRef.current;

    // instanceMatrix est réécrite à chaque frame → marquer le buffer comme
    // « dynamique » évite des optimisations cache-CPU inutiles côté WebGL.
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Couleur par brin : setColorAt crée instanceColor (une couleur par
    // instance), multipliée automatiquement avec la couleur du matériau.
    // C'est le moyen le moins cher d'obtenir un vert hétérogène.
    for (let i = 0; i < blades.length; i++) {
      const blade = blades[i];
      tmpColor.set(GRASS_BASE_COLOR);
      tmpColor.offsetHSL(
        blade.tint * 0.02,   // hue : nuance légèrement différente
        blade.tint * 0.05,   // saturation
        blade.tint * 0.08    // lightness : du vert clair au vert foncé
      );
      mesh.setColorAt(i, tmpColor);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // blades est stable (useMemo) et tmpColor aussi : l'effet ne tourne
    // qu'une seule fois, c'est voulu.
  }, [blades, tmpColor]);

  // LE VENT : recalcul de la matrice de chaque brin à chaque frame.
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const mesh = meshRef.current;

    // Gust = rafale globale : tout le vent est assombri/renforcé lentement
    // (lent vs rapide des brins → sensation de souffle organique).
    const gust = 0.6 + 0.4 * Math.sin(time * WIND.gustSpeed);

    for (let i = 0; i < blades.length; i++) {
      const blade = blades[i];

      // Déphasage de la vague pour CE brin : décalé par sa distance le long
      // de la direction du vent → la rafale traverse visiblement la zone.
      const alongWind = blade.x * WIND_DIR_X + blade.y * WIND_DIR_Y;

      // Deux oscillations légèrement désaccordées (vitesses 1 et 0.83,
      // déphasés) : superposées elles donnent un balancement moins
      // mécanique qu'une seule sinusoïde.
      const waveX = Math.sin(time * WIND.speed + blade.phase + alongWind * WIND.waveLength);
      const waveY = Math.sin(time * WIND.speed * 0.83 + blade.phase * 1.7);

      // Inclinaison du brin = amplitude du vent × rafale × souplesse du brin.
      const leanX = WIND.strength * gust * waveX * blade.flex;
      const leanY = WIND.strength * gust * waveY * blade.flex * 0.6;

      // Le cône est centré sur sa position : il faut donc remonter la moitié
      // de sa hauteur, sinon la moitié du brin serait sous le plan. ×0.8 = on
      // enterre volontairement le pied à 20 %, pour qu'aucun « vide » n'apparaisse
      // entre le brin et le sol pendant l'oscillation du vent.
      dummy.position.set(
        blade.x,
        blade.y,
        blade.height * BLADE.height * 0.4
      );

      // π/2 sur X redresse le cône (+Y → +Z, monde Z-up), appliqué EN PREMIER
      // grâce à l'ordre d'Euler 'ZYX' du dummy (cf. commentaire du useMemo).
      // Le vent ajoute ensuite leanX/leanY, et le yaw Z est appliqué en
      // dernier autour de l'axe du brin (vertical à ce moment-là) : variété
      // de silhouette sans jamais le coucher.
      dummy.rotation.set(Math.PI / 2 + leanX, leanY, blade.yaw);

      // Échelle anisotrope : width sur X/Z (épaisseur locale du cône,
      // avant redressement) et height sur Y (sa longueur, axe encore
      // local +Y).
      dummy.scale.set(blade.width, blade.height, blade.width);

      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    // Prévient Three.js que le buffer d'instances a changé : sans ça, rien
    // ne bougerait à l'écran (le GPU garderait l'ancien buffer/cache).
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, blades.length]}
      // Raycast désactivé : l'herbe ne doit JAMAIS intercepter les clics
      // (le sol sert de navigation caméra via handleBackgroundClick /
      // onPointerMissed dans Scene.jsx). Sans ça, cliquer « dans l'herbe »
      // serait avalé par les brins.
      raycast={() => null}
      // Pas de frustum culling maison : le culling par défaut d'un
      // instancedMesh utilise la bounding sphere de la GÉOMÉTRIE de base
      // (un petit cône centré sur l'origine), pas celle des instances —
      // l'herbe disparaîtrait de façon visible dès que le cône sort du champ.
      frustumCulled={false}
      // Ni castShadow ni receiveShadow volontairement : la lumière de la
      // scène est un pointLight castShadow (shadow map en CUBE = 6 passes
      // de rendu) ; 2000 brins projeteurs exploseraient ce coût pour un
      // gain visuel invisible à cette taille de brins.
    >
      <coneGeometry args={[BLADE.radius, BLADE.height, 3]} />
      <meshStandardMaterial
        color={GRASS_BASE_COLOR}
        roughness={0.9}
        // flatShading : facettes nettes volontaires, dans le style low-poly
        // du reste de la scène.
        flatShading
      />
    </instancedMesh>
  );
}

export default Grass;
