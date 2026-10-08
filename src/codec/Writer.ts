import { Failure, type Result, Success } from '@fundamentry/coproduct';

import { type Mismatch } from '#project/mismatch';
import { type Focus, type Node } from '#project/tree';

export class Writer {
  readonly #parse: (text: string) => Result<Node, Mismatch>;

  constructor(parse: (text: string) => Result<Node, Mismatch>) {
    this.#parse = parse;
  }

  write<T extends Node>(
    place: Focus<T, Node>,
    update: (text: string) => string
  ): Result<T, Mismatch> {
    const failures: Failure<Mismatch>[] = [];

    const written = place.modify(node =>
      this.#parse(update(String(node))).match({
        onSuccess: parsed => parsed,
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
