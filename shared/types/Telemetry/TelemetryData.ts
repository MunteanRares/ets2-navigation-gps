import type { GameData } from "./GameData";
import type { JobData } from "./JobData";
import type { NavigationData } from "./NavigationData";
import type { TrailerData } from "./TrailerData";
import type { TruckData } from "./TruckData";

export interface TelemetryData {
    game: GameData;
    truck: TruckData;
    trailer: TrailerData;
    job: JobData;
    navigation: NavigationData;
}
