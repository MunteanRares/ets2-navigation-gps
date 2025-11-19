import type { Node, Edge, Coord } from "~~/shared/types/geojson/geojson";

export async function loadGraph(): Promise<{ nodes: Node[]; edges: Edge[] }> {
    const [nodes, edges] = await Promise.all([
        fetch("/roadnetwork/nodes.json").then((r) => r.json()),
        fetch("/roadnetwork/edges.json").then((r) => r.json()),
    ]);
    return { nodes, edges };
}
