import CaseDescription from './CaseDescription';
import { CASE_3D_ASSETS } from './case3DAssets';

const assets = CASE_3D_ASSETS.curation;

export default function DescriptionCuration({ transition, caseRotation }) {
  return (
    <CaseDescription
      glbUrl={assets.glb}
      descriptionUrl={assets.description}
      cube={{ position: [-2, 1.2, 3.4], rotation: [Math.PI/2, 0, 0], scale: 0.7, spinAxis: 'y' }}
      card={{ position: [-2, 0, -0.1], rotation: [0, Math.PI / 40, -Math.PI/2] }}
      transition={transition}
      caseRotation={caseRotation}
    />
  );
}
