import { defineConfig, loadEnv } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ mode }) => {
  const env = {
    ...loadEnv(mode, process.cwd(), ""),
    NODE_ENV: mode === "production" ? "production" : "development",
  };

  return {
    define: {
      "globalThis.process": JSON.stringify({ env }),
      "process.env": JSON.stringify(env),
    },
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: {
          name: "rsc",
          childEnvironments: ["ssr"],
        },
      }),
    ],
  };
});
