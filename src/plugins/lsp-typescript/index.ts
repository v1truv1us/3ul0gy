import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { containsPragma } from "../../core/classify-finding.js";
import { resolveEntryPoints } from "../../core/entry-points.js";
import type { AnalysisContext, AnalysisResult, Finding, Plugin } from "../../core/types.js";
import { TS_EXTS, collectFiles } from "../../utils/fs-walker.js";
import { stableId } from "../../utils/hash.js";

interface SymbolInfo {
	name: string;
	file: string;
	startLine: number;
	isExported: boolean;
	kind: string;
}

interface Reference {
	symbolName: string;
	file: string;
	line: number;
}

export class LspTypescriptPlugin implements Plugin {
	name = "lsp-typescript";
	capabilities = { report: true, mark: false, delete: false, history: false };

	async analyze(ctx: AnalysisContext): Promise<AnalysisResult> {
		const start = performance.now();
		const findings = await this.run(ctx);
		return { findings, durationMs: performance.now() - start, pluginName: this.name };
	}

	private async run(ctx: AnalysisContext): Promise<Finding[]> {
		const sourceFiles = this.collectSourceFiles(ctx.projectPath, ctx.ignoreGlobs);
		if (sourceFiles.length === 0) return [];

		const entryPoints = resolveEntryPoints(ctx.projectPath, ctx.entryPoints);
		const entryFiles = new Set(
			entryPoints.map((ep) => join(ctx.projectPath, ep).replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, "")),
		);

		const symbols = this.collectSymbols(sourceFiles, ctx);
		const references = this.collectReferences(sourceFiles);

		const refCounts = new Map<string, number>();
		for (const ref of references) {
			refCounts.set(ref.symbolName, (refCounts.get(ref.symbolName) ?? 0) + 1);
		}

		const findings: Finding[] = [];
		for (const sym of symbols) {
			const fileRel = relative(ctx.rootPath, sym.file);
			const barePath = sym.file.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, "");
			if (entryFiles.has(barePath)) continue;

			const count = refCounts.get(sym.name) ?? 0;
			const declarationCountsItself = 1;
			const externalRefs = count - declarationCountsItself;

			if (externalRefs > 0) continue;

