import type { Finding, Report } from "../core/types.js";

export function printSummary(report: Report): void {
	const { summary, findings } = report;

	const confirmed = findings.filter((f) => f.confidence === "confirmed-dead");
	const suspected = findings.filter((f) => f.confidence === "suspected-dead");

	if (summary.total === 0) {
		console.log("\n  No dead code or unused dependencies found.\n");
		return;
	}

	console.log(
		`\n  3ul0gy report — ${summary.total} finding(s) in ${Math.round(summary.durationMs)}ms\n`,
	);

	if (confirmed.length > 0) {
		console.log("  confirmed-dead:");
		for (const f of confirmed) printFinding(f);
		console.log();
	}

	if (suspected.length > 0) {
		console.log("  suspected-dead:");
		for (const f of suspected) printFinding(f);
		console.log();
	}

	console.log(
		`  Total: ${summary.total} (${summary.confirmed} confirmed, ${summary.suspected} suspected)\n`,
	);
}

function printFinding(f: Finding): void {
	const loc = f.location.startLine ? `:${f.location.startLine}` : "";
	console.log(`    ${f.kind.padEnd(12)} ${f.name.padEnd(30)} ${f.location.file}${loc}`);
}
