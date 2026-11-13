import CaseDescription from './CaseDescription';
import { CASE_3D_ASSETS } from './case3DAssets';

const assets = CASE_3D_ASSETS['flappy-ia'];

export default function DescriptionFlappyIa({ transition, caseRotation }) {
  return (
    <CaseDescription
      glbUrl={assets.glb}
      descriptionUrl={assets.description}
      cube={{ position: [-3, 2.5, 2.5], rotation: [Math.PI, 0, 0], scale: 0.8, spinAxis: 'z' }}
      card={{ position: [0, 0, -0.1], rotation: [-Math.PI / 40, 0, 0] }}
      transition={transition}
      caseRotation={caseRotation}
    />
  );
}
