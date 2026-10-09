export namespace Cache {
  export interface Entries<Key, Value> {
    get(key: Key): Value | undefined;

    set(key: Key, value: Value): unknown;
  }
}

export class Cache<Key, Value> {
  readonly #entries: Cache.Entries<Key, Value>;

  constructor(entries: Cache.Entries<Key, Value>) {
    this.#entries = entries;
  }

  get(key: Key, create: (key: Key) => Value): Value {
    const cached = this.#entries.get(key);

    if (cached !== undefined) return cached;

    const value = create(key);

    this.#entries.set(key, value);

    return value;
  }
}
