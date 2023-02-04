<template>
  <svg-icon type="mdi" :path="path"></svg-icon>
</template>

<script>
import SvgIcon from "@jamescoyle/vue-icon";
import { mdiCrosshairsGps } from "@mdi/js";

export default {
  name: "mdiCrosshairsGps",

  components: {
    SvgIcon,
  },
  data() {
    return {
      path: mdiCrosshairsGps,
    };
  },
};
</script>
