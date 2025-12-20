<script lang="ts" setup>
import { AppSettings } from "~~/shared/variables/appSettings";

const { fetchIp, localIP } = useNetwork();

defineProps<{ launchMap: () => void }>();

onMounted(async () => {
    await fetchIp();
    (window as any).electronAPI.setWindowSize(900, 600, false, false);
});

const openLink = async (url: string) => {
    (window as any).electronAPI.openExternal(url);
};
</script>

<template>
    <section
        :style="{ '--theme-color': AppSettings.theme.defaultColor }"
        class="section-device-info"
    >
        <div class="top-tagline">
            <Icon name="whh:gpsalt" class="icon" size="16" />
            <span>Your Trucking Companion</span>
        </div>

        <div class="content">
            <h2 class="title">Welcome to TruckerNav!</h2>
            <span class="subtitle"
                >Below you’ll find instructions to set up the GPS on your
                phone.</span
            >
            <div class="steps">
                <ol>
                    <li>Make sure ETS2 / ATS is running on your PC.</li>
                    <li>
                        Ensure your phone is connected to the same network as
                        your PC.
                    </li>
                    <li>Open the GPS app on your phone.</li>
                    <li>Make sure ETS2 / ATS is running on your PC.</li>
                    <li>
                        Enter this IP to connect to the desktop telemetry:
                        <strong class="localIp">{{ localIP }}</strong>
                    </li>
                </ol>
            </div>

            <div class="github-link">
                <Icon name="mdi:github" size="20" />
                <span>
                    GitHub Link:
                    <a
                        @click.prevent="
                            openLink(
                                'https://github.com/Rares-Muntean/ets2-navigation-gps'
                            )
                        "
                        >TruckNav</a
                    >
                </span>
            </div>
        </div>

        <div class="bottom">
            <button @click.prevent="launchMap" class="btn">
                <span>Desktop GPS</span>
                <Icon name="material-symbols:map-rounded" size="20" />
            </button>
        </div>
    </section>
</template>

<style scoped lang="scss" src="~/assets/scss/scoped/desktopIndex.scss"></style>
