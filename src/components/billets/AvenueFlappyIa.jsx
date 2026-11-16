
import { BILLET } from '../case3DAssets';
import { BilletsCards } from './BilletsCards';

const assets = BILLET['avenueFlappyIa'];

export default function AvenueFlappyIa({position = [0, 0, 0], rotation = [-Math.PI/2, 0, 0]}) {
  return (
    <BilletsCards
      textureUrl={assets.texture}
      color={assets.color}
      position = {position} 
      rotation= {rotation}
      dimension={[2.2*1.7, 0.1, 3*1.7]}
    />
  );
}
