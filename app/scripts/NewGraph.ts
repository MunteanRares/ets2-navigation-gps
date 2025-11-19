// scripts/buildGraph.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import * as turf from "@turf/turf";
import type { Node, Edge, Coord } from "../../shared/types/geojson/geojson";

// --- INTERFACES ---
interface InputFeature {
    type: "Feature";
    properties: {
        id: string;
        startNodeUid: string;
        endNodeUid: string;
        roadType: string;
        leftLanes: number;
        rightLanes: number;
        speedLimit?: number;
        [key: string]: any;
    };
    geometry: {
        type: "LineString";
        coordinates: Coord[];
    };
}

interface InputGeoJSON {
    type: "FeatureCollection";
    features: InputFeature[];
}

// --- MAIN FUNCTION ---
function buildGraph(inputDir: string, outDir: string) {
    console.log(`\n🔵 Loading GeoJSON from: ${inputDir}`);

    if (!existsSync(inputDir)) {
        console.error(`❌ File not found: ${inputDir}`);
        process.exit(1);
    }

    const raw = readFileSync(inputDir, "utf8");
    const geo = JSON.parse(raw) as InputGeoJSON;
    const features = geo.features;

    console.log(`🟢 Loaded ${features.length} features.`);

    const uidToNumericId = new Map<string, number>();
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Helper to get/create node ID
    const registerNode = (uid: string, coord: Coord) => {
        if (!uidToNumericId.has(uid)) {
            const id = nodes.length;
            nodes.push({ id, lng: coord[0], lat: coord[1] });
            uidToNumericId.set(uid, id);
        }
        return uidToNumericId.get(uid)!;
    };

    let curveCount = 0;
    let straightCount = 0;

    for (const feature of features) {
        const props = feature.properties;
        const coords = feature.geometry.coordinates;

        // 1. Validation
        if (!props.startNodeUid || !props.endNodeUid) continue;
        if (!coords || coords.length < 2) continue;

        // 2. Register Nodes (Topology)
        // IMPORTANT: We take the coordinates from the ENDPOINTS of the line
        const startNodeId = registerNode(props.startNodeUid, coords[0]!);
        const endNodeId = registerNode(
            props.endNodeUid,
            coords[coords.length - 1]!
        );

        // 3. Statistics for debugging
        if (coords.length > 2) curveCount++;
        else straightCount++;

        // 4. Build Edge Data
        const lengthKm = turf.length(turf.lineString(coords), {
            units: "kilometers",
        });

        const commonProps = {
            featureId: props.id,
            roadType: props.roadType,
            speedLimit: props.speedLimit || 0,
        };

        // Forward Logic
        if ((props.rightLanes ?? 0) > 0) {
            edges.push({
                from: startNodeId,
                to: endNodeId,
                weight: lengthKm,
                geometry: coords, // <--- SAVING CURVE HERE
                properties: { ...commonProps, dir: "forward" },
            });
        }

        // Backward Logic (Reverse Geometry)
        if ((props.leftLanes ?? 0) > 0) {
            edges.push({
                from: endNodeId,
                to: startNodeId,
                weight: lengthKm,
                geometry: [...coords].reverse(), // <--- SAVING REVERSED CURVE
                properties: { ...commonProps, dir: "backward" },
            });
        }
    }

    console.log(`\n📊 Statistics:`);
    console.log(`   - Nodes Created: ${nodes.length}`);
    console.log(`   - Edges Created: ${edges.length}`);
    console.log(`   - Curved Roads (coords > 2): ${curveCount}`);
    console.log(`   - Straight Roads (coords == 2): ${straightCount}`);

    if (curveCount === 0) {
        console.warn(`\n⚠️ WARNING: NO CURVES DETECTED!`);
        console.warn(
            `   Your input GeoJSON only contains straight lines (2 points).`
        );
        console.warn(
            `   The map will look angular. Check your extractor settings.`
        );
    } else {
        console.log(`   ✅ Curves detected. Map should look smooth.`);
    }

    // 5. Write to Disk
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    writeFileSync(path.join(outDir, "nodes.json"), JSON.stringify(nodes));
    writeFileSync(path.join(outDir, "edges.json"), JSON.stringify(edges)); // Geometry is inside here

    console.log(`\n💾 Saved nodes.json and edges.json to ${outDir}`);
}

// Run
const args = process.argv.slice(2);
if (args.length < 2) {
    console.error("Usage: npx ts-node scripts/buildGraph.ts <input> <output>");
    process.exit(1);
}
buildGraph(args[0]!, args[1]!);
