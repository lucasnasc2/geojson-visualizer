<script setup>
import MapGeojson from "./components/map-geojson.vue";
</script>

<template>
  <MapGeojson />
</template>

<style>
body {
  padding: 0;
  margin: 0;
}
html,
body,
#app {
  position: relative;
  height: 100%;
  width: 100vw;
}
.z-1000 {
  z-index: 1000;
}
</style>
