import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { containsPragma } from "../../core/classify-finding.js";
import type { AnalysisContext, AnalysisResult, Finding, Plugin } from "../../core/types.js";
import { PY_EXTS, collectFiles } from "../../utils/fs-walker.js";
import { stableId } from "../../utils/hash.js";

interface PySymbol {
	name: string;
	file: string;
	startLine: number;
	isExported: boolean;
	kind: string;
}

export class LspPythonPlugin implements Plugin {
	name = "lsp-python";
	capabilities = { report: true, mark: false, delete: false, history: false };

	async analyze(ctx: AnalysisContext): Promise<AnalysisResult> {
		const start = performance.now();
		const findings = await this.run(ctx);
		return { findings, durationMs: performance.now() - start, pluginName: this.name };
	}

	private async run(ctx: AnalysisContext): Promise<Finding[]> {
		const pyFiles = this.collectPyFiles(ctx.projectPath, ctx.ignoreGlobs);
		if (pyFiles.length === 0) return [];

		const symbols = this.collectSymbols(pyFiles, ctx);
		const references = this.collectReferences(pyFiles);

		const refCounts = new Map<string, number>();
		for (const ref of references) {
			refCounts.set(ref.name, (refCounts.get(ref.name) ?? 0) + 1);
		}

		const findings: Finding[] = [];
		for (const sym of symbols) {
			const count = refCounts.get(sym.name) ?? 0;
			const externalRefs = count - 1;

			if (externalRefs > 0) continue;

			const confidence = sym.isExported ? "suspected-dead" : "confirmed-dead";
			findings.push({
				id: stableId(this.name, "symbol", sym.file, sym.name, String(sym.startLine)),
				plugin: this.name,
				kind: "symbol",
				name: sym.name,
				location: { file: relative(ctx.rootPath, sym.file), startLine: sym.startLine },
				project: relative(ctx.rootPath, ctx.projectPath) || ".",
				confidence,
				evidence: [
					`${sym.kind} "${sym.name}" has zero external references`,
					sym.isExported
						? "Symbol is module-level but never imported"
						: "Symbol is private with no usage",
				],
				message: `${sym.kind} "${sym.name}" appears unused (${confidence})`,
			});
		}

		return findings;
	}

	private collectPyFiles(root: string, ignoreGlobs: string[]): string[] {
		return collectFiles(root, PY_EXTS, ignoreGlobs);
	}

	private collectSymbols(files: string[], ctx: AnalysisContext): PySymbol[] {
		const symbols: PySymbol[] = [];

		const defRe = /^(\s*)(?:async\s+)?def\s+(\w+)\s*\(/gm;
		const classRe = /^(\s*)class\s+(\w+)/gm;

		for (const file of files) {
			const text = readFileSync(file, "utf-8");
			if (containsPragma(text, ctx.ignorePragmas)) continue;

			const lines = text.split("\n");
			const decorated = new Set<number>();

			for (let i = 0; i < lines.length; i++) {
				const trimmed = lines[i].trim();
				if (trimmed.startsWith("@")) {
					decorated.add(i + 1);
				}
			}

			for (const { re, kind } of [
				{ re: defRe, kind: "function" },
				{ re: classRe, kind: "class" },
			]) {
				re.lastIndex = 0;
				let m = re.exec(text);
				while (m !== null) {
					const indent = m[1].length;
					const name = m[2];
					const lineNum = text.substring(0, m.index).split("\n").length;

					if (/^\s*(#|""")/.test(lines[lineNum - 1]?.trim() ?? "")) {
						m = re.exec(text);
						continue;
					}

					if (name.startsWith("__") && name.endsWith("__")) {
						m = re.exec(text);
						continue;
					}

					const isTestFile =
						file.includes("/tests/") || file.includes("/test/") || file.includes("\\tests\\");
					if (isTestFile && name.startsWith("test_")) {
						m = re.exec(text);
						continue;
					}

					const isModuleLevel = indent === 0 || decorated.has(lineNum);
					symbols.push({ name, file, startLine: lineNum, isExported: isModuleLevel, kind });
					m = re.exec(text);
				}
			}
		}

		return symbols;
	}

	private collectReferences(files: string[]): Array<{ name: string; file: string }> {
		const refs: Array<{ name: string; file: string }> = [];

		for (const file of files) {
			const text = readFileSync(file, "utf-8");
			const wordRe = /\b([A-Za-z_][\w]*)\b/g;
			let wm = wordRe.exec(text);
			while (wm !== null) {
				const word = wm[1];
				refs.push({ name: word, file });
				wm = wordRe.exec(text);
			}
		}

		return refs;
	}
}
