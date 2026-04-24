import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { stableId } from "../../src/utils/hash.js";

describe("stableId", () => {
	it("produces consistent hashes", () => {
		const a = stableId("plugin", "symbol", "file.ts", "foo");
		const b = stableId("plugin", "symbol", "file.ts", "foo");
		expect(a).toBe(b);
		expect(a.length).toBe(16);
	});

	it("produces different hashes for different inputs", () => {
		const a = stableId("plugin", "symbol", "file.ts", "foo");
		const b = stableId("plugin", "symbol", "file.ts", "bar");
		expect(a).not.toBe(b);
	});
});

describe("classify-finding", () => {
	it("matchesIgnoreGlob handles basic patterns", async () => {
		const { matchesIgnoreGlob } = await import("../../src/core/classify-finding.js");
		expect(matchesIgnoreGlob("node_modules/foo/index.js", ["**/node_modules/**"])).toBe(true);
		expect(matchesIgnoreGlob("src/main.ts", ["**/node_modules/**"])).toBe(false);
		expect(matchesIgnoreGlob("dist/bundle.js", ["**/dist/**"])).toBe(true);
	});
});
