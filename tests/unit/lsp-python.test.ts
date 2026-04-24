import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { LspPythonPlugin } from "../../src/plugins/lsp-python/index.js";
import type { AnalysisContext } from "../../src/core/types.js";

const fixturesDir = resolve(import.meta.dirname, "../fixtures");

describe("LspPythonPlugin", () => {
	const plugin = new LspPythonPlugin();

	it("has correct capabilities", () => {
		expect(plugin.name).toBe("lsp-python");
		expect(plugin.capabilities.report).toBe(true);
	});

	it("detects dead private functions in Python", async () => {
		const ctx: AnalysisContext = {
			rootPath: resolve(fixturesDir, "py-dead-function"),
			projectPath: resolve(fixturesDir, "py-dead-function"),
			entryPoints: [],
			ignoreGlobs: [],
			ignoreSymbols: [],
			ignorePragmas: [],
			includeExports: true,
			historyMode: "off",
		};

		const result = await plugin.analyze(ctx);

		const deadFn = result.findings.find((f) => f.name === "dead_function");
		expect(deadFn).toBeDefined();
		expect(deadFn?.confidence).toBe("suspected-dead");
		expect(deadFn?.kind).toBe("symbol");

		const unusedHelper = result.findings.find((f) => f.name === "unused_helper");
		expect(unusedHelper).toBeDefined();
		expect(unusedHelper?.confidence).toBe("suspected-dead");

		const usedFn = result.findings.find((f) => f.name === "used_function");
		expect(usedFn).toBeUndefined();

		const publicApi = result.findings.find((f) => f.name === "public_api");
		expect(publicApi).toBeUndefined();
	});

	it("returns empty for directories with no Python files", async () => {
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
