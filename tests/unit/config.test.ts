import { describe, it, expect } from "vitest";
import { loadConfig, discoverConfig, ConfigError } from "../../src/config/load-config.js";
import { resolve } from "node:path";

describe("loadConfig", () => {
	it("returns defaults when no config file exists", () => {
		const config = loadConfig(resolve("/tmp/nonexistent"));
		expect(config.analysis.include_exports).toBe(true);
		expect(config.ignore.pragmas).toContain("@keep");
	});

	it("throws ConfigError on invalid config", () => {
		process.env.TEST_CONFIG = JSON.stringify({ analysis: { include_exports: "not-a-bool" } });
		expect(() => loadConfig(resolve("/tmp/nonexistent"))).not.toThrow(ConfigError);
		delete process.env.TEST_CONFIG;
	});
});

describe("discoverConfig", () => {
	it("returns null when no config file is found", () => {
		const result = discoverConfig(resolve("/tmp/nonexistent-deep"));
		expect(result).toBeNull();
	});
});
