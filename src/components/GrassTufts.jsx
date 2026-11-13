import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Clone } from '@react-three/drei';
import * as THREE from 'three';
// Fusionne plusieurs BufferGeometry en UNE SEULE (cf. makeTuftGeometry) :
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/* ============================================================================
   GRASS TUFTS — OPTION A : touffes clonées (<Clone>), à comparer à Grass.jsx
   ----------------------------------------------------------------------------
   Le principe : UNE géométrie de touffe (un bouquet de brins fusionnés en un
   seul mesh, donc UN draw call par touffe), créée une seule fois, puis
   clonée ~60 fois via <Clone>, exactement comme les arbres de Scene.jsx
   (<Clone object={scene} position={...} />).

   Ce qui change par rapport à l'option B (Grass.jsx, instancedMesh) :
   - option A : 60 touffes = 60 draw calls, ~1000 brins « en bouquets ».
     Visuel plus massif / stylisé, groupé. Chaque touffe partage la géométrie
     ET le matériau — les clones ne dupliquent rien de lourd.
   - option B : 1 seul draw call, 2200 brins individuels éparpillés.

   ⚠ Pourquoi la touffe est construite en code et pas tirée d'un GLB : le GLB
   disponible dans ce projet (arbre_low_poly.glb) est un arbre, et l'asset du
   repo d'inspiration (grass-scene.glb) est un TERRAIN ENTIER (5.4 Mo, sol +
   rochers + pin) conçu pour être semé par instancing à l'exécution — pas
   clonable tel quel. Le mécanisme reste néanmoins identique à un GLB : un
   objet unique, une géométrie partagée, un matériau partagé. Si un vrai
   modèle d'artiste arrive un jour, il suffit de le passer en <Clone> à la
   place. (TODO d'un jour : remplacer makeTuftGeometry() par
   useGLTF('/touffe.glb').)

   🔧 Inspiration & crédit : la logique de placement (PRNG seedé → layout
   identique à chaque reload) est inspirée du repo stylized-components de
   Christian Ortiz (cortiz), licence MIT :
   https://github.com/cortiz2894/stylized-components
   Ce repo fait « mieux » pour un champ d'herbe (ses brins sont semés par
   sampling pondéré par aire des triangles du sol, un cousin du système
   instanced de notre option B), mais ce composant explore volontairement
   l'option A : peu d'instances, de gros objets.

   ⚠ Convention du projet : monde « Z-up » (cf. CameraController). La touffe
   est construite DIRECTEMENT en espace Z-up (brins le long de +Z) :
   contrairement à un GLB d'artiste (Y-up, pivoté de π/2 comme les arbres),
   aucune rotation de base n'est nécessaire, et le balancement du vent se
   fait par rotation des groupes de placement — petits angles seulement, pas
   de piège d'ordre d'Euler (cf. le commentaire détaillé dans Grass.jsx).
   ============================================================================ */

/* ---------------------------------------------------------------------------
   RÉGLAGES — volontairement identiques à Grass.jsx partout où c'est possible :
   les deux fichiers doivent couvrir LA MÊME ZONE pour permettre une
   comparaison directe en basculant GRASS_MODE dans Scene.jsx.
   (Chaque fichier garde ses propres constantes pour rester lisible seul ;
   si tu modifies les zones, pense aux deux fichiers.)
   --------------------------------------------------------------------------- */

// Anneau d'herbe : rayons min/max autour du centre (identiques à Grass.jsx).
const GRASS_RING = { inner: 8, outer: 14 };

// 10 touffes de 220 à 280 
// les 2200 brins de l'option B, mais regroupés en bouquets.
const TUFT_COUNT = 10;
const TUFT_BLADES = { min: 220, max: 280 };

// Un brin = le MÊME cône que Grass.jsx (comparaison équitable à taille égale).
const BLADE = { radius: 0.05, height: 0.6 };

// Taille d'une touffe : rayon du bouquet, et plage d'échelle globale
// appliquée aux clones. C'est le levier visuel principal de l'option A : des
// bouquets plus épais que des brins isolés.
const TUFT = { radius: 1.45, scaleMin: 0.8, scaleMax: 1.6 };

// Espacement minimum entre touffes : sinon le hasard crée des amas qui se
// chevauchent. L'option B (brins fins) n'a pas ce souci, d'où l'absence du
// paramètre dans Grass.jsx.
const TUFT_SPACING = 1.5;

