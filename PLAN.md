# 3ul0gy Development Plan

## Goal
Build `3ul0gy`, a safe-by-default CLI that detects dead code and unused dependencies across codebases, reports findings, and later supports marking or deleting them with strong audit and recovery guarantees.

## Product Summary
- CLI-first tool.
- Plugin architecture from day one.
- Primary v1 domains: TypeScript/JavaScript symbols, Python symbols, npm dependencies, pip dependencies.
- Primary modes: `report`, `mark`, `delete`.
- Default behavior is read-only.
- Git history enrichment is progressive: `off`, `cheap`, `full`.
- Future non-code analyzers must fit the same plugin contract.

## Recommended Stack
- Language/runtime: TypeScript with Bun for local development.
- Distribution: npm package for broad CLI install compatibility.
- CLI parser: `commander` or `cac`.
- Validation: `zod` for config and report schemas.
- Testing: `vitest`.
- Formatting/linting: Biome or ESLint + Prettier; prefer one-tool minimalism if Biome fits.
- Process integration: stdio child-process wrappers for LSP servers and git.
- Parsing for full history mode: `tree-sitter` grammars for TS/TSX and Python.
- Cache format: JSON initially for cheap history; revisit SQLite only if full-history cache pressure justifies it.

## Architecture

### Core Packages
1. `packages/cli`
- Argument parsing.
- Config resolution.
- Exit codes.
- Human-readable stdout output.

2. `packages/core`
- Scan orchestration.
- Project discovery.
- Finding normalization.
- Confidence classification.
- Mode execution pipeline.

3. `packages/plugin-sdk`
- Shared plugin interfaces and types.
- `Finding`, `HistoryRecord`, `Mutation`, `AnalyzerContext`, `MutationContext`.
- Capability flags for report/mark/delete/history support.

4. `packages/output`
- JSON report renderer.
- SARIF 2.1.0 renderer.
- Shared stdout formatting utilities.

5. `packages/history`
- `HistoryProvider` abstraction.
- Git provider implementation.
- Cheap/full history strategies.
- Cache readers/writers.

6. `packages/safety`
- Clean-tree guard.
- Atomic write helpers.
- Recovery file generation.
- Marker detection/update helpers.

### Built-In Plugins
1. `plugins/lsp-typescript`
2. `plugins/lsp-python`
3. `plugins/deps-npm`
4. `plugins/deps-pip`

## Core Data Model

### Finding
- Stable `id` for dedupe, ignores, markers, and undo.
- `plugin`, `kind`, `location`, `project`, `confidence`, `evidence`, `message`.
- Optional `history` object with `born_at`, `last_modified`, `last_used_at`, `lifespan_days`.

### Mutation
- File-targeted atomic edits.
- Enough metadata to support dry-run previews and undo.

### Config
- Root config plus future nested per-project overrides.
- CLI flags override config.
- Ignore model covers globs, symbols, and pragma comments.

## Implementation Phases

### Phase 0: Foundation
Deliverables:
- Repo layout and package boundaries.
- Basic CLI entrypoint.
- Config loader with schema validation.
- Shared fixture repos for tests.
- CI for typecheck, test, lint.

Acceptance criteria:
- Running the CLI with `--help` works.
- Invalid config returns exit code `2`.
- Core types and plugin contract compile cleanly.

### Phase 1: M1 Skeleton + Report Mode
Scope:
- `report` mode only.
- Single-project analysis.
- `lsp-typescript`, `deps-npm`, `deps-pip`.
- Stdout summary and JSON report.
- No git history, no writes, no monorepo support.

Implementation notes:
- Start with the plugin contract even if only built-ins exist.
- Normalize all findings into one schema before rendering.
- Keep destructive operations completely out of this phase.

Acceptance criteria:
- Works on a real TS repo.
- Emits stable JSON schema.
- Exit code `1` when findings exist, `0` when none exist.

### Phase 2: M2 SARIF + Python
Scope:
- Add `lsp-python`.
- Add SARIF output.
- Validate CI/code-scanning integration.

Acceptance criteria:
- SARIF validates against 2.1.0 shape.
- Python findings render consistently beside TS and dependency findings.
- Analyzer crashes surface as exit code `3` without partial writes.

### Phase 3: M3 Monorepo Support
Scope:
- Auto-discover project roots from manifests.
- Shared resolution universe for cross-project references.
- Project field on every finding.
- Global and per-project config handling.

Implementation notes:
- Start with default discovery depth `4` from the spec.
- Skip common vendor/build directories.
- Count references across discovered projects before classifying exports as suspected dead.

