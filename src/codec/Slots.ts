import { type Node } from '#project/tree';

export class Slots {
  static readonly edit = new Slots((created, initial) =>
    created.equals(initial)
  );

  static readonly fill = new Slots(() => false);

  readonly #keeps: (created: Node, initial: Node) => boolean;

  private constructor(keeps: (created: Node, initial: Node) => boolean) {
    this.#keeps = keeps;
  }

  keeps(created: Node, initial: Node): boolean {
    return this.#keeps(created, initial);
  }
}
