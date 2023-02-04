<template>
  <svg-icon type="mdi" :path="path"></svg-icon>
</template>

<script>
import SvgIcon from "@jamescoyle/vue-icon";
import { mdiCrosshairs } from "@mdi/js";

export default {
  name: "mdiCrosshairs",

  components: {
    SvgIcon,
  },
  data() {
    return {
      path: mdiCrosshairs,
    };
  },
};
</script>