Acceptance criteria:
- Root + workspace projects are all analyzed.
- Cross-package references prevent false positives for exported symbols.
- Stdout, JSON, and SARIF include project grouping/metadata.

### Phase 4: M4 Cheap Git History
Scope:
- `HistoryProvider` abstraction.
- Git-backed `born_at` and `last_modified`.
- `--history=off|cheap|full` flag with `cheap` default.

Implementation notes:
- Cheap history must never block the run if git data is unavailable.
- Detect shallow clone degradation paths.

Acceptance criteria:
- Findings are enriched with cheap history when git is present.
- No history fields appear when history is disabled or unavailable.

### Phase 5: M5 Mark Mode
Scope:
- In-source markers.
- Full eulogy rendering in comments.
- `--no-eulogy` minimal marker mode.
- Language-native deprecation annotations when cheap and safe.

Implementation notes:
- Only act on `confirmed-dead` by default.
- Require clean working tree unless `--allow-dirty`.
- Edits must be atomic per file.

Acceptance criteria:
- Diff only contains eulogies, markers, and deprecation annotations.
- Marker lines are machine-readable and stable.
- Re-running mark refreshes owned markers without churning unrelated code.

### Phase 6: M6 Full History
Scope:
- Tree-sitter historical reference walk.
- Per-language `references.scm` queries.
- Scope resolvers for TS and Python.
- AST and history cache.

Implementation notes:
- Use `git grep` only as a pre-filter.
- AST matching, not text search, determines last use.
- Prefer conservative matches over overly aggressive ones.

Acceptance criteria:
- Warm-cache performance approaches the success target in the spec.
- Inconclusive history degrades cleanly to `unknown` or `null`.

### Phase 7: M7 Delete Mode
Scope:
- Symbol/file/dependency deletion flow.
- Recovery file `.3ul0gy-undo.json`.
- Aggregated eulogy in stdout and recovery metadata.

Implementation notes:
- Delete should reuse the same finding/mutation pipeline as mark.
- Recovery must be sufficient to restore byte-identical state.

Acceptance criteria:
- Delete refuses dirty trees unless explicitly overridden.
- Undo data is complete enough to reconstruct the prior state.

### Phase 8: M8 Plugin Documentation
Scope:
- Public plugin author guide.
- External plugin example.
- HistoryProvider documentation.

Acceptance criteria:
- A third party can build a simple plugin against the public contract without changing core.

## Suggested First Build Slice
Start with a deliberately narrow but real MVP:
- `report` mode only.
- Single-project only.
- `lsp-typescript` and `deps-npm` first.
- Stdout + JSON output.
- Config loading and ignore rules.

Why this slice:
- Proves the CLI, config, plugin interface, and output model.
- Delivers immediate value quickly.
- Avoids destructive behavior and git complexity too early.

## Execution Backlog

### Workstream 1: CLI and Config
1. Define command surface and flags.
2. Implement config discovery and schema validation.
3. Implement log verbosity and exit code handling.

### Workstream 2: Core Engine
1. Define plugin interfaces.
2. Build scan orchestration pipeline.
3. Add finding aggregation and confidence grouping.

### Workstream 3: TypeScript Analysis
1. Establish LSP adapter contract.
2. Implement symbol collection and reference counting.
3. Classify private/local vs exported symbols.
4. Honor entry points and ignore pragmas.

### Workstream 4: Dependency Analysis
1. Parse `package.json` and `pyproject.toml` / `requirements.txt`.
2. Scan imports from supported source files.
3. Emit dependency findings as `confirmed-dead`.

### Workstream 5: Reporting
1. Human summary grouped by plugin and confidence.
2. Versioned JSON schema.
3. SARIF run/rule/result mapping.

### Workstream 6: History
1. Cheap git queries.
2. Rename-chain support.
3. Full historical reference walk.
4. Cache management and invalidation.

### Workstream 7: Mutations
1. Marker rendering.
2. Eulogy rendering.
3. Delete planning.
4. Undo file generation.

## Testing Strategy
- Unit tests for config, classification, rendering, exit codes, and marker parsing.
- Fixture repos for TS-only, Python-only, mixed monorepo, shallow git clone, and no-git cases.
- Integration tests that run the CLI against fixture repos.
- Golden snapshot tests for JSON, SARIF, and mark-mode diffs.
- Safety tests for dirty-tree guards and analyzer-failure behavior.
- Performance benchmarks for large repo report mode and warm/cold full-history mode.

