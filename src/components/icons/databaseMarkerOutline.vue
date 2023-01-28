<template>
  <svg-icon type="mdi" :path="path"></svg-icon>
</template>

<script>
import SvgIcon from "@jamescoyle/vue-icon";
import { mdiDatabaseMarkerOutline } from "@mdi/js";

export default {
  name: "my-cool-component",

  components: {
    SvgIcon,
  },
  data() {
    return {
      path: mdiDatabaseMarkerOutline,
    };
  },
};
</script>
