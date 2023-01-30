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
      :disabled="!this.geojson"
      @click="toggleInfoPopup()"
      class="disabled leaflet-borders p-1 mb-2 bg-white hover"
    >
      <database-marker-outline size="36"></database-marker-outline>
    </button>
    <button
      :disabled="this.bool.locating"
      @click="this.locate()"
      class="disabled leaflet-borders p-2 mb-2 bg-white hover"
    >
      <crosshairs v-if="this.bool.locating" size="30"></crosshairs>
      <crosshairs-gps v-else size="30"></crosshairs-gps>
    </button>
    <button
      :disabled="!this.geojson"
      @click="this.toggleAllMarkers()"
      class="disabled leaflet-borders p-2 bg-white hover"
      :class="{ disabled: !this.bool.allMarkers }"
    >
      <map-marker-multiple-outline size="30"></map-marker-multiple-outline>
    </button>
  </div>

  <div class="inline-flex toolbar-bottom leaflet-borders z-1000 bg-white p-3">
    <div class="self-center w-full mr-4">
      <input
        :disabled="!this.geojson"
        type="range"
        :min="0"
        :max="this.geojson ? this.geojson.features.length - 1 : 0"
        v-model="this.rangeValue"
        class="slider"
        id="myRange"
      />
    </div>
    <button
      @click="openFilePicker"
      class="disabled leaflet-borders p-1 bg-white hover"
    >
      <upload-outline size="36"></upload-outline>
    </button>
  </div>
  <div v-if="this.bool.infoPopup" class="no-scrollbar popup bg-white">
    <div class="popup-top-bar flex content-between">
      <span class="flex-grow self-center pl-2 text-2xl">{{
        geojson.features.length
      }}</span>
      <span class="flex-grow self-center pl-2 text-2xl">Marker info</span>
      <button @click="toggleInfoPopup()" class="disabled p-1 bg-white hover">
        <close size="36"></close>
      </button>
    </div>
    <div class="pt-9">
      <div
        :class="{ 'bg-gray-100': index != this.rangeValue }"
        class="flex flex-row w-full px-4 py-2"
        v-for="(feature, index) in geojson.features"
        :key="index"
        :id="'item' + index"
      >
        <div class="self-center text-center pr-2">
          {{ feature.properties.time }}
        </div>
        <div class="flex-col px-2">
          <div>{{ feature.properties.provider }}</div>
          <div>{{ feature.properties.accuracy }}</div>
          <div>{{ feature.properties.altitude.toFixed(2) }}</div>
        </div>
        <div class="pl-2">{{ feature.geometry.coordinates }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import uploadOutline from "./icons/uploadOutline.vue";
import databaseMarkerOutline from "./icons/databaseMarkerOutline.vue";
import crosshairsGps from "./icons/crosshairsGps.vue";
import crosshairs from "./icons/crosshairs.vue";
import close from "./icons/close.vue";
import cloneDeep from "lodash/cloneDeep";
import mapMarkerMultipleOutline from "./icons/MapMarkerMultipleOutline.vue";
let map;
let osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  minZoom: 2,
  maxZoom: 19,
  attribution: "© OpenStreetMap",
});
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

let polyline = null;
let markers = [];
let marker = null;
let markerStart = null;
let markerEnd = null;
let locationCircle = null;

export default {
  components: {
    uploadOutline,
    databaseMarkerOutline,
    crosshairsGps,
    crosshairs,
    close,
    mapMarkerMultipleOutline,
  },
  data() {
    return {
      originalGeojson: null,
      geojson: null,
      coordinates: null,
      rangeValue: 0,
      filterDistance: 5,
      bool: {
        locating: false,
        infoPopup: false,
        allMarkers: false,
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
  },
  computed: {},
  mounted() {
    map = L.map("map", {
      layers: [osm],
    }).fitWorld();
    this.locate();
  },
  methods: {
    locate() {
      this.bool.locating = true;
      map.locate({ setView: true, maxZoom: 16 });
      const self = this;
      function onLocationFound(e) {
        self.bool.locating = false;
        self.addCircle(e);
      }
      map.on("locationfound", onLocationFound);

      function onLocationError(e) {
        self.bool.locating = false;
        alert(e.message);
      }
      map.on("locationerror", onLocationError);
    },
    addCircle(e) {
      if (locationCircle) {
        this.removeCircle();
      }
      let radius = e.accuracy;
      locationCircle = L.circle(e.latlng, radius)
        .addTo(map)
        .bindPopup("You are within this " + radius + " meters radius");
    },
    removeCircle() {
      locationCircle.remove();
      locationCircle = null;
    },
    addPath() {
      polyline = L.polyline(this.coordinates, {
        weight: 7,
        smoothFactor: 3,
      }).addTo(map);
      map.fitBounds(polyline.getBounds());
    },
    removePath() {
      polyline.remove();
      polyline = null;
    },
    getPopupInfo(i) {
      let tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      let dateTime = new Date(this.geojson.features[i].properties.time_long);
      let date = dateTime.toLocaleDateString("en-US", {
        timeZone: tz,
      });
      let time = dateTime.toLocaleTimeString("it-IT", {
        timeZone: tz,
      });
      return `${time}<br/>${date}`;
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
      marker = newMarker.bindPopup(this.getPopupInfo(i)).openPopup();
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
    },
    changeGeojsonData(geojson) {
      this.originalGeojson = cloneDeep(geojson);
      let cleaned = this.denoiseGeojson(geojson);
      this.geojson = cloneDeep(cleaned);
      let features = cloneDeep(cleaned.features);
      this.coordinates = features.map((feature) =>
        feature.geometry.coordinates.reverse()
      );
    },
    denoiseGeojson(data) {
      let threshold = this.filterDistance;
      let geojson = data;
      let features = cloneDeep(geojson.features);
      let cleanedFeatures = [];
      features.forEach((feature, i) => {
        let l = features.length - 1;
        let coord = feature.geometry.coordinates;
        if (i && i != l) {
          let oldCoord = features[i - 1].geometry.coordinates;
          let distance = map.distance(oldCoord, coord);
          let valid = distance > threshold;
          if (valid) {
            cleanedFeatures.push(feature);
          }
        } else {
          cleanedFeatures.push(feature);
        }
      });
      geojson.features = cleanedFeatures;
      return geojson;
    },
    toggleInfoPopup() {
      this.bool.infoPopup = !this.bool.infoPopup;
    },
    scrollToItem(i) {
      const element = document.getElementById("item" + i);
      element.scrollIntoView({ behavior: "smooth", block: "center" });
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
.disabled:disabled {
  background-color: #d3d3d3;
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
