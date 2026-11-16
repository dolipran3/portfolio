
import { BILLET } from '../case3DAssets';
import { BilletsCards } from './BilletsCards';

const assets = BILLET['caisseCommunaute'];

export default function CaisseCommunaute({position = [0, 0, 0], rotation = [-Math.PI/2, 0, 0], dimension= [2.2*1.3, 0.1, 3*1.3]}) {
  return (
    <BilletsCards
      textureUrl={assets.texture}
      color={assets.color}
      position = {position} 
      rotation= {rotation}
      dimension={dimension}
    />
  );
}
