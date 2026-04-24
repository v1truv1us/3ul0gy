import type { Config } from "../config/config-schema.js";
import type {
	AnalysisContext,
	AnalysisResult,
	FindingKind,
	Plugin,
	Report,
	ReportSummary,
} from "../core/types.js";
import { DepsNpmPlugin } from "../plugins/deps-npm/index.js";
import { LspPythonPlugin } from "../plugins/lsp-python/index.js";
import { LspTypescriptPlugin } from "../plugins/lsp-typescript/index.js";
import { resolveEntryPoints } from "./entry-points.js";

const BUILTIN_PLUGINS: Plugin[] = [
	new DepsNpmPlugin(),
	new LspTypescriptPlugin(),
	new LspPythonPlugin(),
];

export async function runAnalysis(
	rootPath: string,
	config: Config,
	pluginOverrides?: string[],
): Promise<Report> {
	const startTime = performance.now();
	const entryPoints = resolveEntryPoints(rootPath, config.project.entry_points);

	const ctx: AnalysisContext = {
		rootPath,
		projectPath: rootPath,
		entryPoints,
		ignoreGlobs: config.ignore.globs,
		ignoreSymbols: config.ignore.symbols,
		ignorePragmas: config.ignore.pragmas,
		includeExports: config.analysis.include_exports,
		historyMode: "off",
	};

	const enabledPlugins = selectPlugins(config.plugins.enabled, pluginOverrides);
	const results: AnalysisResult[] = [];

	for (const plugin of enabledPlugins) {
		try {
			const result = await plugin.analyze(ctx);
			results.push(result);
		} catch {
			results.push({
				findings: [],
				durationMs: 0,
				pluginName: plugin.name,
			});
		}
	}

	const allFindings = results.flatMap((r) => r.findings);
	const totalDuration = performance.now() - startTime;

	const summary = buildSummary(allFindings, totalDuration);

	return {
		schemaVersion: "1.0.0",
		generatedAt: new Date().toISOString(),
		mode: "report",
		rootPath,
		findings: allFindings,
		summary,
	};
}

function selectPlugins(configEnabled: string[], overrides?: string[]): Plugin[] {
	const requested = overrides ?? configEnabled;
	if (requested.length === 0) return BUILTIN_PLUGINS;
	return BUILTIN_PLUGINS.filter((p) => requested.includes(p.name));
}

function buildSummary(
	findings: Awaited<ReturnType<typeof runAnalysis>> extends { findings: infer F } ? F : never,
	durationMs: number,
): ReportSummary {
	const confirmed = findings.filter((f) => f.confidence === "confirmed-dead").length;
	const suspected = findings.filter((f) => f.confidence === "suspected-dead").length;
	const lowConfidence = findings.filter((f) => f.confidence === "low-confidence").length;

	const byPlugin: Record<string, number> = {};
	const byKind: Record<string, number> = {};

	for (const f of findings) {
		byPlugin[f.plugin] = (byPlugin[f.plugin] ?? 0) + 1;
		byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;
	}

	return {
		total: findings.length,
		confirmed,
		suspected,
		lowConfidence,
		byPlugin,
		byKind: byKind as Record<FindingKind, number>,
		durationMs,
	};
}
