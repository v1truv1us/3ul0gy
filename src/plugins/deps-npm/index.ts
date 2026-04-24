import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { matchesIgnoreGlob } from "../../core/classify-finding.js";
import { resolveEntryPoints } from "../../core/entry-points.js";
import type { AnalysisContext, AnalysisResult, Plugin } from "../../core/types.js";
import { TS_EXTS, collectFiles } from "../../utils/fs-walker.js";
import { stableId } from "../../utils/hash.js";

interface DeclaredDeps {
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
}

interface ImportInfo {
	packageName: string;
	file: string;
}

export class DepsNpmPlugin implements Plugin {
	name = "deps-npm";
	capabilities = { report: true, mark: false, delete: false, history: false };

	async analyze(ctx: AnalysisContext): Promise<AnalysisResult> {
		const start = performance.now();
		const findings = await this.run(ctx);
		return { findings, durationMs: performance.now() - start, pluginName: this.name };
	}

	private async run(ctx: AnalysisContext): Promise<AnalysisResult["findings"]> {
		const pkgPath = join(ctx.projectPath, "package.json");
		if (!existsSync(pkgPath)) return [];

		const pkg: DeclaredDeps & { peerDependencies?: Record<string, string> } = JSON.parse(
			readFileSync(pkgPath, "utf-8"),
		);

		const declared = new Set([
			...Object.keys(pkg.dependencies ?? {}),
			...Object.keys(pkg.devDependencies ?? {}),
			...Object.keys(pkg.peerDependencies ?? {}),
		]);

		if (declared.size === 0) return [];

		const entryPoints = resolveEntryPoints(ctx.projectPath, ctx.entryPoints);
		const tsFiles = this.collectSourceFiles(ctx.projectPath, ctx.ignoreGlobs);
		const usedPackages = new Set<string>();

		for (const file of tsFiles) {
			const text = readFileSync(file, "utf-8");
			const imports = this.extractImports(text, file);
			for (const imp of imports) {
				if (declared.has(imp.packageName)) usedPackages.add(imp.packageName);
			}
		}

		const unused = [...declared].filter((d) => !usedPackages.has(d));
		return unused.map((name) => ({
			id: stableId(this.name, "dependency", name),
			plugin: this.name,
			kind: "dependency" as const,
			name,
			location: { file: join(ctx.projectPath, "package.json") },
			project: relative(ctx.rootPath, ctx.projectPath) || ".",
			confidence: "confirmed-dead" as const,
			evidence: ["Declared in package.json but never imported"],
			message: `Dependency "${name}" is declared but never imported`,
		}));
	}

	private collectSourceFiles(root: string, ignoreGlobs: string[]): string[] {
		return collectFiles(root, TS_EXTS, ignoreGlobs);
	}

	private extractImports(text: string, _file: string): ImportInfo[] {
		const imports: ImportInfo[] = [];
		const patterns = [
			/import\s+.*?from\s+['"]([^'"]+)['"]/g,
			/import\s+['"]([^'"]+)['"]/g,
			/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
			/import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
		];
		for (const pat of patterns) {
			pat.lastIndex = 0;
			let m = pat.exec(text);
			while (m !== null) {
				const spec = m[1];
				if (!spec.startsWith(".")) {
					const pkg = spec.startsWith("@")
						? spec.split("/").slice(0, 2).join("/")
						: spec.split("/")[0];
					imports.push({ packageName: pkg, file: _file });
				}
				m = pat.exec(text);
			}
		}
		return imports;
	}
}
