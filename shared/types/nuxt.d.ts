import "leaflet";

declare module "#app" {
    interface NuxtApp {
        $leaflet: typeof import("leaflet");
    }
}

declare module "vue" {
    interface ComponentCustomProperties {
        $leaflet: typeof import("leaflet");
    }
}
