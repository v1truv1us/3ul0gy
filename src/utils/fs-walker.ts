import { existsSync, lstatSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { matchesIgnoreGlob } from "../core/classify-finding.js";

const SKIP_DIRS = new Set([
	"node_modules",
	".git",
	".hg",
	".svn",
	".flox",
	".astro",
	".next",
	".nuxt",
	".svelte-kit",
	".vercel",
	".netlify",
	"dist",
	"build",
	"out",
	"coverage",
	".cache",
	".turbo",
	".output",
	".wrangler",
	"__pycache__",
	".mypy_cache",
	".pytest_cache",
	".tox",
	"venv",
	".venv",
	"env",
	"site-packages",
	"vendor",
	".yarn",
	".pnp",
	"docs_src",
	"__testfixtures__",
]);

export function collectFiles(
	root: string,
	extensions: Set<string>,
	ignoreGlobs: string[],
): string[] {
	const files: string[] = [];

	const walk = (dir: string) => {
		if (!existsSync(dir)) return;
		let entries: string[];
		try {
			entries = readdirSync(dir);
		} catch {
			return;
		}

		for (const entry of entries) {
			if (entry.startsWith(".") && !extensions.has(entry)) continue;
			const full = join(dir, entry);
			const rel = relative(root, full);
			if (matchesIgnoreGlob(rel, ignoreGlobs)) continue;

			let st: ReturnType<typeof lstatSync>;
			try {
				st = lstatSync(full);
			} catch {
				continue;
			}

			if (st.isDirectory()) {
				if (!SKIP_DIRS.has(entry)) walk(full);
			} else if (st.isFile() && extensions.has(extname(entry))) {
				files.push(full);
			}
		}
	};

	walk(root);
	return files;
}

export const TS_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
export const PY_EXTS = new Set([".py"]);
