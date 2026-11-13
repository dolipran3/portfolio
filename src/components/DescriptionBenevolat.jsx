import CaseDescription from './CaseDescription';
import { CASE_3D_ASSETS } from './case3DAssets';

const assets = CASE_3D_ASSETS.benevolat;

export default function DescriptionBenevolat({ transition, caseRotation }) {
  return (
    <CaseDescription
      descriptionUrl={assets.description}
      card={{ position: [-2.8, 1, -0.1], rotation: [0, Math.PI / 40, -Math.PI/2], dimensions: [3.5, 0.1, 2.2] }}
      transition={transition}
      caseRotation={caseRotation}
    />
  );
}
