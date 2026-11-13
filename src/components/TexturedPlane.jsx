import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Composant de zone cliquable invisible
function ClickableArea({ position, label, onClickAction }) {
  const [hovered, setHovered] = useState(false);

  return (
    <mesh
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClickAction(label);
      }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}>
      <circleGeometry args={[0.2, 32]} />
      <meshBasicMaterial 
        transparent 
        opacity={hovered ? 0.3 : 0} 
        color="yellow" 
      />
    </mesh>
  );
}

function TexturedPlane(props) {
  const groupRef = useRef();
  const [offset, setOffset] = useState({ x: 0, y: 0, z: 0 });

  // Créer la texture une seule fois avec useMemo
  const texture = useMemo(() => {
    // Créer un canvas HTML avec HAUTE RÉSOLUTION
    const canvas = document.createElement('canvas');
    canvas.width = 2048;  // 4x plus haute résolution
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');
    
    // Activer le lissage anti-aliasing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Ajuster les proportions pour la nouvelle résolution (x4)
    const scale = 4;

    // Fond blanc
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 2048, 2048);

    // Bordure
    ctx.strokeStyle = '#2f6727';
    ctx.lineWidth = 10 * scale;
    ctx.strokeRect(5 * scale, 5 * scale, 502 * scale, 502 * scale);

    // Titre
    ctx.fillStyle = '#2f6727';
    ctx.font = `bold ${48 * scale}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('Portfolio', 256 * scale, 80 * scale);

    // Ligne décorative
    ctx.fillRect(100 * scale, 100 * scale, 312 * scale, 3 * scale);

    // Texte descriptif
    ctx.font = `${24 * scale}px Arial`;
    ctx.fillStyle = '#333333';
    ctx.fillText('Baptiste', 256 * scale, 150 * scale);

    // Icônes simulées (cercles)
    const icons = [
      { x: 150, y: 250, label: 'Web' },
      { x: 256, y: 250, label: 'Design' },
      { x: 362, y: 250, label: 'Dev' }
    ];

    icons.forEach(icon => {
      // Cercle
      ctx.beginPath();
      ctx.arc(icon.x * scale, icon.y * scale, 30 * scale, 0, Math.PI * 2);
      ctx.fillStyle = '#ff6b35';
      ctx.fill();
      ctx.strokeStyle = '#2f6727';
      ctx.lineWidth = 3 * scale;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#333333';
      ctx.font = `${16 * scale}px Arial`;
      ctx.fillText(icon.label, icon.x * scale, (icon.y + 60) * scale);
    });

    // Rectangle d'information
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(80 * scale, 350 * scale, 352 * scale, 100 * scale);
    ctx.strokeStyle = '#2f6727';
    ctx.lineWidth = 2 * scale;
    ctx.strokeRect(80 * scale, 350 * scale, 352 * scale, 100 * scale);

    // Texte dans le rectangle
    ctx.fillStyle = '#333333';
    ctx.font = `${18 * scale}px Arial`;
    ctx.fillText('Cliquez sur le fond', 256 * scale, 390 * scale);
    ctx.fillText('pour faire tourner', 256 * scale, 420 * scale);

    // Créer une texture THREE.js depuis le canvas
    const canvasTexture = new THREE.CanvasTexture(canvas);
    
    // Améliorer le filtrage de la texture
    canvasTexture.minFilter = THREE.LinearMipmapLinearFilter; // Pour quand on s'éloigne
    canvasTexture.magFilter = THREE.LinearFilter; // Pour quand on se rapproche
    canvasTexture.anisotropy = 16; // Maximum d'anisotropie pour plus de netteté
    canvasTexture.needsUpdate = true;
    
    return canvasTexture;
  }, []); // Tableau vide = créé une seule fois


  // Gérer les clics sur les icônes
  const handleIconClick = (label) => {
    console.log(`Clic sur ${label}`);
    if (label === 'Design') {
      setOffset(prev => ({ ...prev, x: prev.x + 0.5 }));
    } else if (label === 'Web') {
      setOffset(prev => ({ ...prev, y: prev.y + 0.5 }));
    } else if (label === 'Dev') {
      setOffset(prev => ({ ...prev, z: prev.z + 0.5 }));
    }
  };

  // Animation du groupe entier
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.x = offset.x;
      groupRef.current.position.y = offset.y;
      groupRef.current.position.z = offset.z;
    }
  });

  // Positions des cercles dans l'espace 3D (ajustées pour correspondre à la texture)
  // Position Y ajustée pour correspondre aux cercles sur la texture
  const iconPositions = [
    { pos: [-0.4, 0.05, 1.02], label: 'Web' },      // Gauche, devant le cube
    { pos: [0, 0.05, 1.02], label: 'Design' },      // Centre, devant le cube
    { pos: [0.4, 0.05, 1.02], label: 'Dev' }        // Droite, devant le cube
  ];

  return (
    <group ref={groupRef} {...props}>
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshBasicMaterial map={texture} />
      </mesh>

      {/* Zones cliquables invisibles au-dessus des icônes */}
      {iconPositions.map(({ pos, label }) => (
        <ClickableArea
          key={label}
          position={pos}
          label={label}
          onClickAction={handleIconClick}
        />
      ))}
    </group>
  );
}

export default TexturedPlane;
