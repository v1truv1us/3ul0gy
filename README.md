# 3ul0gy

Safe-by-default CLI for dead code and unused dependency detection.

## Install

```bash
npm install -g 3ul0gy
```

## Usage

```bash
# Analyze current directory
3ul0gy .

# Analyze specific project
3ul0gy report /path/to/project

# JSON output
3ul0gy report . --json

# JSON output to file
3ul0gy report . --json report.json

# Run specific plugins only
3ul0gy report . --plugins deps-npm lsp-typescript
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | No findings |
| 1 | Findings detected |
| 2 | Configuration error |
| 3 | Analyzer failure |

## Configuration

Create a `3ul0gy.toml` in your project root:

```toml
[project]
entry_points = ["src/index.ts"]

[analysis]
include_exports = true

[ignore]
globs = ["**/generated/**"]
symbols = ["legacy_*"]
pragmas = ["@keep", "@public", "@3ul0gy-ignore"]

[plugins]
enabled = ["lsp-typescript", "deps-npm"]
```

Or `.3ul0gyrc.json`:

```json
{
  "project": {
    "entry_points": ["src/index.ts"]
  },
  "ignore": {
    "globs": ["**/generated/**"]
  }
}
```

## Built-in Plugins

| Plugin | Detects |
|--------|---------|
| `lsp-typescript` | Unused functions, classes, types, enums in TS/TSX files |
| `deps-npm` | Unused npm dependencies and devDependencies |

## Ignore Pragmas

Add inline comments to prevent false positives:

```typescript
// @keep
export function legacyApi() { ... }
```

## Development

```bash
npm install
npm run dev .          # run locally
npm test               # run tests
npm run typecheck      # type checking
npm run lint           # lint
npm run check          # all checks
```

## License

MIT
