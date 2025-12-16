<script lang="ts" setup>
defineProps<{
    truckSpeed: number;
    gameConnected: boolean;
    fuel: number;
    restStopMinutes: number;
    restStopTime: string;
    gameTime: string;
}>();
</script>

<template>
    <div class="game-information">
        <div class="truck-info">
            <div class="truck-speed-div">
                <div class="road-perspective"></div>
                <p class="truck-speed">{{ truckSpeed }}</p>
                <p class="km-h">km/h</p>
            </div>
        </div>

        <div v-if="gameConnected" class="gas-sleep-time">
            <div class="gas-sleep">
                <div class="fuel-amount">
                    <Icon
                        name="bi:fuel-pump-fill"
                        :class="{ 'pulse-red': fuel < 100 }"
                    />
                    <p>{{ fuel }}<span class="liters">l</span></p>
                </div>

                <div class="sleep-div">
                    <Icon
                        name="solar:moon-sleep-bold"
                        class="sleep-icon"
                        :class="{ 'pulse-blue': restStopMinutes < 90 }"
                    />
                    <p>{{ restStopTime }}</p>
                </div>
            </div>

            <p class="game-time">{{ gameTime }}</p>
        </div>

        <div v-else class="disconnected-div">
            <p class="disconnected-message">Game Offline</p>
            <Icon
                name="streamline-ultimate:link-disconnected-bold"
                class="disconnected-icon"
            />
        </div>
    </div>
</template>

<style lang="scss" scoped src="~/assets/scss/scoped/topBar.scss"></style>
