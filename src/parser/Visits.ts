export class Visits<in out Key> {
  readonly #keys = new Set<Key>();

  visit(key: Key): boolean {
    if (this.#keys.has(key)) return false;

    this.#keys.add(key);

    return true;
  }
}
