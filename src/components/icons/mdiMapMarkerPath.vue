<template>
  <svg-icon type="mdi" :path="path"></svg-icon>
</template>

<script>
import SvgIcon from "@jamescoyle/vue-icon";
import { mdiMapMarkerPath } from "@mdi/js";

export default {
  name: "mdiMapMarkerPath",

  components: {
    SvgIcon,
  },
  data() {
    return {
      path: mdiMapMarkerPath,
    };
  },
};
</script>