## Risks and Open Questions
1. LSP implementation detail: true LSP adapters vs native language APIs hidden behind the same plugin boundary.
2. Nested config merge semantics in monorepos.
3. Discovery depth default may be too shallow for some repos.
4. Scope resolver completeness for TypeScript and Python in full-history mode.
5. Cache size and eviction defaults may need real-world tuning.
6. Delete granularity may be harder than mark for some symbol shapes.
7. Language-native deprecation annotations may create formatting or lint noise in edge cases.

## Proposed Decisions Before Coding
1. Use TypeScript + Bun + npm distribution.
2. Implement built-in plugins only for v1; external loading comes after the internal SDK stabilizes.
3. Treat `report` as the only MVP mode.
4. Defer Rust and Go plugins exactly as the spec states.
5. Use JSON cache first; only add SQLite if M6 performance proves it necessary.

## Success Metrics to Track During Development
- Report-mode runtime on representative TS repo relative to `tsc --noEmit`.
- False-positive count on entry-point-reachable symbols.
- Warm/cold timings for `--history=full`.
- Number of mutation-related regressions caught by recovery tests.
- Time required to author a sample plugin using the SDK.

## Recommended Immediate Next Step
Implement Phase 0 and the narrow MVP slice from Phase 1 first: CLI, config, plugin SDK, `lsp-typescript`, `deps-npm`, stdout, and JSON output.

## MVP Implementation Plan

### Objective
Ship a usable first release that can scan a single TypeScript/JavaScript project in `report` mode, detect dead-code candidates and unused npm dependencies, and emit stdout and JSON output with the long-term plugin architecture already in place.

### MVP Scope
Included:
- CLI with `report` as the default mode.
- Config discovery and validation.
- Core plugin SDK and orchestration pipeline.
- Single-project analysis only.
- `lsp-typescript` plugin.
- `deps-npm` plugin.
- Stdout summary.
- Versioned JSON report.
- Ignore globs, ignore pragmas, and entry-point filtering.
- Exit codes `0`, `1`, `2`, `3`.

Excluded from MVP:
- `mark` and `delete` modes.
- Python support.
- SARIF.
- Monorepo discovery and cross-project reference resolution.
- Git history.
- Tree-sitter historical analysis.
- External plugin loading.

### Recommended Repository Structure
```text
.
├── README.md
├── PLAN.md
├── package.json
├── bun.lock
├── tsconfig.json
├── biome.json
├── src/
│   ├── cli/
│   │   ├── main.ts
│   │   ├── parse-argv.ts
│   │   └── exit-codes.ts
│   ├── config/
│   │   ├── load-config.ts
│   │   ├── config-schema.ts
│   │   └── defaults.ts
│   ├── core/
│   │   ├── run-analysis.ts
│   │   ├── classify-finding.ts
│   │   ├── entry-points.ts
│   │   ├── ignore-rules.ts
│   │   └── types.ts
│   ├── plugins/
│   │   ├── sdk.ts
│   │   ├── lsp-typescript/
│   │   │   ├── index.ts
│   │   │   ├── analyze-symbols.ts
│   │   │   ├── entry-points.ts
│   │   │   └── tsserver-client.ts
│   │   └── deps-npm/
│   │       ├── index.ts
│   │       ├── parse-package-json.ts
│   │       └── scan-imports.ts
│   ├── output/
│   │   ├── print-summary.ts
│   │   └── write-json-report.ts
│   └── utils/
│       ├── fs.ts
│       ├── path.ts
│       └── hash.ts
└── tests/
    ├── fixtures/
    ├── integration/
    └── unit/
```

### Sequenced Work Plan

#### 1. Foundation
- Initialize Bun TypeScript project.
- Add CLI entrypoint and scripts for `dev`, `test`, `lint`, `typecheck`.
- Add config/schema dependencies and test tooling.
- Establish a single internal `Finding` shape now to avoid churn later.

Definition of done:
- `bun run` entrypoint works.
- Typecheck, test runner, and lint command are wired.

#### 2. CLI Contract
- Implement `3ul0gy [mode] [path] [flags]` parsing.
- Support `report` mode first, but parse future-compatible flags now where low cost.
- Map failures to the spec’s exit codes.

Definition of done:
- `3ul0gy report .` runs.
- Invalid config/args return `2`.

#### 3. Config System
- Discover `3ul0gy.toml` / `.3ul0gyrc` by walking up from target path.
- Validate with schema.
- Support MVP-safe subset:
  - `[project].entry_points`
  - `[analysis].include_exports`
  - `[ignore].globs`
  - `[ignore].symbols`
  - `[ignore].pragmas`
  - `[plugins].enabled`
  - `[output].json_path`

Definition of done:
- Config merges with defaults.
- CLI flags override config.