// Position des troncs d'arbres (copie de Grass.jsx — même liste que Trees()).
const TREE_POSITIONS = [
  [10, 0], [15, 3], [-14, 6], [-13, -3],
  [-16, 5], [0, 10], [0, -12], [3, -15],
];
const TREE_TRUNK_RADIUS = 0.9;

// Le vent : MÊMES CONSTANTES que Grass.jsx (comparer à paramètres égaux).
// En option A on balance la touffe ENTIÈRE (rotation rigide), pas brin par
// brin — c'est une des différences visuelles attendues vs option B.
const WIND = {
  angle: 0.8,       // direction du vent dans le plan du sol (radians)
  speed: 1.6,       // fréquence d'oscillation (rad/s)
  strength: 0.14,   // inclinaison maximale d'un brin (cf. Grass.jsx)
  waveLength: 0.35, // « spatialité » de la vague qui traverse la zone
  gustSpeed: 0.3,   // vitesse des rafales globales
  // Amplitude relative du balancement d'une touffe entière : une grosse
  // touffe qui bascule serait immédiatement fausse — on réduit donc l'angle
  // donné par strength d'un quart.
  swayFactor: 0.25,
};

const GRASS_BASE_COLOR = '#219ebc';
// const GRASS_BASE_COLOR = '#4d9a47';

// Seed du PRNG : change LA valeur → tout le layout change, mais de façon
// reproductible. (Aucun Math.random direct dans ce fichier, par design.)
const SEED = 42;

const WIND_DIR_X = Math.cos(WIND.angle);
const WIND_DIR_Y = Math.sin(WIND.angle);

/* ---------------------------------------------------------------------------
   PRNG SEEDED — repris du repo stylized-components (utils/scatter.ts).
   Utilité ici : les touffes sont reconstruites si le composant remonte. Le
   PRNG seedé garantit que la prairie garde exactement la même forme à chaque
   montée / reload — indispensable si tu dois « caler » visuellement des
   touffes autour des arbres.
   --------------------------------------------------------------------------- */
function seededLcg(seed) {
  let s = (seed | 0) || 1;
  return () => {
    s = (s * 1664525 + 1013944223) >>> 0;
    return s / 0xffffffff;
  };
}

/* ---------------------------------------------------------------------------
   GÉNÉRATION DE LA TOUFFE (la « géométrie partagée »)
   --------------------------------------------------------------------------- */

