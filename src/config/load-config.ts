import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { configSchema } from "./config-schema.js";
import type { Config } from "./config-schema.js";
import { defaultConfig } from "./defaults.js";

const CONFIG_FILES = ["3ul0gy.toml", ".3ul0gyrc", ".3ul0gyrc.json"];

export function discoverConfig(startPath: string): string | null {
	let dir = startPath;
	for (let i = 0; i < 20; i++) {
		for (const name of CONFIG_FILES) {
			const candidate = join(dir, name);
			if (existsSync(candidate)) return candidate;
		}
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	return null;
}

export function parseTomlSimple(text: string): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	let currentSection = result;
	let currentKey = "";

	for (const rawLine of text.split("\n")) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;

		const sectionMatch = /^\[([^\]]+)\]/.exec(line);
		if (sectionMatch) {
			const parts = sectionMatch[1].split(".");
			currentSection = result;
			for (const part of parts) {
				if (!currentSection[part]) currentSection[part] = {};
				currentSection = currentSection[part] as Record<string, unknown>;
			}
			continue;
		}

		const kvMatch = /^(\S+)\s*=\s*(.+)$/.exec(line);
		if (kvMatch) {
			currentKey = kvMatch[1];
			let value: unknown = kvMatch[2].trim();
			if (typeof value === "string") {
				if (value === "true") value = true;
				else if (value === "false") value = false;
				else if (/^-?\d+$/.test(value)) value = Number.parseInt(value, 10);
				else if (/^\[.*\]$/.test(value)) {
					try {
						value = JSON.parse(value.replace(/'/g, '"'));
					} catch {
						value = [];
					}
				} else {
					value = (value as string).replace(/^["']|["']$/g, "");
				}
			}
			currentSection[currentKey] = value;
		}
	}
	return result;
}

export function loadConfig(startPath: string, overrides?: Partial<Config>): Config {
	const configPath = discoverConfig(startPath);
	let raw: Record<string, unknown> = {};

	if (configPath) {
		const text = readFileSync(configPath, "utf-8");
		if (configPath.endsWith(".json")) {
			raw = JSON.parse(text);
		} else {
			raw = parseTomlSimple(text);
		}
	}

	const parsed = configSchema.safeParse(raw);
	if (!parsed.success) {
		throw new ConfigError(`Invalid config: ${parsed.error.message}`);
	}

	const merged: Config = {
		project: { ...defaultConfig.project, ...parsed.data.project, ...overrides?.project },
		analysis: { ...defaultConfig.analysis, ...parsed.data.analysis, ...overrides?.analysis },
		ignore: { ...defaultConfig.ignore, ...parsed.data.ignore, ...overrides?.ignore },
		plugins: { ...defaultConfig.plugins, ...parsed.data.plugins, ...overrides?.plugins },
		output: { ...defaultConfig.output, ...parsed.data.output, ...overrides?.output },
	};

	return merged;
}

export class ConfigError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ConfigError";
	}
}
