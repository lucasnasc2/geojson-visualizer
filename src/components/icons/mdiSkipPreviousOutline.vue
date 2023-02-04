<template>
  <svg-icon type="mdi" :path="path"></svg-icon>
</template>

<script>
import SvgIcon from "@jamescoyle/vue-icon";
import { mdiSkipPreviousOutline } from "@mdi/js";

export default {
  name: "mdiSkipPreviousOutline",

  components: {
    SvgIcon,
  },
  data() {
    return {
      path: mdiSkipPreviousOutline,
    };
  },
};
</script>
