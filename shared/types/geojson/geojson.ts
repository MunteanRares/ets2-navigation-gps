export interface Node {
    id: number;
    lng: number;
    lat: number;
}

export interface Edge {
    from: number;
    to: number;
    weight: number;
    featureId?: string | null;
    properties?: Record<string, any>;
    geometry?: Coord[];
}

export type Coord = [number, number];
