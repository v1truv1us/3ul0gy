import { writeFileSync } from "node:fs";
import type { Confidence, Report } from "../core/types.js";

interface SarifRun {
	tool: {
		driver: {
			name: string;
			version: string;
			informationUri: string;
			rules: SarifRule[];
		};
	};
	results: SarifResult[];
}

interface SarifRule {
	id: string;
	shortDescription: { text: string };
	defaultConfiguration: { level: string };
	properties: { tags: string[] };
}

interface SarifResult {
	ruleId: string;
	level: string;
	message: { text: string };
	locations: Array<{
		physicalLocation: {
			artifactLocation: { uri: string };
			region: { startLine: number };
		};
	}>;
	properties: Record<string, unknown>;
}

const CONFIDENCE_TO_LEVEL: Record<Confidence, string> = {
	"confirmed-dead": "error",
	"suspected-dead": "warning",
	"low-confidence": "note",
};

export function generateSarif(report: Report): object {
	const rules: SarifRule[] = [];
	const ruleIndexMap = new Map<string, number>();

	const seenRules = new Set<string>();
	for (const finding of report.findings) {
		const ruleId = `${finding.plugin}/${finding.kind}`;
		if (!seenRules.has(ruleId)) {
			seenRules.add(ruleId);
			ruleIndexMap.set(ruleId, rules.length);
			rules.push({
				id: ruleId,
				shortDescription: { text: `${finding.plugin} ${finding.kind} detection` },
				defaultConfiguration: { level: CONFIDENCE_TO_LEVEL[finding.confidence] },
				properties: { tags: [finding.kind, finding.plugin] },
			});
		}
	}

	const results: SarifResult[] = report.findings.map((finding) => ({
		ruleId: `${finding.plugin}/${finding.kind}`,
		level: CONFIDENCE_TO_LEVEL[finding.confidence],
		message: { text: finding.message },
		locations: [
			{
				physicalLocation: {
					artifactLocation: { uri: finding.location.file },
					region: { startLine: finding.location.startLine ?? 1 },
				},
			},
		],
		properties: {
			confidence: finding.confidence,
			evidence: finding.evidence,
			plugin: finding.plugin,
			kind: finding.kind,
		},
	}));

	const sarif = {
		$schema:
			"https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json",
		version: "2.1.0",
		runs: [
			{
				tool: {
					driver: {
						name: "3ul0gy",
						version: report.schemaVersion,
						informationUri: "https://github.com/v1truv1us/3ul0gy",
						rules,
					},
				},
				results,
			} satisfies SarifRun,
		],
	};

	return sarif;
}

export function writeSarifReport(report: Report, path?: string): void {
	const sarif = generateSarif(report);
	const json = JSON.stringify(sarif, null, 2);

	if (path) {
		writeFileSync(path, json);
	} else {
		console.log(json);
	}
}
