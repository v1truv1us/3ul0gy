import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { LspTypescriptPlugin } from "../../src/plugins/lsp-typescript/index.js";
import type { AnalysisContext } from "../../src/core/types.js";

const fixturesDir = resolve(import.meta.dirname, "../fixtures");

describe("LspTypescriptPlugin", () => {
	const plugin = new LspTypescriptPlugin();

	it("has correct capabilities", () => {
		expect(plugin.name).toBe("lsp-typescript");
		expect(plugin.capabilities.report).toBe(true);
	});

	it("detects dead private functions", async () => {
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
		const dead = result.findings.find((f) => f.name === "deadFunction");
		expect(dead).toBeDefined();
		expect(dead?.confidence).toBe("confirmed-dead");
		expect(dead?.kind).toBe("symbol");
	});

	it("detects unused exports as suspected", async () => {
		const ctx: AnalysisContext = {
			rootPath: resolve(fixturesDir, "ts-unused-export"),
			projectPath: resolve(fixturesDir, "ts-unused-export"),
			entryPoints: [],
			ignoreGlobs: [],
			ignoreSymbols: [],
			ignorePragmas: [],
			includeExports: true,
			historyMode: "off",
		};

		const result = await plugin.analyze(ctx);
		const unused = result.findings.find((f) => f.name === "exportedNeverUsed");
		expect(unused).toBeDefined();
		expect(unused?.confidence).toBe("suspected-dead");

		const used = result.findings.find((f) => f.name === "exportedAndUsed");
		expect(used).toBeUndefined();
	});

	it("does not flag entry point files", async () => {
		const ctx: AnalysisContext = {
			rootPath: resolve(fixturesDir, "ts-entry-point"),
			projectPath: resolve(fixturesDir, "ts-entry-point"),
			entryPoints: ["main.ts"],
			ignoreGlobs: [],
			ignoreSymbols: [],
			ignorePragmas: [],
			includeExports: true,
			historyMode: "off",
		};

		const result = await plugin.analyze(ctx);
		const publicApi = result.findings.find((f) => f.name === "publicApi");
		expect(publicApi).toBeUndefined();
	});

	it("detects dead private functions in JS files", async () => {
		const ctx: AnalysisContext = {
			rootPath: resolve(fixturesDir, "js-dead-private"),
			projectPath: resolve(fixturesDir, "js-dead-private"),
			entryPoints: [],
			ignoreGlobs: [],
			ignoreSymbols: [],
			ignorePragmas: [],
			includeExports: true,
			historyMode: "off",
		};

		const result = await plugin.analyze(ctx);
		const dead = result.findings.find((f) => f.name === "deadHelper");
		expect(dead).toBeDefined();
		expect(dead?.confidence).toBe("confirmed-dead");
		expect(dead?.kind).toBe("symbol");

		const used = result.findings.find((f) => f.name === "usedHelper");
		expect(used).toBeUndefined();
	});

	it("detects CommonJS exports and their usage", async () => {
		const ctx: AnalysisContext = {
			rootPath: resolve(fixturesDir, "js-commonjs-exports"),
			projectPath: resolve(fixturesDir, "js-commonjs-exports"),
			entryPoints: ["index.js"],
			ignoreGlobs: [],
			ignoreSymbols: [],
			ignorePragmas: [],
			includeExports: true,
			historyMode: "off",
		};

		const result = await plugin.analyze(ctx);

		const neverCalled = result.findings.find((f) => f.name === "neverCalledExport");
		expect(neverCalled).toBeDefined();
		expect(neverCalled?.confidence).toBe("suspected-dead");

		const internalDead = result.findings.find((f) => f.name === "internalDead");
		expect(internalDead).toBeDefined();
		expect(internalDead?.confidence).toBe("confirmed-dead");
	});

	it("detects dead var functions and mixed JS patterns", async () => {
		const ctx: AnalysisContext = {
			rootPath: resolve(fixturesDir, "js-mixed"),
			projectPath: resolve(fixturesDir, "js-mixed"),
			entryPoints: [],
			ignoreGlobs: [],
			ignoreSymbols: [],
			ignorePragmas: [],
			includeExports: true,
			historyMode: "off",
		};

		const result = await plugin.analyze(ctx);

		const deadJs = result.findings.find((f) => f.name === "deadJsFunction");
		expect(deadJs).toBeDefined();
		expect(deadJs?.confidence).toBe("confirmed-dead");

		const deadVar = result.findings.find((f) => f.name === "deadVar");
		expect(deadVar).toBeDefined();
		expect(deadVar?.confidence).toBe("confirmed-dead");

		const usedConst = result.findings.find((f) => f.name === "usedConst");
		expect(usedConst).toBeUndefined();
	});
});
