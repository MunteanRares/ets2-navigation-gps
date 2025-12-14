let adjacency: Map<number, any[]> | null = null;
let nodeCoords: Map<number, [number, number]> | null = null;

import {
    buildRouteStatsCache,
    calculateRoute,
    mergeClosePoints,
    smoothPath,
    type SimpleCityNode,
} from "~/assets/utils/routeAlgorithm";

let cityNodes: SimpleCityNode[] | null = null;

self.onmessage = async (e: MessageEvent) => {
    const { type, payload } = e.data;

    if (type === "INIT_GRAPH") {
        // TODO: Fetch inside worker
        const { nodes, edges, cities } = payload;

        nodeCoords = new Map(nodes);
        adjacency = new Map();

        if (cities) {
            cityNodes = cities;
        }

        for (const edge of edges) {
            if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
            adjacency.get(edge.from)!.push({
                to: edge.to,
                weight: edge.w,
                r: edge.r,
            });
        }

        self.postMessage({ type: "READY" });
    }

    if (type === "CALC_ROUTE") {
        if (!adjacency || !nodeCoords) return;

        const {
            startId,
            possibleEnds,
            heading,
            startType,
            targetCoords,
            projectedStartCoords,
        } = payload;

        const result = calculateRoute(
            startId,
            new Set(possibleEnds),
            heading,
            adjacency,
            nodeCoords,
            startType,
            targetCoords
        );

        if (result && result.path) {
            let fullPath = [...result.path];

            if (projectedStartCoords) {
                fullPath = [projectedStartCoords, ...fullPath];
            }

            let displayPath = mergeClosePoints(fullPath, 600);
            displayPath = smoothPath(displayPath);
            displayPath = smoothPath(displayPath);

            const statsCache = buildRouteStatsCache(fullPath, cityNodes);

            self.postMessage(
                {
                    type: "RESULT",
                    payload: {
                        ...result,
                        rawPath: fullPath,
                        displayPath: displayPath,
                        stats: statsCache,
                    },
                },
                [statsCache.buffer]
            );
        } else {
            self.postMessage({ type: "RESULT", payload: null });
        }
    }
};
