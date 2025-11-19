<script lang="ts" setup>
import type { Feature, FeatureCollection, LineString } from "geojson";
import type { Map } from "maplibre-gl";
import { ref, onMounted } from "vue";

// Define types exactly as they appear in the JSON
interface Node {
    id: number;
    lng: number;
    lat: number;
}

interface Edge {
    from: number;
    to: number;
    weight: number;
    geometry?: number[][]; // This is the key field
}

const mapEl = ref<HTMLElement | null>(null);
let map: Map | null = null;

onMounted(async () => {
    if (!mapEl.value) return;

    // Initialize your map here (replace with your actual init function)
    map = await initializeMap(mapEl.value);

    // Temporary: Assuming map exists for the example
    if (!map) return;

    map.on("load", async () => {
        console.log("Fetching graph...");

        try {
            const [nodes, edges]: [Node[], Edge[]] = await Promise.all([
                fetch("/roadnetwork/nodes.json").then((res) => res.json()),
                fetch("/roadnetwork/edges.json").then((res) => res.json()),
            ]);

            console.log(
                `Loaded ${edges.length} edges. Checking for geometry...`
            );
            const sample = edges.find(
                (e) => e.geometry && e.geometry.length > 2
            );
            if (sample) {
                console.log("✅ Good! Found edges with detailed geometry.");
            } else {
                console.warn(
                    "⚠️ Warning: Edges seem to lack detailed geometry."
                );
            }

            // 1. PREPARE ROAD FEATURES (Visuals)
            const roadFeatures: Feature<LineString>[] = [];

            // 2. PREPARE CONNECTIVITY LINES (Debug Gaps)
            // These lines connect the exact Node A to Node B (straight)
            // allowing you to see where the road *should* connect vs where it visually ends.
            const connectionFeatures: Feature<LineString>[] = [];

            edges.forEach((e) => {
                const from = nodes[e.from];
                const to = nodes[e.to];
                if (!from || !to) return;

                // --- Visual Road (Curve) ---
                if (e.geometry && e.geometry.length > 0) {
                    roadFeatures.push({
                        type: "Feature",
                        geometry: {
                            type: "LineString",
                            coordinates: e.geometry,
                        },
                        properties: { weight: e.weight },
                    });
                } else {
                    // Fallback if no geometry
                    roadFeatures.push({
                        type: "Feature",
                        geometry: {
                            type: "LineString",
                            coordinates: [
                                [from.lng, from.lat],
                                [to.lng, to.lat],
                            ],
                        },
                        properties: { weight: e.weight },
                    });
                }

                // --- Logical Connection (Gap Filler) ---
                // This draws a line from the End of the visual road to the actual Node
                // If the visual road matches the node, this line is length 0 and invisible.
                // If there is a gap (Prefab), this will show it.
                /*
                connectionFeatures.push({
                    type: "Feature",
                    geometry: {
                        type: "LineString",
                        coordinates: [[from.lng, from.lat], [to.lng, to.lat]]
                    },
                    properties: {}
                });
                */
            });

            // Add Source for Roads
            if (map?.getSource("graph-edges")) map.removeSource("graph-edges");

            map?.addSource("graph-edges", {
                type: "geojson",
                data: { type: "FeatureCollection", features: roadFeatures },
            });

            // Layer: Red Roads
            map?.addLayer({
                id: "graph-edges-layer",
                type: "line",
                source: "graph-edges",
                layout: { "line-join": "round", "line-cap": "round" },
                paint: {
                    "line-color": "#e63946", // Nice red
                    "line-width": 3,
                },
            });

            console.log("Render complete.");
        } catch (err) {
            console.error("Error loading graph:", err);
        }
    });
});
</script>

<template>
    <div ref="mapEl" style="width: 100%; height: 100vh"></div>
</template>
