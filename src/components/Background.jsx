import React from 'react';
import * as THREE from 'three';

// Fond en deux couches, toutes les deux éclairées (meshStandardMaterial) pour
// que ciel et sol réagissent exactement pareil aux lumières :
//
// 1. Le CYLINDRE (sol) : disque plat (rayon 70, épaisseur 1) posé à plat
//    (rotation X +90° aligne son axe sur Z, le « haut » de la scène). C'est
//    lui qui reçoit l'ombre du plateau et des arbres (receiveShadow).
//
// 2. La SPHÈRE (ciel) : dôme vu de l'intérieur (BackSide), même rayon que le
//    cylindre (70) pour que le bord du sol touche exactement l'équateur du
//    dôme. Remplace l'ancien ciel en CSS sur la div <Canvas> : le CSS n'est
//    pas affecté par les lumières, donc quand on baisse l'ambiance, il
//    restait bleu vif au-dessus d'un sol qui noircit. Ici le dôme s'assombrit
//    comme le reste de la scène.
//
// Le bord du disque (r = 70, face du haut à z = 0) et l'équateur de la
// sphère (r = 70, z = 0, sphère centrée à l'origine) se rencontrent en un
// simple contact d'arête (face horizontale contre surface verticale) :
// aucune coplanéité, donc aucun risque de z-fighting à la jonction.
//
// - Rayon 70 < camera.far (500, cf. Scene.jsx) et caméra (max ~30 unités du
//   centre) bien à l'intérieur : le dôme n'est jamais clippé ni traversé.
// - La sphère n'a ni castShadow ni receiveShadow : rien ne doit s'y projeter
//   (le sol a ce rôle), et le pointLight est dedans — la laisser occluder
//   bloquerait toute la lumière.
// - onClick sur les deux : la sphère est un mesh cliquable, donc un clic
//   dessus ne déclenche PAS le onPointerMissed du Canvas (Scene.jsx) ; sans
//   ce onClick, cliquer le ciel ne ferait plus le retour arrière.
function Background({ onClick }) {
  return (
    <>
      {/* Sol : reçoit l'ombre du plateau et des arbres.
          receiveShadow uniquement : ce plan n'a rien devant lui à projeter,
          le marquer castShadow l'injectait inutilement dans les passes d'ombre */}
      <mesh
        receiveShadow
        onClick={onClick}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, -0.5]}>
        <cylinderGeometry args={[70, 70, 1, 120]} />
        <meshStandardMaterial color="#85350a" roughness={0.8} />
      </mesh>
      <mesh receiveShadow onClick={onClick} position={[0, 0, 0]}>
        <sphereGeometry args={[70, 48, 24]} />
        <meshStandardMaterial color="#85350a" roughness={0.8} side={THREE.BackSide} />
      </mesh>
    </>
  );
}

export default Background;
