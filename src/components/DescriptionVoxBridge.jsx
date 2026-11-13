import CaseDescription from './CaseDescription';
import { CASE_3D_ASSETS } from './case3DAssets';

const assets = CASE_3D_ASSETS.voxBridge;

export default function DescriptionVoxBridge({ transition, caseRotation }) {
  return (
    <CaseDescription
      glbUrl={assets.glb}
      descriptionUrl={assets.description}
      cube={{ position: [1.6, 0, 3.3], rotation: [Math.PI/2, 0, 0], scale: 1.2, spinAxis: 'y' }}
      card={{ position: [-2.2, 0, -0.1], rotation: [-Math.PI / 40, 0, 0] }}
      transition={transition}
      caseRotation={caseRotation}
    />
  );
}
