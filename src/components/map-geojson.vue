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
      :disabled="this.locating"
      @click="this.locate()"
      class="disabled leaflet-borders p-2 bg-white hover"
    >
      <crosshairs v-if="this.locating" size="30"></crosshairs>
      <crosshairs-gps v-else size="30"></crosshairs-gps>
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
  <div v-if="infoPopup" class="no-scrollbar popup bg-white">
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
let map;
let osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  minZoom: 2,
  maxZoom: 19,
  attribution: "© OpenStreetMap",
});
let icon = L.divIcon({
  className: "custom-div-icon",
  html: "<div class='marker-pin'></div>",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export default {
  components: {
    uploadOutline,
    databaseMarkerOutline,
    crosshairsGps,
    crosshairs,
    close,
  },
  data() {
    return {
      geojson: null,
      coordinates: null,
      rangeValue: 0,
      markers: [],
      locationCircle: null,
      locating: false,
      infoPopup: false,
    };
  },
  watch: {
    geojson(newData) {
      if (newData) {
        this.addGeojsonLayers();
      }
    },
    rangeValue(newData) {
      let i = newData;
      this.markers[i].openPopup();
      map.panTo(this.coordinates[i]);
      if (this.infoPopup) {
        const element = document.getElementById("item" + i);
        element.scrollIntoView({ behavior: "smooth", block: "center" });
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
      this.locating = true;
      map.locate({ setView: true, maxZoom: 16 });
      const self = this;
      function onLocationFound(e) {
        self.locating = false;
        self.getCircle(e);
      }
      map.on("locationfound", onLocationFound);

      function onLocationError(e) {
        self.locating = false;
        alert(e.message);
      }
      map.on("locationerror", onLocationError);
    },
    getCircle(e) {
      if (this.locationCircle) {
        this.locationCircle.remove();
        this.locationCircle = null;
      }
      let radius = e.accuracy;
      this.locationCircle = L.circle(e.latlng, radius)
        .addTo(map)
        .bindPopup("You are within this " + radius + " meters radius");
    },
    getLine() {
      let polyline = L.polyline(this.coordinates, {
        weight: 7,
        smoothFactor: 3,
      }).addTo(map);
      map.fitBounds(polyline.getBounds());
      return polyline;
    },
    getMarkers() {
      let markers = [];
      this.coordinates.forEach((coord, i) => {
        let marker = L.marker(coord, { icon: icon }).addTo(map);
        let popupInfo = `${this.geojson.features[i].properties.time}<br>
        ${coord}`;
        markers.push(
          i == 0
            ? marker.bindPopup(popupInfo).openPopup()
            : marker.bindPopup(popupInfo)
        );
      });
      this.markers = markers;
      return markers;
    },
    addGeojsonLayers() {
      this.getMarkers();
      this.getLine();
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
      let cleaned = this.denoiseGeojson(geojson);
      this.changeGeojsonData(cleaned);
    },
    changeGeojsonData(data) {
      this.geojson = data;
      let features = cloneDeep(data.features);
      this.coordinates = features.map((feature) =>
        feature.geometry.coordinates.reverse()
      );
    },
    denoiseGeojson(data, threshold = 5) {
      let geojson = data;
      let features = cloneDeep(geojson.features);
      let cleanedFeatures = [];
      features.forEach((feature, i) => {
        let coord = feature.geometry.coordinates;
        if (i) {
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
      this.infoPopup = !this.infoPopup;
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
  width: 16px;
  height: 16px;
  border-radius: 100%;
  background: white;
  outline: rgba(0, 0, 0, 25%) solid 2px;
  position: absolute;
}
.marker-pin::after {
  content: "";
  width: 6px;
  height: 6px;
  margin: 5px 0 0 5px;
  background: black;
  position: absolute;
  border-radius: 50%;
}
</style>
