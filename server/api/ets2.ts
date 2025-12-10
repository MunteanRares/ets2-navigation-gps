import { defineEventHandler } from "h3";

export default defineEventHandler(async () => {
    try {
        const data = await $fetch("http://localhost:25555/api/ets2/telemetry", {
            timeout: 500,
            retry: 0,
        });
        return {
            connected: true,
            telemetry: data,
        };
    } catch (error: any) {
        return {
            connected: false,
            telemetry: null,
            status: "Telemetry server is starting or disconnected...",
        };
    }
});