// Construit UNE touffe : un bouquet de brins (cônes) fusionnés en UNE SEULE
// BufferGeometry. Toutes les touffes partagent cette géométrie (et un seul
// matériau) → chaque clone = 1 mesh + 1 draw call, rien de dupliqué.
//
// ⚠ Euler : même piège que Grass.jsx — rotation.order 'ZYX' pour que le
// redressement X (π/2) s'applique AVANT le yaw Z, sinon brins couchés
// (commentaire détaillé dans Grass.jsx).
function makeTuftGeometry() {
  // Seed distinct de celui du placement : changer le placement des touffes
  // ne change pas leur apparence (et vice-versa).
  const rng = seededLcg(SEED + 1234);

  const dummy = new THREE.Object3D();
  dummy.rotation.order = 'ZYX';

  const bladeCount =
    TUFT_BLADES.min +
    Math.floor(rng() * (TUFT_BLADES.max - TUFT_BLADES.min + 1));

  const parts = [];
  for (let i = 0; i < bladeCount; i++) {
    // Position du brin : petit disque autour du centre de la touffe
    // (sqrt → uniforme en surface ; même anti-biais que Grass.jsx).
    const radius = Math.sqrt(rng()) * TUFT.radius;
    const angle = rng() * Math.PI * 2;
    const ox = Math.cos(angle) * radius;
    const oy = Math.sin(angle) * radius;

    // Caractère du brin : mêmes plages que Grass.jsx (hauteur, largeur),
    // plus une inclinaison initiale : le brin « pousse de travers ».
    const height = 0.6 + rng() * 0.7;
    const width = 0.5 + rng() * 0.6;
    const tilt = 0.25;
    const dummyY = height * BLADE.height * 0.4; // base enterrée de 20 % (cf. Grass.jsx)
    dummy.position.set(ox, oy, dummyY);
    dummy.rotation.set(
      Math.PI / 2 + (rng() - 0.5) * 2 * tilt,
      (rng() - 0.5) * 2 * tilt,
      rng() * Math.PI * 2
    );
    dummy.scale.set(width, height, width);
    dummy.updateMatrix();

    // Le cône de base, transformé par la matrice ci-dessus, puis coloré PAR
    // SOMMET : la variation de teinte vit dans la géométrie partagée, pas
    // dans un matériau par clone — l'option A ne peut pas utiliser
    // instanceColor comme l'instancedMesh de Grass.jsx ; vertexColors est
    // l'équivalent le plus simple ici.
    const geo = new THREE.ConeGeometry(BLADE.radius, BLADE.height, 3);
    geo.applyMatrix4(dummy.matrix);

    const color = new THREE.Color(GRASS_BASE_COLOR);
    color.offsetHSL(
      (rng() - 0.5) * 0.02, // hue
      (rng() - 0.5) * 0.1,  // saturation
      (rng() - 0.5) * 0.12  // lightness : du vert foncé au vert clair
    );
    const vertexCount = geo.attributes.position.count;
    const colors = new Float32Array(vertexCount * 3);
    for (let v = 0; v < vertexCount; v++) {
      colors[v * 3] = color.r;
      colors[v * 3 + 1] = color.g;
      colors[v * 3 + 2] = color.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    parts.push(geo);
  }

  // false = pas de groupes par matière : un seul matériau → 1 draw call par
  // touffe. mergeGeometries exige des attributs identiques sur toutes les
  // géométries (toutes des cônes augmentés du même attribut « color » ici).
  return mergeGeometries(parts, false);
}

/* ---------------------------------------------------------------------------
   GÉNÉRATION DU PLACEMENT DES TOUFFES (PRNG seedé, même zone que Grass.jsx)
   --------------------------------------------------------------------------- */

// Même logique de terrain occupé que sampleGroundPosition() de Grass.jsx :
// carré plateau + cases (|x|,|y| ≤ 7.5 + marge), troncs d'arbres.
function isFree(x, y) {
  if (Math.abs(x) < 7.6 && Math.abs(y) < 7.6) return false;
  for (const [tx, ty] of TREE_POSITIONS) {
    const dx = x - tx;
    const dy = y - ty;
    if (dx * dx + dy * dy < TREE_TRUNK_RADIUS * TREE_TRUNK_RADIUS) return false;
  }
  return true;
}

// Touffes : tirage dans l'anneau, AVEC contrainte d'espacement : chaque touffe
// doit rester à TUFT_SPACING des autres (l'option A place de gros paquets, qui
// se chevaucheraient si on laissait le pur hasard décider). Déterministe
// grâce au seed : un tirage qui échoue sera réessayé à l'identique partout.
function generateTufts() {
  const rng = seededLcg(SEED);
  const tufts = [];
  let attempts = 0;

  while (tufts.length < TUFT_COUNT && attempts < TUFT_COUNT * 50) {
    attempts++;

    // Racine carrée sur le rayon : répartition uniforme en surface (cf. Grass.jsx).
    const { inner, outer } = GRASS_RING;
    const angle = rng() * Math.PI * 2;
    const radius = Math.sqrt(
      THREE.MathUtils.lerp(inner * inner, outer * outer, rng())
    );
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    if (!isFree(x, y)) continue;

    // Espacement : pas de chevauchement de bouquets.
    let crowded = false;
    for (const t of tufts) {
      const dx = x - t.x;
      const dy = y - t.y;
      if (dx * dx + dy * dy < TUFT_SPACING * TUFT_SPACING) {
        crowded = true;
        break;
      }
    }
    if (crowded) continue;

    tufts.push({
      x,
      y,
      yaw: rng() * Math.PI * 2, // orientation propre du bouquet
      scale: THREE.MathUtils.lerp(TUFT.scaleMin, TUFT.scaleMax, rng()),
      flex: 0.6 + rng() * 0.8,  // souplesse au vent
      phase: rng() * Math.PI * 2,
    });
  }

  return tufts;
}

/* ---------------------------------------------------------------------------
   COMPOSANT
   --------------------------------------------------------------------------- */

export function GrassTufts() {
  // Racine englobante : sert au traverse() ci-dessous pour désactiver le
  // raycast des meshes clonés.
  const rootRef = useRef(null);
  // Un groupe « wrapper » par touffe : c'est LUI qui porte le placement
  // (position/échelle via props) ET le balancement (rotation écrite à
  // chaque frame dans useFrame).
  const wrapperRefs = useRef([]);

  // L'« objet source » des clones — l'équivalent du { scene } sorti d'un
  // useGLTF : un mesh unique portant la géométrie partagée + le matériau
  // partagé. Créé UNE fois ; les <Clone> partagent ses références (un clone
  // de mesh recopie les références geometry/material, pas la donnée).
  const tuftObject = useMemo(() => {
    const geometry = makeTuftGeometry();
    const material = new THREE.MeshStandardMaterial({
      // Les couleurs PAR SOMMET multiplient la couleur du matériau → blanc,
      // pour que les vertexColors soient la seule source de teinte.
      color: 0xffffff,
      vertexColors: true,
      flatShading: true,
      roughness: 0.9,
    });
    return new THREE.Mesh(geometry, material);
  }, []);

  // Nettoyage : géométrie et matériau créés en code (pas via un loader, qui
  // gère la libération tout seul) → c'est à nous de libérer la mémoire si le
  // composant quitte la scène.
  useEffect(() => {
    return () => {
      tuftObject.geometry?.dispose();
      tuftObject.material?.dispose();
    };
  }, [tuftObject]);

  // Les touffes : déterministes (seed) → même layout à chaque montage.
  const tufts = useMemo(() => generateTufts(), []);

  // Raycast : le <Clone> fait une COPIE PROFONDE des meshes à son montage, et
  // ses props ne se propagent pas aux meshes enfants clonés. Impossible donc
  // d'y écrire raycast={() => null} comme sur un mesh normal : on traverse
  // l'arbre rendu et on coupe mesh.raycast un par un. Sans ça, les touffes
  // avaleraient les clics de navigation caméra (même raison que le
  // raycast={() => null} sur l'instancedMesh de Grass.jsx).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    root.traverse((o) => {
      if (o.isMesh) o.raycast = () => null;
    });
    return undefined;
  }, [tufts]);

  // LE VENT — formules identiques à Grass.jsx (comparaison à conditions
  // égales), mais ici on incline la touffe ENTIÈRE : rotation rigide du
  // wrapper, amplitude réduite par swayFactor pour que les gros bouquets ne
  // basculent pas de façon caricaturale.
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const gust = 0.6 + 0.4 * Math.sin(time * WIND.gustSpeed);

    for (let i = 0; i < tufts.length; i++) {
      const wrapper = wrapperRefs.current[i];
      if (!wrapper) continue;
      const tuft = tufts[i];

      const alongWind = tuft.x * WIND_DIR_X + tuft.y * WIND_DIR_Y;
      const waveX = Math.sin(time * WIND.speed + tuft.phase + alongWind * WIND.waveLength);
      const waveY = Math.sin(time * WIND.speed * 0.83 + tuft.phase * 1.7);

      // Petits angles de dérive (x/y), autour du yaw fixe (z) : le bouquet
      // bascule doucement autour de sa pose propre.
      wrapper.rotation.x = WIND.swayFactor * WIND.strength * gust * waveX * tuft.flex;
      wrapper.rotation.y = WIND.swayFactor * WIND.strength * gust * waveY * tuft.flex * 0.6;
      wrapper.rotation.z = tuft.yaw;
    }
  });

  return (
    <group ref={rootRef}>
      {tufts.map((tuft, i) => (
        // Le wrapper porte PLACEMENT (position/scale) + ANIMATION (rotation
        // au vent) ; le <Clone> qu'il contient reste à l'identité : les deux
        // rôles ne se marchent pas dessus. (Ref : stockée pour useFrame,
        // via callback pour ne pas dépendre de l'ordre de montage.)
        <group
          key={i}
          position={[tuft.x, tuft.y, 0]}
          scale={[tuft.scale, tuft.scale, tuft.scale]}
          ref={(el) => {
            wrapperRefs.current[i] = el;
          }}
        >
          <Clone object={tuftObject} />
        </group>
      ))}
      {/* Ni castShadow ni receiveShadow (même raison que Grass.jsx : la
          lumière de Scene.jsx est un pointLight castShadow dont la shadow
          map cubique coûte 6 passes de rendu). */}
    </group>
  );
}

export default GrassTufts;
