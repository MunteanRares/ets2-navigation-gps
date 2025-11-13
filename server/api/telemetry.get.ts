import { defineEventHandler } from "h3";

export default defineEventHandler(async () => {
    try {
        const data = await $fetch(
            "http://192.168.1.226:25555/api/ets2/telemetry"
        );
        return data;
    } catch (error: any) {
        throw new Error(`Failed to fetch telemetry: ${error.message}`);
    }
});
