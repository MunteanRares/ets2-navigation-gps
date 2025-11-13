import * as L from "leaflet";

declare module "leaflet" {
    interface MarkerOptions {
        rotationAngle?: number;
        rotationOrigin?: string;
    }
    interface Marker {
        setRotationAngle(angle: number): void;
        setRotationOrigin(origin: string): void;
    }
}
