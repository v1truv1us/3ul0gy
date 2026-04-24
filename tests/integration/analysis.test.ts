import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { runAnalysis } from "../../src/core/run-analysis.js";
import { loadConfig } from "../../src/config/load-config.js";

const fixturesDir = resolve(import.meta.dirname, "../fixtures");

describe("runAnalysis integration", () => {
	it("runs full pipeline on ts-dead-private", async () => {
		const projectPath = resolve(fixturesDir, "ts-dead-private");
		const config = loadConfig(projectPath);
		const report = await runAnalysis(projectPath, config);

		expect(report.schemaVersion).toBe("1.0.0");
		expect(report.mode).toBe("report");
		expect(report.findings.length).toBeGreaterThanOrEqual(1);
		expect(report.summary.total).toBe(report.findings.length);

		const dead = report.findings.find((f) => f.name === "deadFunction");
		expect(dead).toBeDefined();
	});

	it("runs full pipeline on ts-unused-dep", async () => {
		const projectPath = resolve(fixturesDir, "ts-unused-dep");
		const config = loadConfig(projectPath);
		const report = await runAnalysis(projectPath, config);

		const lodash = report.findings.find((f) => f.name === "lodash");
		expect(lodash).toBeDefined();
		expect(lodash?.kind).toBe("dependency");
	});

	it("produces valid report structure", async () => {
		const projectPath = resolve(fixturesDir, "ts-unused-export");
		const config = loadConfig(projectPath);
		const report = await runAnalysis(projectPath, config);

		expect(report).toHaveProperty("schemaVersion");
		expect(report).toHaveProperty("generatedAt");
		expect(report).toHaveProperty("mode");
		expect(report).toHaveProperty("findings");
		expect(report).toHaveProperty("summary");
		expect(report.summary).toHaveProperty("total");
		expect(report.summary).toHaveProperty("confirmed");
		expect(report.summary).toHaveProperty("suspected");
		expect(report.summary).toHaveProperty("byPlugin");
		expect(report.summary).toHaveProperty("durationMs");
	});
});
