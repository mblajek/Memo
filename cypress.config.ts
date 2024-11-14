import {defineConfig} from "cypress";

export default defineConfig({
  e2e: {
    viewportWidth: 1280,
    viewportHeight: 800,
    baseUrl: "http://localhost:9081/",
    setupNodeEvents(_on, _config) {},
  },
});
