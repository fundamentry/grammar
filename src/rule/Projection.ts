import { type View } from './View.js';

export class Projection<out A> implements View<A> {
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
    return new Projection(() => this.values().map(project));
  }
}
