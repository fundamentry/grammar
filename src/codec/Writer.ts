import { Failure, type Result, Success } from '@fundamentry/coproduct';

import { type Mismatch } from '#project/mismatch';
import { type Node } from '#project/tree';

export const write: unique symbol = Symbol('write');

export namespace Writer {
  export interface Place<T> {
    modify(update: (node: Node) => Node): T;
  }
}

export class Writer {
  readonly #rewrite: (node: Node) => Result<Node, Mismatch>;

  constructor(rewrite: (node: Node) => Result<Node, Mismatch>) {
    this.#rewrite = rewrite;
  }

  write<T>(place: Writer.Place<T>): Result<T, Mismatch> {
    const failures: Failure<Mismatch>[] = [];

    const written = place.modify(node =>
      this.#rewrite(node).match({
        onSuccess: rewritten => rewritten,
        onFailure: mismatch => {
          failures.push(new Failure(mismatch));

          return node;
        },
      })
    );

    const [failure] = failures;

    return failure ?? new Success(written);
  }
}
