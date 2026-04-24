import { z } from "zod";

export const configSchema = z.object({
	project: z
		.object({
			entry_points: z.array(z.string()).default([]),
		})
		.default({}),
	analysis: z
		.object({
			include_exports: z.boolean().default(true),
		})
		.default({}),
	ignore: z
		.object({
			globs: z.array(z.string()).default([]),
			symbols: z.array(z.string()).default([]),
			pragmas: z.array(z.string()).default(["@keep", "@public", "@3ul0gy-ignore"]),
		})
		.default({}),
	plugins: z
		.object({
			enabled: z.array(z.string()).default([]),
		})
		.default({}),
	output: z
		.object({
			json_path: z.string().optional(),
		})
		.default({}),
});

export type Config = z.infer<typeof configSchema>;
