import type { Config } from "./config-schema.js";

export const defaultConfig: Config = {
	project: { entry_points: [] },
	analysis: { include_exports: true },
	ignore: {
		globs: ["**/node_modules/**", "**/dist/**", "**/.git/**", "**/*.d.ts"],
		symbols: [],
		pragmas: ["@keep", "@public", "@3ul0gy-ignore"],
	},
	plugins: { enabled: [] },
	output: {},
};
