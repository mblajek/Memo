import {defineConfig, devices} from "@playwright/test";
import {loadConfig} from "./lib/config.ts";
// Loaded here to be in effect in every process of a run.
import "./lib/init_luxon.ts";

const cfg = await loadConfig();

export default defineConfig({
  testDir: "./specs",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // The progress lines rely on coming after the list reporter and on the single worker.
  reporter: [["list"], ["./lib/progress_reporter.ts"], ["html", {open: "never", outputFolder: "./playwright-report"}]],
  outputDir: "./test-results",
  timeout: 60_000,
  expect: {timeout: 10_000},

  globalSetup: "./global_setup.ts",

  use: {
    baseURL: cfg.ui.baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  // Each test is in one kind of project: the ones that only talk to the server run once, the ones
  // that drive a page (tagged `@ui`) run in each browser. With one worker, the projects run one
  // after another; `--project=<name>` picks some of them.
  projects: [
    {
      name: "api",
      grepInvert: /@ui/,
    },
    {
      name: "chromium",
      grep: /@ui/,
      use: {...devices["Desktop Chrome"]},
    },
    {
      name: "firefox",
      grep: /@ui/,
      use: {...devices["Desktop Firefox"]},
    },
  ],
});
