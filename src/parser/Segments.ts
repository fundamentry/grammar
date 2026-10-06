export namespace Segments {
  export type Segment<T> =
    | { readonly accepted: true; readonly item: T }
    | { readonly accepted: false; readonly items: readonly T[] };
}

export class Segments<in out T> implements Iterable<Segments.Segment<T>> {
  readonly #items: Iterable<T>;

  readonly #accepts: (item: T) => boolean;

  constructor(items: Iterable<T>, accepts: (item: T) => boolean) {
    this.#items = items;
    this.#accepts = accepts;
  }

  *[Symbol.iterator](): Generator<Segments.Segment<T>> {
    const rejected: T[] = [];

    const flush = (): Segments.Segment<T>[] =>
      rejected.length > 0
        ? [{ accepted: false, items: rejected.splice(0) }]
        : [];

    for (const item of this.#items)
      if (this.#accepts(item)) {
        yield* flush();
        yield { accepted: true, item };
      } else rejected.push(item);

    yield* flush();
  }
}
