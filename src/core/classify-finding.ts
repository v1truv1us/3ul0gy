import type { Confidence, Finding } from "../core/types.js";

export function classifyFinding(finding: Finding): Confidence {
	return finding.confidence;
}

export function isEntryPointReachable(finding: Finding, entryPoints: string[]): boolean {
	const file = finding.location.file;
	return entryPoints.some((ep) => file === ep || file.endsWith(ep));
}

export function matchesIgnoreGlob(file: string, globs: string[]): boolean {
	for (const pattern of globs) {
		if (matchGlob(file, pattern)) return true;
	}
	return false;
}

function matchGlob(str: string, pattern: string): boolean {
	const regex = globToRegex(pattern);
	return regex.test(str);
}

function globToRegex(pattern: string): RegExp {
	let re = "";
	for (let i = 0; i < pattern.length; i++) {
		const ch = pattern[i];
		if (ch === "*") {
			if (pattern[i + 1] === "*") {
				re += ".*";
				i++;
				if (pattern[i + 1] === "/") i++;
			} else {
				re += "[^/]*";
			}
		} else if (ch === "?") {
			re += "[^/]";
		} else if (ch === ".") {
			re += "\\.";
		} else if ("+^${}()|[]\\".includes(ch)) {
			re += `\\${ch}`;
		} else {
			re += ch;
		}
	}
	return new RegExp(`(^|/)${re}$`);
}

export function containsPragma(sourceText: string, pragmas: string[]): boolean {
	return pragmas.some((p) => sourceText.includes(p));
}
