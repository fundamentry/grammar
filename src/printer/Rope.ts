export namespace Rope {
  export type Node<T> =
    readonly [] | readonly [T] | readonly [Rope<T>, Rope<T>];
}

export class Rope<T> implements Iterable<T> {
  readonly #node: Rope.Node<T>;

  private constructor(node: Rope.Node<T>) {
    this.#node = node;
  }

  static empty<T>(): Rope<T> {
    return new Rope<T>([]);
  }

  static of<T>(item: T): Rope<T> {
    return new Rope([item]);
  }

  isEmpty(): boolean {
    return this.#node.length === 0;
  }

  concat(other: Rope<T>): Rope<T> {
    if (this.isEmpty()) return other;

    if (other.isEmpty()) return this;

    return new Rope<T>([this, other]);
  }

  *[Symbol.iterator](): Generator<T> {
    const pending: Rope<T>[] = [this];

    for (let next = pending.pop(); next; next = pending.pop()) {
      const node = next.#node;

      if (node.length === 1) yield node[0];
      else if (node.length === 2) pending.push(node[1], node[0]);
    }
  }
}
