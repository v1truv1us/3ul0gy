import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { generateSarif } from "../../src/output/write-sarif-report.js";
import { runAnalysis } from "../../src/core/run-analysis.js";
import { loadConfig } from "../../src/config/load-config.js";
import type { Report } from "../../src/core/types.js";

const fixturesDir = resolve(import.meta.dirname, "../fixtures");

describe("SARIF output", () => {
	it("produces valid SARIF 2.1.0 structure", async () => {
		const projectPath = resolve(fixturesDir, "ts-dead-private");
		const config = loadConfig(projectPath);
		const report = await runAnalysis(projectPath, config);
		const sarif = generateSarif(report);

		expect(sarif).toHaveProperty("$schema");
		expect(sarif).toHaveProperty("version", "2.1.0");
		expect(sarif).toHaveProperty("runs");
		expect(sarif.runs).toHaveLength(1);

		const run = sarif.runs[0];
		expect(run.tool.driver.name).toBe("3ul0gy");
		expect(run.tool.driver.rules.length).toBeGreaterThan(0);
		expect(run.results.length).toBeGreaterThan(0);

		const result = run.results[0];
		expect(result).toHaveProperty("ruleId");
		expect(result).toHaveProperty("level");
		expect(result).toHaveProperty("message");
		expect(result).toHaveProperty("locations");
		expect(result.locations[0].physicalLocation.artifactLocation).toHaveProperty("uri");
		expect(result.locations[0].physicalLocation.region).toHaveProperty("startLine");
	});

	it("maps confidence to SARIF levels", async () => {
		const projectPath = resolve(fixturesDir, "ts-unused-export");
		const config = loadConfig(projectPath);
		const report = await runAnalysis(projectPath, config);
		const sarif = generateSarif(report);

		const levels = sarif.runs[0].results.map((r: { level: string }) => r.level);
		expect(levels.some((l: string) => ["error", "warning", "note"].includes(l))).toBe(true);
	});

	it("produces correct rules from findings", async () => {
		const projectPath = resolve(fixturesDir, "ts-dead-private");
		const config = loadConfig(projectPath);
		const report = await runAnalysis(projectPath, config);
		const sarif = generateSarif(report);

		const rules = sarif.runs[0].tool.driver.rules;
		for (const rule of rules) {
			expect(rule).toHaveProperty("id");
			expect(rule).toHaveProperty("shortDescription");
			expect(rule).toHaveProperty("defaultConfiguration");
			expect(rule.defaultConfiguration).toHaveProperty("level");
		}
	});
});
