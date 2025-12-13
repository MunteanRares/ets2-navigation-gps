import { distance, point } from "@turf/turf";
import { MinHeap } from "~/assets/utils/MinHeap";
import {
    getBearing,
    getAngleDiff,
    getSignedAngle,
} from "~/assets/utils/geographicMath";

export function useRouting() {
    const mergeClosePoints = (
        coords: [number, number][],
        minDistanceMeters = 5
    ): [number, number][] => {
        if (coords.length < 2) return coords;
        const result: [number, number][] = [];
        let i = 0;

        while (i < coords.length) {
            const current = coords[i]!;
            if (i === coords.length - 1) {
                result.push(current);
                break;
            }
            const next = coords[i + 1]!;
            const dist = distance(point(current), point(next), {
                units: "meters",
            });

            if (dist < minDistanceMeters) {
                const midPoint: [number, number] = [
                    (current[0] + next[0]) / 2,
                    (current[1] + next[1]) / 2,
                ];
                result.push(midPoint);
                i += 2;
            } else {
                result.push(current);
                i++;
            }
        }
        if (result.length < 2) result.push(coords[coords.length - 1]!);
        return result;
    };

    const calculateRoute = (
        start: number,
        possibleEnds: Set<number | undefined>,
        startHeading: number | null,
        adjacency: Map<number, { to: number; weight: number; r: number }[]>,
        nodeCoords: Map<number, [number, number]>,
        startType: "road" | "yard" = "road",
        targetLocation?: [number, number]
    ): { path: [number, number][]; endId: number } | null => {
        const costs = new Map<number, number>();
        const previous = new Map<number, number>();
        const openHeap = new MinHeap();

        let destCoord = targetLocation;
        if (!destCoord) {
            const firstEndId = [...possibleEnds][0];
            if (firstEndId !== undefined)
                destCoord = nodeCoords.get(firstEndId);
        }
        if (!destCoord) return null;

        const startCoord = nodeCoords.get(start);
        let maxIterations = 10000;

        if (startCoord) {
            const distKm = distance(point(startCoord), point(destCoord), {
                units: "kilometers",
            });

            // Allow 200 nodes per kilometer + the base budget
            maxIterations = 5000 + distKm * 300;
        }

        const HEURISTIC_SCALE = 5;

        function heuristic(nodeId: number): number {
            const node = nodeCoords.get(nodeId);
            if (!node) return 0;
            const dx = node[0] - destCoord![0];
            const dy = node[1] - destCoord![1];
            return Math.sqrt(dx * dx + dy * dy) * HEURISTIC_SCALE;
        }

        costs.set(start, 0);
        openHeap.push(start, 0);

        let foundEndId: number | null = null;
        const visited = new Set<number>();
        let iterations = 0;

        while (openHeap.size() > 0) {
            iterations++;
            if (iterations > maxIterations) {
                return null;
            }

            const currentId = openHeap.pop();
            if (currentId === undefined) break;

            if (visited.has(currentId)) continue;
            visited.add(currentId);

            if (possibleEnds.has(currentId)) {
                foundEndId = currentId;
                break;
            }

            const neighbors = adjacency.get(currentId) || [];
            const currentCoord = nodeCoords.get(currentId);
            const prevId = previous.get(currentId);
            const currentG = costs.get(currentId) ?? Infinity;

            for (const edge of neighbors) {
                const neighborId = edge.to;
                if (visited.has(neighborId)) continue;

                let stepCost = edge.weight || 1;
                const neighborCoord = nodeCoords.get(neighborId);

                if (currentCoord && neighborCoord) {
                    if (currentId === start && startHeading !== null) {
                        if (startType === "yard") {
                            stepCost += 10;
                        } else {
                            const dir = getBearing(currentCoord, neighborCoord);
                            const diff = getAngleDiff(startHeading, dir);
                            if (diff > 90) stepCost += 10_000_000;
                            else if (diff > 45) stepCost += 1000;
                        }
                    } else if (prevId !== undefined) {
                        let refCoord = nodeCoords.get(prevId)!;
                        let distToPrev = distance(
                            point(refCoord),
                            point(currentCoord),
                            { units: "meters" }
                        );

                        if (distToPrev < 5) {
                            const grandPrevId = previous.get(prevId);
                            if (grandPrevId !== undefined) {
                                refCoord = nodeCoords.get(grandPrevId)!;
                            }
                        }

                        const angle = getSignedAngle(
                            refCoord,
                            currentCoord,
                            neighborCoord
                        );
                        const absAngle = Math.abs(angle);

                        // ====== BLOCKING U-TURNS

                        const immediatePrevCoord = nodeCoords.get(prevId)!;
                        const distFromImmediate = distance(
                            point(immediatePrevCoord),
                            point(currentCoord),
                            { units: "kilometers" }
                        );

                        const isZigZag =
                            distFromImmediate < 0.2 && absAngle > 89;

                        if (isZigZag) stepCost += 1_000_000_000;

                        // BLOCKING U-TURNS ======

                        // ANGLE CHECKS
                        if (edge.r === 2) {
                            stepCost *= 1.1;
                            if (angle < -100) stepCost += 100_000;
                        }

                        if (absAngle > 98) {
                            stepCost += Infinity;
                        } else if (angle < -45) {
                            stepCost += 2000;
                        } else if (angle > 45) {
                            stepCost += 500;
                        } else if (absAngle > 10) {
                            stepCost += 50;
                        }
                    }
                }

                if (stepCost < 1) stepCost = 1;
                const tentativeG = currentG + stepCost;

                if (tentativeG < (costs.get(neighborId) ?? Infinity)) {
                    previous.set(neighborId, currentId);
                    costs.set(neighborId, tentativeG);
                    openHeap.push(
                        neighborId,
                        tentativeG + heuristic(neighborId)
                    );
                }
            }
        }

        if (foundEndId === null) return null;

        const path: [number, number][] = [];
        let curr: number | undefined = foundEndId;
        while (curr !== undefined) {
            const coord = nodeCoords.get(curr);
            if (coord) path.unshift(coord);
            curr = previous.get(curr);
        }

        return { path, endId: foundEndId };
    };

    return { calculateRoute, mergeClosePoints };
}
