export class Chain<T> {
  readonly #link?: readonly [T, Chain<T>];

  private constructor(link?: readonly [T, Chain<T>]) {
    this.#link = link;
  }

  static empty<T>(): Chain<T> {
    return new Chain<T>();
  }

  append(item: T): Chain<T> {
    return new Chain([item, this]);
  }

  toArray(): T[] {
    const items: T[] = [];

    for (let link = this.#link; link; link = link[1].#link) items.push(link[0]);

    return items.reverse();
  }
}
