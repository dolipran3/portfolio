import CaseDescription from './CaseDescription';
import { CASE_3D_ASSETS } from './case3DAssets';

const assets = CASE_3D_ASSETS.worximity;

export default function DescriptionWorximity({ transition, caseRotation }) {
  return (
    <CaseDescription
      glbUrl={assets.glb}
      descriptionUrl={assets.description}
      cube={{ position: [-2, 0, 3.2], rotation: [Math.PI / 2, 0, 0], scale: 1, spinAxis: 'y' }}
      card={{ position: [0, 0, -0.1], rotation: [-Math.PI / 40, 0, 0] }}
      transition={transition}
      caseRotation={caseRotation}
    />
  );
}
