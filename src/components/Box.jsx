import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';

function Box(props) {
  const ref = useRef();
  const [hovered, hover] = useState(false);
  const [clicked] = useState(false);
  const [targetRotation, setTargetRotation] = useState(props.rotation ? props.rotation[2] : 0);

  // Récupérer le scale initial des props
  const baseScale = props.scale || [1, 1, 1];

  useEffect(() => {
    const handleRotate = () => {
      setTargetRotation(prev => prev - Math.PI / 2);
    };
    
    window.addEventListener('rotateBoxes', handleRotate);
    return () => window.removeEventListener('rotateBoxes', handleRotate);
  }, []);

  useFrame(() => {
    if (ref.current) {
      // Interpolation fluide vers la rotation cible
      ref.current.rotation.z += (targetRotation - ref.current.rotation.z) * 0.05;
    }
  });

  const handleClick = (e) => {
    e.stopPropagation(); // Empêche l'événement d'atteindre le Background
  };

  return (
    <mesh
      {...props}
      ref={ref}
      rotation={props.rotation || [0, 0, 0]}
      scale={clicked ? [baseScale[0] * 1.5, baseScale[1] * 1.5, baseScale[2] * 1.5] : baseScale}
      onClick={handleClick}
      onPointerOver={() => hover(true)}
      onPointerOut={() => hover(false)}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={hovered ? 'blue' : 'orange'} />
    </mesh>
  );
}

export default Box;
