import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { DepsNpmPlugin } from "../../src/plugins/deps-npm/index.js";
import type { AnalysisContext } from "../../src/core/types.js";

const fixturesDir = resolve(import.meta.dirname, "../fixtures");

describe("DepsNpmPlugin", () => {
	const plugin = new DepsNpmPlugin();

	it("has correct capabilities", () => {
		expect(plugin.name).toBe("deps-npm");
		expect(plugin.capabilities.report).toBe(true);
	});

	it("detects unused dependencies", async () => {
		const ctx: AnalysisContext = {
			rootPath: resolve(fixturesDir, "ts-unused-dep"),
			projectPath: resolve(fixturesDir, "ts-unused-dep"),
			entryPoints: [],
			ignoreGlobs: ["**/node_modules/**"],
			ignoreSymbols: [],
			ignorePragmas: ["@keep"],
			includeExports: true,
			historyMode: "off",
		};

		const result = await plugin.analyze(ctx);
		expect(result.pluginName).toBe("deps-npm");
		expect(result.findings.length).toBeGreaterThanOrEqual(1);

		const lodashFinding = result.findings.find((f) => f.name === "lodash");
		expect(lodashFinding).toBeDefined();
		expect(lodashFinding?.confidence).toBe("confirmed-dead");
		expect(lodashFinding?.kind).toBe("dependency");
	});

	it("returns empty for project with no package.json", async () => {
		const ctx: AnalysisContext = {
			rootPath: resolve(fixturesDir, "ts-dead-private"),
			projectPath: resolve(fixturesDir, "ts-dead-private"),
			entryPoints: [],
			ignoreGlobs: [],
			ignoreSymbols: [],
			ignorePragmas: [],
			includeExports: true,
			historyMode: "off",
		};

		const result = await plugin.analyze(ctx);
		expect(result.findings).toEqual([]);
	});
});
