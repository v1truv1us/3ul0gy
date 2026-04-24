import { createHash } from "node:crypto";

export function stableId(...parts: string[]): string {
	const hash = createHash("sha256").update(parts.join("|")).digest("hex");
	return hash.slice(0, 16);
}
