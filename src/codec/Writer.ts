import { Failure, type Result, Success } from '@fundamentry/coproduct';

import { type Mismatch } from '#project/mismatch';
import { type Node } from '#project/tree';

export const write: unique symbol = Symbol('write');

export namespace Writer {
  export interface Place<T, N = Node> {
    modify(update: (node: N) => N): T;
  }
}

export class Writer<N = Node> {
  readonly #rewrite: (node: N) => Result<N, Mismatch>;

  constructor(rewrite: (node: N) => Result<N, Mismatch>) {
    this.#rewrite = rewrite;
  }

  write<T>(place: Writer.Place<T, N>): Result<T, Mismatch> {
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
