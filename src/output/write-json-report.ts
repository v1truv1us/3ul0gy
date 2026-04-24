import { writeFileSync } from "node:fs";
import type { Report } from "../core/types.js";

export function writeJsonReport(report: Report, path?: string): void {
	const json = JSON.stringify(report, null, 2);

	if (path) {
		writeFileSync(path, json);
	} else {
		console.log(json);
	}
}