#### 4. Plugin SDK and Orchestrator
- Define plugin interface for `supports()` and `analyze()` now.
- Build a plugin registry for built-ins.
- Run enabled plugins, normalize findings, sort deterministically, and aggregate counts.

Definition of done:
- Core can execute one or more plugins against a root path and produce a unified result.

#### 5. Ignore Rules and Entry-Point Handling
- Implement glob-based file exclusion.
- Implement pragma detection for `@keep`, `@public`, `@3ul0gy-ignore`.
- Resolve entry points from config and `package.json` fields: `main`, `module`, `exports`, `bin`.

Definition of done:
- Entry-point-reachable exports are excluded before confidence classification.

#### 6. `deps-npm` Plugin
- Parse `package.json`.
- Collect declared dependencies and devDependencies.
- Scan source imports in supported JS/TS files.
- Emit `dependency` findings for declared-but-unused packages.

Definition of done:
- Unused dependency fixtures are detected reliably.
- Used packages imported via common syntax are not flagged.

#### 7. `lsp-typescript` Plugin
- Recommended implementation choice for MVP: use the TypeScript compiler API or tsserver-backed project analysis behind the plugin boundary, while keeping the external contract LSP-shaped. This is the clearest recommendation because it reduces early protocol complexity without blocking a future LSP adapter.
- Gather symbol candidates.
- Count references within the workspace.
- Classify:
  - private/local with zero refs -> `confirmed-dead`
  - exported with zero internal refs -> `suspected-dead`
- Apply ignore rules and entry-point exclusions before final emission.

Definition of done:
- Detects obvious dead local/private symbols.
- Detects unreferenced exports as suspected, not confirmed.

#### 8. Output Layer
- Print stdout grouped by plugin, then confidence tier.
- Write versioned JSON report with `schemaVersion`, `generatedAt`, `mode`, `findings[]`.
- Return `1` when findings are present.

Definition of done:
- Output is stable enough for snapshot tests.

#### 9. Integration Test Pass
- Add representative fixture projects:
  - TS app with dead private function
  - TS library with unused export
  - Project with entry-point export
  - Project with ignored generated/test files
  - Project with unused npm dependency
- Add integration coverage for stdout, JSON, and exit codes.

Definition of done:
- MVP behavior is locked by golden tests.

## Solo Tracking Plan

### Recommended Task Tree
1. `MVP: foundation and toolchain`
2. `MVP: CLI contract and exit codes`
3. `MVP: config discovery and schema`
4. `MVP: plugin SDK and orchestration`
5. `MVP: ignore rules and entry-point filtering`
6. `MVP: deps-npm plugin`
7. `MVP: lsp-typescript plugin`
8. `MVP: stdout and JSON reporting`
9. `MVP: integration fixtures and tests`
10. `MVP: polish and README`

### Recommended `solo` Commands
Run these once execution mode is allowed:

```bash
solo task create "MVP: foundation and toolchain" --kind task --priority 1
solo task create "MVP: CLI contract and exit codes" --kind task --priority 1
solo task create "MVP: config discovery and schema" --kind task --priority 1
solo task create "MVP: plugin SDK and orchestration" --kind task --priority 1
solo task create "MVP: ignore rules and entry-point filtering" --kind task --priority 1
solo task create "MVP: deps-npm plugin" --kind task --priority 1
solo task create "MVP: lsp-typescript plugin" --kind task --priority 1
solo task create "MVP: stdout and JSON reporting" --kind task --priority 1
solo task create "MVP: integration fixtures and tests" --kind task --priority 1
solo task create "MVP: polish and README" --kind task --priority 2
```

Recommended dependency ordering:
- CLI depends on foundation.
- Config depends on foundation.
- Plugin SDK depends on foundation.
- Ignore rules depends on config and plugin SDK.
- `deps-npm` depends on plugin SDK and ignore rules.
- `lsp-typescript` depends on plugin SDK and ignore rules.
- Output depends on CLI, config, and plugin SDK.
- Integration tests depend on CLI, config, both plugins, and output.
- Polish/README depends on everything else.

## Execution Recommendation
When plan mode is lifted, implement in this order:
1. Foundation
2. CLI
3. Config
4. Plugin SDK/orchestrator
5. Ignore rules and entry points
6. `deps-npm`
7. `lsp-typescript`
8. Output
9. Integration tests
10. Polish

## Recommendation Needing No Further Clarification
For the MVP, prefer a TypeScript-native analysis implementation behind the `lsp-typescript` plugin boundary instead of building a full generic LSP transport first. It is the fastest path to a correct MVP and preserves the architecture needed to introduce true LSP adapters later.
