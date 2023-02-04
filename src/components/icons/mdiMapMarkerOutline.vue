<template>
  <svg-icon type="mdi" :path="path"></svg-icon>
</template>

<script>
import SvgIcon from "@jamescoyle/vue-icon";
import { mdiMapMarkerOutline } from "@mdi/js";

export default {
  name: "mdiMapMarkerOutline",

  components: {
    SvgIcon,
  },
  data() {
    return {
      path: mdiMapMarkerOutline,
    };
  },
};
</script>