			const confidence = sym.isExported ? "suspected-dead" : "confirmed-dead";
			findings.push({
				id: stableId(this.name, "symbol", sym.file, sym.name, String(sym.startLine)),
				plugin: this.name,
				kind: "symbol",
				name: sym.name,
				location: { file: fileRel, startLine: sym.startLine },
				project: relative(ctx.rootPath, ctx.projectPath) || ".",
				confidence,
				evidence: [
					`${sym.kind} "${sym.name}" has zero external references`,
					sym.isExported
						? "Symbol is exported but never imported"
						: "Symbol is private with no usage",
				],
				message: `${sym.kind} "${sym.name}" appears unused (${confidence})`,
			});
		}

		return findings;
	}

	private collectSourceFiles(root: string, ignoreGlobs: string[]): string[] {
		return collectFiles(root, TS_EXTS, ignoreGlobs);
	}

	private collectSymbols(files: string[], ctx: AnalysisContext): SymbolInfo[] {
		const symbols: SymbolInfo[] = [];

		const funcRe = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
		const constFuncRe = /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(/g;
		const arrowRe = /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g;
		const arrowNoParensRe = /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?[^=]+=>/g;
		const classRe = /(?:export\s+)?class\s+(\w+)/g;
		const typeRe = /(?:export\s+)?(?:type|interface)\s+(\w+)/g;
		const enumRe = /(?:export\s+)?enum\s+(\w+)/g;
		const cjsExportsRe = /exports\.(\w+)\s*=/g;
		const cjsModuleExportsNamedRe = /module\.exports\.(\w+)\s*=/g;
		const varFuncRe = /(?:export\s+)?var\s+(\w+)\s*=\s*(?:async\s+)?function/g;
		const letFuncRe = /(?:export\s+)?let\s+(\w+)\s*=\s*(?:async\s+)?function/g;

		const patterns = [
			{ re: funcRe, kind: "function" },
			{ re: constFuncRe, kind: "function" },
			{ re: arrowRe, kind: "function" },
			{ re: arrowNoParensRe, kind: "function" },
			{ re: varFuncRe, kind: "function" },
			{ re: letFuncRe, kind: "function" },
			{ re: classRe, kind: "class" },
			{ re: typeRe, kind: "type" },
			{ re: enumRe, kind: "enum" },
			{ re: cjsExportsRe, kind: "function" },
			{ re: cjsModuleExportsNamedRe, kind: "function" },
		];

		const seen = new Set<string>();
		const deduped = (sym: SymbolInfo): boolean => {
			const key = `${sym.file}:${sym.startLine}:${sym.name}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		};

		for (const file of files) {
			const text = readFileSync(file, "utf-8");
			if (containsPragma(text, ctx.ignorePragmas)) continue;

			const lines = text.split("\n");
			for (const { re, kind } of patterns) {
				re.lastIndex = 0;
				let m = re.exec(text);
				while (m !== null) {
					const name = m[1];
					const lineNum = text.substring(0, m.index).split("\n").length;
					const line = lines[lineNum - 1] ?? "";

					if (/^\s*(\/\/|\/\*)/.test(line.trim())) {
						m = re.exec(text);
						continue;
					}

					const isExported =
						/export\s/.test(m[0]) ||
						m[0].startsWith("exports.") ||
						m[0].startsWith("module.exports.");
					const sym = { name, file, startLine: lineNum, isExported, kind };
					if (deduped(sym)) symbols.push(sym);
					m = re.exec(text);
				}
			}
		}

		for (const file of files) {
			const text = readFileSync(file, "utf-8");
			if (containsPragma(text, ctx.ignorePragmas)) continue;
			const lines = text.split("\n");
			const moduleExportsObjRe = /module\.exports\s*=\s*\{/g;
			moduleExportsObjRe.lastIndex = 0;
			let mem = moduleExportsObjRe.exec(text);
			while (mem !== null) {
				const startIdx = mem.index + mem[0].length;
				let depth = 1;
				let i = startIdx;
				while (i < text.length && depth > 0) {
					if (text[i] === "{") depth++;
					else if (text[i] === "}") depth--;
					i++;
				}
				const body = text.substring(startIdx, i - 1);
				const propRe = /(\w+)\s*[,:]/g;
				let pm = propRe.exec(body);
				while (pm !== null) {
					const name = pm[1];
					const lineNum = text.substring(0, startIdx + pm.index).split("\n").length;
					const sym = {
						name,
						file,
						startLine: lineNum,
						isExported: true,
						kind: "function" as const,
					};
					if (deduped(sym)) symbols.push(sym);
					pm = propRe.exec(body);
				}
				mem = moduleExportsObjRe.exec(text);
			}
		}

		return symbols;
	}

	private collectReferences(files: string[]): Reference[] {
		const refs: Reference[] = [];
		const identifiers = new Map<string, string[]>();

		for (const file of files) {
			const text = readFileSync(file, "utf-8");
			const lines = text.split("\n");
			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				const wordRe = /\b([A-Za-z_$][\w$]*)\b/g;
				let wm = wordRe.exec(line);
				while (wm !== null) {
					const word = wm[1];
					if (!identifiers.has(word)) identifiers.set(word, []);
					identifiers.get(word)?.push(file);
					wm = wordRe.exec(line);
				}
			}
		}

		for (const [name, filesList] of identifiers) {
			for (const file of filesList) {
				const text = readFileSync(file, "utf-8");
				const lines = text.split("\n");
				for (let i = 0; i < lines.length; i++) {
					if (lines[i].includes(name)) {
						refs.push({ symbolName: name, file, line: i + 1 });
						break;
					}
				}
			}
		}

		return refs;
	}
}
