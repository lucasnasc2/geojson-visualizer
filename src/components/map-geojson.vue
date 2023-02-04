<template>
  <div id="map">
    <input
      type="file"
      style="display: none"
      ref="fileInput"
      accept=".geojson"
      @change="handleFilePicker"
    />
  </div>
  <div class="inline-flex flex-col z-1000 absolute top-3 right-3">
    <button
      :disabled="!geojson"
      @click="toggleInfoPopup()"
      class="onDisabled leaflet-borders p-1 mb-2 bg-white hover"
    >
      <mdi-database-marker-outline size="36" />
    </button>
    <button
      :disabled="!geojson"
      @click="toggleAllMarkers()"
      class="onDisabled leaflet-borders p-2 mb-2 bg-white hover"
      :class="{ disabled: !bool.allMarkers }"
    >
      <mdi-map-marker-path size="30" />
    </button>
    <button
      :disabled="bool.locating"
      @click="toggleLocationCircle()"
      class="onDisabled leaflet-borders p-2 mb-2 bg-white hover"
    >
      <mdi-crosshairs v-if="bool.locating || !bool.location" size="30" />
      <mdi-crosshairs-gps v-else size="30" />
    </button>
    <button
      :disabled="bool.locating || !bool.location"
      @click="toggleLocationFollow()"
      class="onDisabled leaflet-borders p-2 mb-2 bg-white hover"
    >
      <mdi-map-marker-radius-outline v-if="bool.locationFollow" size="30" />
      <mdi-map-marker-outline v-else size="30" />
    </button>
    <button
      @click="togglePopups()"
      class="leaflet-borders p-2 mb-2 bg-white hover"
    >
      <mdi-message-outline v-if="bool.autoOpenPopups" size="30" />
      <mdi-message-off-outline v-else size="30" />
    </button>
    <input
      type="text"
      pattern="\d*"
      maxlength="2"
      v-model="filterDistanceInput"
      @blur="evaluateDistanceFilterInput()"
      class="leaflet-borders onDisabled mb-2 filter-input"
    />
    <button @click="openFilePicker" class="leaflet-borders p-2 bg-white hover">
      <mdi-upload-outline size="30" />
    </button>
  </div>

  <div class="inline-flex toolbar-bottom leaflet-borders z-1000 bg-white p-3">
    <button
      @click="skipMarker(false)"
      :disabled="!geojson"
      class="onDisabled-light p-2 mr-1"
    >
      <mdi-skip-previous-outline size="22" />
    </button>
    <div class="flex self-center w-full">
      <input
        :disabled="!geojson"
        type="range"
        :min="0"
        :max="geojson ? geojson.features.length - 1 : 0"
        v-model="rangeValue"
        class="slider"
        id="myRange"
      />
    </div>
    <button
      @click="skipMarker(true)"
      :disabled="!geojson"
      class="onDisabled-light p-2 ml-1"
    >
      <mdi-skip-next-outline size="22" />
    </button>
  </div>
  <div v-if="bool.infoPopup" class="no-scrollbar popup bg-white">
    <div class="popup-top-bar flex content-between">
      <span class="flex-grow self-center pl-2 text-2xl"
        >{{ geojson.features.length }} points</span
      >
      <span class="flex-grow self-center pl-2 text-xs"
        >aprx. distance: {{ distanceTraveled.toFixed(2) }}m <br />
        avg. accuracy: {{ avgAccuracy.toFixed(2) }}</span
      >
      <button @click="toggleInfoPopup()" class="disabled p-1 bg-white hover">
        <mdi-close size="36"></mdi-close>
      </button>
    </div>
    <div class="pt-9">
      <div
        :class="{ 'bg-gray-100': index != rangeValue }"
        class="flex flex-row w-full px-1 py-2"
        v-for="(feature, index) in geojson.features"
        :key="index"
        :id="'item' + index"
      >
        <div class="flex-grow self-center text-center pr-2">
          {{ formatDate(feature.properties.time_long).time }}
          <br />
          {{ formatDate(feature.properties.time_long).date }}
        </div>

        <div class="flex-grow self-center flex-col px-2">
          <div
            v-for="(coord, i) in feature.geometry.coordinates"
            :key="coord + index"
          >
            {{ i ? `LNG: ${coord}` : `LAT: ${coord}` }}
          </div>
        </div>
        <div class="flex-grow self-center flex-col pl-2">
          <div>Prov: {{ feature.properties.provider }}</div>
          <div>Accu: {{ feature.properties.accuracy.toFixed(2) }}</div>
          <div>Alt: {{ feature.properties.altitude.toFixed(2) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import cloneDeep from "lodash/cloneDeep";

let tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
let locale = Intl.DateTimeFormat().resolvedOptions().locale;
let icon_marker = L.divIcon({
  className: "custom-div-icon",
  html: "<div class='marker-pin'></div>",
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});
let icon_dot = L.divIcon({
  className: "custom-div-icon",
  html: "<div class='marker-dot'></div>",
  iconSize: [6, 6],
  iconAnchor: [3, 3],
});
let icon_path_start = L.divIcon({
  className: "custom-div-icon",
  html: "<div class='marker-pin-start'></div>",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});
let icon_path_end = L.divIcon({
  className: "custom-div-icon",
  html: "<div class='marker-pin-end'></div>",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

let map;
let osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  minZoom: 2,
  maxZoom: 19,
  attribution: "© OpenStreetMap",
});

let polyline = null;
let markers = [];
let marker = null;
let markerStart = null;
let markerEnd = null;
let locationCircle = null;

export default {
  data() {
    return {
      originalGeojson: null,
      geojson: null,
      coordinates: null,
      distances: null,
      distanceTraveled: null,
      avgAccuracy: null,
      rangeValue: 0,
      filterDistance: 5,
      filterDistanceInput: 5,
      bool: {
        location: true,
        locationFollow: true,
        locating: false,
        infoPopup: false,
        allMarkers: false,
        autoOpenPopups: true,
      },
    };
  },
  watch: {
    geojson(newData, oldData) {
      if (oldData) {
        this.removeLayers();
      }
      if (newData) {
        this.addLayers();
      }
      this.rangeValue = 0;
    },
    rangeValue(newData) {
      let i = newData;
      let coord = this.coordinates[i];
      this.changeMarker(coord, i);
      map.panTo(this.coordinates[i]);
      if (this.bool.infoPopup) {
        this.scrollToItem(i);
      }
    },
    filterDistanceInput(newData) {
      if (newData) {
        this.handle;
      }
    },
  },
  computed: {
    formatDate() {
      return (ts) => {
        let dateTime = new Date(ts);
        let date = dateTime.toLocaleDateString(locale, {
          timeZone: tz,
        });
        let time = dateTime.toLocaleTimeString(locale, {
          timeZone: tz,
        });
        return { date, time };
      };
    },
  },
  mounted() {
    map = L.map("map", {
      layers: [osm],
    }).fitWorld();
    this.locate();
  },
  methods: {
    locate() {
      const self = this;
      function onLocationFound(e) {
        self.bool.locating = false;
        self.addCircle(e);
      }
      function onLocationError(e) {
        self.bool.locating = false;
        self.bool.location = false;
        alert(e.message);
      }

      this.bool.locating = true;
      map.locate({
        setView: true,
        maxZoom: 16,
        watch: this.bool.locationFollow,
      });
      map.on("locationfound", onLocationFound);
      map.on("locationerror", onLocationError);
    },
    toggleLocationCircle() {
      this.bool.location = !this.bool.location;
      if (this.bool.location) {
        this.locate();
      } else {
        this.removeCircle();
        map.stopLocate();
      }
    },
    toggleLocationFollow() {
      this.bool.locationFollow = !this.bool.locationFollow;
      if (this.bool.locationFollow) {
        this.locate();
      } else {
        map.stopLocate();
      }
    },
    addCircle(e) {
      if (locationCircle) {
        this.removeCircle();
      }
      let radius = e.accuracy;
      locationCircle = L.circle(e.latlng, radius)
        .addTo(map)
        .bindPopup("Accuracy: " + radius.toFixed(2));
    },
    removeCircle() {
      locationCircle.remove();
      locationCircle = null;
    },
    addPath() {
      polyline = L.polyline(this.coordinates, {
        weight: 5,
        smoothFactor: 3,
      }).addTo(map);
      map.fitBounds(polyline.getBounds());
    },
    removePath() {
      polyline.remove();
      polyline = null;
    },
    getPopupInfo(i) {
      let dateTime = new Date(this.geojson.features[i].properties.time_long);
      let date = dateTime.toLocaleDateString(locale, {
        timeZone: tz,
      });
      let time = dateTime.toLocaleTimeString(locale, {
        timeZone: tz,
      });
      return `Date: ${date}<br/>Time: ${time}<br/>Distance from last point:<br/>${this.distances[i]}m`;
    },
    addStartEndMarkers() {
      let coordStart = this.coordinates[0];
      let coordEnd = this.coordinates[this.coordinates.length - 1];
      markerEnd = L.marker(coordEnd, { icon: icon_path_end }).addTo(map);
      markerStart = L.marker(coordStart, { icon: icon_path_start }).addTo(map);
      markerEnd.bindPopup(this.getPopupInfo(this.coordinates.length - 1));
      markerStart.bindPopup(this.getPopupInfo(0));
    },
    removeStartEndMarkers() {
      markerStart.remove();
      markerEnd.remove();
      markerStart = null;
      markerEnd = null;
    },
    changeMarker(coord, i) {
      if (marker) {
        marker.remove();
      }
      let newMarker = L.marker(coord, { icon: icon_marker }).addTo(map);
      marker = newMarker.bindPopup(this.getPopupInfo(i));
      if (this.bool.autoOpenPopups) marker.openPopup();
    },
    removeMarker() {
      if (!marker) return;
      marker.remove();
      marker = null;
    },
    addAllMarkers() {
      let arr = [];
      this.coordinates.forEach((coord, i) => {
        let marker = L.marker(coord, { icon: icon_dot }).addTo(map);
        arr.push(marker.bindPopup(this.getPopupInfo(i)));
      });
      markers = arr;
    },
    removeAllMarkers() {
      if (markers.length) {
        markers.forEach((m) => {
          m.remove();
        });
        markers = [];
      }
    },
    toggleAllMarkers() {
      this.bool.allMarkers = !this.bool.allMarkers;
      if (this.bool.allMarkers) {
        this.addAllMarkers();
      } else {
        this.removeAllMarkers();
      }
    },
    addLayers() {
      this.addPath();
      this.addStartEndMarkers();
    },
    removeLayers() {
      this.removePath();
      this.removeStartEndMarkers();
      this.removeAllMarkers();
      this.removeMarker();
    },
    openFilePicker() {
      this.$refs.fileInput.click();
    },
    handleFilePicker(event) {
      if (event.target.files.length) {
        let file = event.target.files[0];
        let reader = new FileReader();
        reader.onload = this.handleFile;
        reader.readAsText(file);
      }
    },
    handleFile(event) {
      let geojson = JSON.parse(event.target.result);
      this.changeGeojsonData(geojson);
      this.$refs.fileInput.value = "";
    },
    changeGeojsonData(data) {
      this.originalGeojson = cloneDeep(data);
      let { distance, avgAccuracy } = this.getTraveledDistance(data);
      let { geojson, distances } = this.denoiseGeojson(
        data,
        this.filterDistance
      );

      this.geojson = cloneDeep(geojson);
      let features = cloneDeep(geojson.features);
      this.coordinates = features.map((feature) =>
        feature.geometry.coordinates.reverse()
      );
      this.distances = distances;
      this.distanceTraveled = distance;
      this.avgAccuracy = avgAccuracy;
    },
    denoiseGeojson(data, threshold) {
      let geojson = data;
      let features = cloneDeep(geojson.features);
      let cleanedFeatures = [];
      let distances = [0];
      features.forEach((feature, i) => {
        let l = features.length - 1;
        let coord = feature.geometry.coordinates;
        if (i) {
          let oldCoord = features[i - 1].geometry.coordinates;
          let distance = map.distance(oldCoord, coord);
          distances.push(distance.toFixed(2));
          let valid = distance > threshold && i != l;
          if (valid) {
            cleanedFeatures.push(feature);
          }
        }
        if (!i || i == l) cleanedFeatures.push(feature);
      });
      geojson.features = cleanedFeatures;
      return { geojson, distances };
    },
    getTraveledDistance(data) {
      let accuracyArr = data.features.map(
        (feature) => feature.properties.accuracy
      );
      let avgAccuracy =
        accuracyArr.reduce((partialSum, a) => partialSum + a, 0) /
        accuracyArr.length;
      let { geojson } = this.denoiseGeojson(data, avgAccuracy);
      let coordinates = geojson.features.map(
        (feature) => feature.geometry.coordinates
      );
      let totalDistance = 0;
      coordinates.forEach((coord, i) => {
        if (i < coordinates.length - 1) {
          let nextCoord = coordinates[i + 1];
          let distance = map.distance(coord, nextCoord);
          totalDistance += distance;
        }
      });
      return { distance: totalDistance, avgAccuracy };
    },
    evaluateDistanceFilterInput() {
      if (!this.filterDistanceInput) {
        this.filterDistanceInput = this.filterDistance;
        return;
      }
      if (this.filterDistanceInput != this.filterDistance) {
        this.filterDistance = this.filterDistanceInput;
        if (!this.geojson) return;
        this.changeGeojsonData(this.originalGeojson);
      }
    },
    toggleInfoPopup() {
      this.bool.infoPopup = !this.bool.infoPopup;
    },
    togglePopups() {
      this.bool.autoOpenPopups = !this.bool.autoOpenPopups;
    },
    scrollToItem(i) {
      const element = document.getElementById("item" + i);
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    skipMarker(bool) {
      let end = this.rangeValue == this.geojson.features.length - 1;
      let start = this.rangeValue == 0;
      if (bool && !end) this.rangeValue++;
      if (!bool && !start) this.rangeValue--;
    },
  },
};
</script>

<style>
#map {
  height: 100%;
  width: 100vw;
}
.hover:hover {
  background-color: #e5e7eb;
}
.onDisabled:disabled {
  background-color: #d3d3d3;
}
.onDisabled-light:disabled {
  opacity: 0.4;
}
.disabled {
  background-color: #d3d3d3;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.filter-input::-webkit-outer-spin-button,
.filter-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.filter-input {
  -moz-appearance: textfield;
  width: 46px;
  height: 46px;
  font-size: 1.5rem;
  text-align: center;
}
.slider {
  -webkit-appearance: none;
  width: 100%;
  height: 11px;
  border-radius: 5px;
  background: #d3d3d3;
  outline: none;
  opacity: 0.7;
  -webkit-transition: 0.2s;
  transition: opacity 0.2s;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 25px;
  height: 25px;
  border-radius: 50%;
  background: #3388ff;
  cursor: pointer;
}

.slider:disabled::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 25px;
  height: 25px;
  border-radius: 50%;
  background: #d3d3d3;
  cursor: default;
}

.slider::-moz-range-thumb {
  width: 25px;
  height: 25px;
  border-radius: 50%;
  background: #3388ff;
  cursor: pointer;
}
.slider:disabled::-moz-range-thumb {
  width: 25px;
  height: 25px;
  border-radius: 50%;
  background: #d3d3d3;
  cursor: default;
}
.toolbar-bottom {
  position: absolute;
  bottom: 1.5rem;
  left: 0.5rem;
  width: calc(100% - 1rem);
}
.leaflet-borders {
  border-radius: 2px;
  outline: rgba(0, 0, 0, 25%) solid 2px;
}
.popup {
  z-index: 2000;
  position: absolute;
  left: 0.5rem;
  top: 0.5rem;
  height: calc(100% - 7rem);
  width: calc(100vw - 1rem);
  border-radius: 2px;
  outline: rgba(0, 0, 0, 25%) solid 2px;
  overflow-y: scroll;
}
.popup-top-bar {
  position: fixed;
  width: calc(100vw - 1rem);
  background-color: white;
}
.marker-pin {
  width: 10px;
  height: 10px;
  border-radius: 100%;
  background: white;
  outline: rgba(0, 0, 0, 25%) solid 2px;
  position: absolute;
}
.marker-pin::after {
  content: "";
  width: 4px;
  height: 4px;
  margin: 3px 0 0 3px;
  background: black;
  position: absolute;
  border-radius: 50%;
}
.marker-pin-start {
  width: 16px;
  height: 16px;
  border-radius: 100%;
  background: white;
  outline: rgba(0, 0, 0, 25%) solid 2px;
  position: absolute;
}
.marker-pin-start::after {
  content: "";
  width: 6px;
  height: 6px;
  margin: 5px 0 0 5px;
  background: black;
  position: absolute;
  border-radius: 50%;
}
.marker-pin-end {
  width: 16px;
  height: 16px;
  border-radius: 100%;
  background: black;
  outline: rgba(0, 0, 0, 25%) solid 2px;
  position: absolute;
}
.marker-pin-end::after {
  content: "";
  width: 6px;
  height: 6px;
  margin: 5px 0 0 5px;
  background: white;
  position: absolute;
  border-radius: 50%;
}
.marker-dot {
  width: 6px;
  height: 6px;
  border-radius: 100%;
  background: white;
  outline: rgba(0, 0, 0, 25%) solid 2px;
  position: absolute;
}
</style>
