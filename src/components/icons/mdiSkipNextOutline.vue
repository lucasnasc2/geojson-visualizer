<template>
  <svg-icon type="mdi" :path="path"></svg-icon>
</template>

<script>
import SvgIcon from "@jamescoyle/vue-icon";
import { mdiSkipNextOutline } from "@mdi/js";

export default {
  name: "mdiSkipNextOutline",

  components: {
    SvgIcon,
  },
  data() {
    return {
      path: mdiSkipNextOutline,
    };
  },
};
</script>
