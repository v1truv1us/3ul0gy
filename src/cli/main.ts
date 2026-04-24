import { resolve } from "node:path";
import { Command } from "commander";
import type { Config } from "../config/config-schema.js";
import { ConfigError, loadConfig } from "../config/load-config.js";
import { runAnalysis } from "../core/run-analysis.js";
import { printSummary } from "../output/print-summary.js";
import { writeJsonReport } from "../output/write-json-report.js";
import { writeSarifReport } from "../output/write-sarif-report.js";
import { EXIT_CONFIG_ERROR, EXIT_FINDINGS, EXIT_OK } from "./exit-codes.js";

export function buildProgram(): Command {
	const program = new Command();

	program
		.name("3ul0gy")
		.description("Dead code and unused dependency detector")
		.version("0.1.0")
		.argument("[path]", "project root to analyze", ".")
		.option("--json [path]", "output JSON report to file (or stdout if no path)")
		.option("--sarif [path]", "output SARIF 2.1.0 report to file (or stdout if no path)")
		.option("--plugins <names...>", "run only these plugins")
		.action(
			async (
				path: string,
				opts: { json?: string | true; sarif?: string | true; plugins?: string[] },
			) => {
				const code = await executeReport(resolve(path), opts);
				process.exitCode = code;
			},
		);

	program
		.command("report")
		.description("Analyze and report dead code (default mode)")
		.argument("[path]", "project root to analyze", ".")
		.option("--json [path]", "output JSON report to file (or stdout if no path)")
		.option("--sarif [path]", "output SARIF 2.1.0 report to file (or stdout if no path)")
		.option("--plugins <names...>", "run only these plugins")
		.action(
			async (
				path: string,
				opts: { json?: string | true; sarif?: string | true; plugins?: string[] },
			) => {
				const code = await executeReport(resolve(path), opts);
				process.exitCode = code;
			},
		);

	return program;
}

async function executeReport(
	rootPath: string,
	opts: { json?: string | true; sarif?: string | true; plugins?: string[] },
): Promise<number> {
	let config: Config;
	try {
		config = loadConfig(rootPath);
	} catch (err) {
		if (err instanceof ConfigError) {
			console.error(`Config error: ${err.message}`);
			return EXIT_CONFIG_ERROR;
		}
		throw err;
	}

	const report = await runAnalysis(rootPath, config, opts.plugins);

	if (opts.sarif !== undefined) {
		writeSarifReport(report, opts.sarif === true ? undefined : opts.sarif);
	} else if (opts.json !== undefined) {
		writeJsonReport(report, opts.json === true ? undefined : opts.json);
	} else {
		printSummary(report);
	}

	return report.findings.length > 0 ? EXIT_FINDINGS : EXIT_OK;
}

export async function main(argv: string[]): Promise<void> {
	const program = buildProgram();
	await program.parseAsync(argv);
}

main(process.argv);
