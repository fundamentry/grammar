export class View<out A> implements Iterable<A> {
  readonly #values: () => IteratorObject<A>;

  constructor(values: () => IteratorObject<A>) {
    this.#values = values;
  }

  values(): IteratorObject<A> {
    return this.#values();
  }

  [Symbol.iterator](): IteratorObject<A> {
    return this.values();
  }

  find(): A | undefined {
    const [first] = this.values();

    return first;
  }

  map<B>(project: (value: A) => B): View<B> {
    return new View(() => this.values().map(value => project(value)));
  }
}
