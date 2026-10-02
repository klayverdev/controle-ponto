import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "controle-ponto",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-02",
    compatibilityFlags: ["nodejs_compat", "nodejs_compat_populate_process_env"],
    assets: { notFoundHandling: "none" },
    env: {
      ASSETS: bindings.assets(),
    },
  }),
});
