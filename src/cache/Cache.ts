export class Cache<Key, Value> {
  readonly #entries = new Map<Key, Value>();

  get(key: Key, create: (key: Key) => Value): Value {
    const cached = this.#entries.get(key);

    if (cached !== undefined) return cached;

    const value = create(key);

    this.#entries.set(key, value);

    return value;
  }
}
