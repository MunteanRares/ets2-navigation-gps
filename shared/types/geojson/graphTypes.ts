export interface Node {
    id: number;
    lng: number;
    lat: number;
}

export interface Edge {
    from: number;
    to: number;
    w: number;
    r: number;
    geometry?: Coord[];
}

export type Coord = [number, number];
