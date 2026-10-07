import { Data } from '#project/data';

export namespace Node {
  export type Index<T extends readonly Node[]> = {
    [I in keyof T]: I extends `${infer N extends number}` ? N : never;
  }[number];
}

export abstract class Node extends Data {
  abstract children(): readonly Node[];

  *nodes(): Generator<Node, void, undefined> {
    const pending: Node[] = [this];

    for (let node = pending.pop(); node; node = pending.pop()) {
      yield node;

      for (const child of node.children().toReversed()) pending.push(child);
    }
  }
}
