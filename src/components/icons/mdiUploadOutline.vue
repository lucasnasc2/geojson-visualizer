<template>
  <svg-icon type="mdi" :path="path"></svg-icon>
</template>

<script>
import SvgIcon from "@jamescoyle/vue-icon";
import { mdiUploadOutline } from "@mdi/js";

export default {
  name: "mdiUploadOutline",

  components: {
    SvgIcon,
  },
  data() {
    return {
      path: mdiUploadOutline,
    };
  },
};
</script>
