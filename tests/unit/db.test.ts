import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("worker runtime safety", () => {
    it("populates process.env in the Cloudflare runtime", () => {
        const config = readFileSync(new URL("../../cloudflare.config.ts", import.meta.url), "utf8");

        expect(config).toContain("nodejs_compat_populate_process_env");
    });
});
