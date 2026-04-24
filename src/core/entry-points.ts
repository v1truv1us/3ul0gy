import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

interface PackageManifest {
	main?: string;
	module?: string;
	exports?: string | Record<string, string>;
	bin?: string | Record<string, string>;
}

export function resolveEntryPoints(projectPath: string, configEntries: string[]): string[] {
	const entries = [...configEntries];
	const pkgPath = join(projectPath, "package.json");

	if (existsSync(pkgPath)) {
		const pkg: PackageManifest = JSON.parse(readFileSync(pkgPath, "utf-8"));
		if (pkg.main) entries.push(pkg.main);
		if (pkg.module) entries.push(pkg.module);
		if (typeof pkg.exports === "string") entries.push(pkg.exports);
		else if (pkg.exports) {
			for (const val of Object.values(pkg.exports)) {
				if (typeof val === "string") entries.push(val);
			}
		}
		if (typeof pkg.bin === "string") entries.push(pkg.bin);
		else if (pkg.bin) {
			for (const val of Object.values(pkg.bin)) {
				if (typeof val === "string") entries.push(val);
			}
		}
	}

	const indexFallbacks = ["index.ts", "index.tsx", "index.js", "index.jsx", "index.mjs"];
	if (entries.length === 0) {
		for (const fallback of indexFallbacks) {
			if (existsSync(join(projectPath, fallback))) {
				entries.push(fallback);
				break;
			}
		}
	}

	return [...new Set(entries)];
}
