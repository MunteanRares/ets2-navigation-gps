import type { Vector3 } from "./TruckData";

interface TrailerPlacement extends Vector3 {
    heading: number;
    pitch: number;
    roll: number;
}

export interface TrailerData {
    attached: boolean;
    id: string;
    name: string;
    mass: number;
    wear: number;
    placement: TrailerPlacement;
}
