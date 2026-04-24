export interface FindingLocation {
	file: string;
	startLine?: number;
	endLine?: number;
	startCol?: number;
	endCol?: number;
}

export type Confidence = "confirmed-dead" | "suspected-dead" | "low-confidence";

export type FindingKind = "symbol" | "dependency" | "file";

export interface HistoryRecord {
	bornAt?: string;
	lastModified?: string;
	lastUsedAt?: string;
	lifespanDays?: number;
}

export interface Finding {
	id: string;
	plugin: string;
	kind: FindingKind;
	name: string;
	location: FindingLocation;
	project: string;
	confidence: Confidence;
	evidence: string[];
	message: string;
	history?: HistoryRecord;
}

export interface AnalysisContext {
	rootPath: string;
	projectPath: string;
	entryPoints: string[];
	ignoreGlobs: string[];
	ignoreSymbols: string[];
	ignorePragmas: string[];
	includeExports: boolean;
	historyMode: "off" | "cheap" | "full";
}

export interface AnalysisResult {
	findings: Finding[];
	durationMs: number;
	pluginName: string;
}

export interface PluginCapabilities {
	report: boolean;
	mark: boolean;
	delete: boolean;
	history: boolean;
}

export interface Plugin {
	name: string;
	capabilities: PluginCapabilities;
	analyze(ctx: AnalysisContext): Promise<AnalysisResult>;
}

export interface Report {
	schemaVersion: string;
	generatedAt: string;
	mode: string;
	rootPath: string;
	findings: Finding[];
	summary: ReportSummary;
}

export interface ReportSummary {
	total: number;
	confirmed: number;
	suspected: number;
	lowConfidence: number;
	byPlugin: Record<string, number>;
	byKind: Record<FindingKind, number>;
	durationMs: number;
}
