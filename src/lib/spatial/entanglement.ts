/**
 * EntanglementMap: bidirectional links between primitives.
 * When one primitive collapses, its entangled partners also collapse.
 */
export class EntanglementMap {
	private links = new Map<string, Set<string>>();

	link(a: string, b: string): void {
		this.getOrCreate(a).add(b);
		this.getOrCreate(b).add(a);
	}

	unlink(a: string, b: string): void {
		this.links.get(a)?.delete(b);
		this.links.get(b)?.delete(a);
	}

	getLinked(id: string): string[] {
		return [...(this.links.get(id) ?? [])];
	}

	isLinked(a: string, b: string): boolean {
		return this.links.get(a)?.has(b) ?? false;
	}

	clear(): void {
		this.links.clear();
	}

	private getOrCreate(id: string): Set<string> {
		let set = this.links.get(id);
		if (!set) {
			set = new Set();
			this.links.set(id, set);
		}
		return set;
	}
}
