import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./index.css";

const app = createApp(App);

const components = import.meta.globEager("./components/icons/*.vue");
Object.entries(components).forEach(([path, definition]) => {
  const componentName = path
    .split("/")
    .pop()
    .replace(/\.\w+$/, "");
  app.component(componentName, definition.default);
});

app.use(createPinia());

app.mount("#app");
