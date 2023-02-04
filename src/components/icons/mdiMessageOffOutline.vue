<template>
  <svg-icon type="mdi" :path="path"></svg-icon>
</template>

<script>
import SvgIcon from "@jamescoyle/vue-icon";
import { mdiMessageOffOutline } from "@mdi/js";

export default {
  name: "mdiMessageOffOutline",

  components: {
    SvgIcon,
  },
  data() {
    return {
      path: mdiMessageOffOutline,
    };
  },
};
</script>
