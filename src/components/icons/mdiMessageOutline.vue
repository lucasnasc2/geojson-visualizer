<template>
  <svg-icon type="mdi" :path="path"></svg-icon>
</template>

<script>
import SvgIcon from "@jamescoyle/vue-icon";
import { mdiMessageOutline } from "@mdi/js";

export default {
  name: "mdiMessageOutline",

  components: {
    SvgIcon,
  },
  data() {
    return {
      path: mdiMessageOutline,
    };
  },
};
</script>
