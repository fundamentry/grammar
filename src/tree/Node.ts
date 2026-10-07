import { Data } from '#project/data';

export namespace Node {
  export type Index<T extends readonly Node[]> = {
    [I in keyof T]: I extends `${infer N extends number}` ? N : never;
  }[number];

  export type Transform = <N extends Node>(node: N) => N;
}

export abstract class Node extends Data {
  abstract children(): readonly Node[];

  abstract map(transform: Node.Transform): Node;

  *nodes(): Generator<Node, void, undefined> {
    const pending: Node[] = [this];

    for (let node = pending.pop(); node; node = pending.pop()) {
      yield node;

      for (const child of node.children().toReversed()) pending.push(child);
    }
  }

  *outermost<F extends Node>(
    matches: (node: Node) => node is F
  ): Generator<F, void, undefined> {
    const pending: Iterator<Node, undefined>[] = [[this].values()];

    for (let top = pending.at(-1); top; top = pending.at(-1)) {
      const next = top.next();

      if (next.done) pending.pop();
      else if (matches(next.value)) yield next.value;
      else pending.push(next.value.children().values());
    }
  }
}
