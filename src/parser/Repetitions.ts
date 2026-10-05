import { type Range } from '@fundamentry/range';
import { Integer } from '@fundamentry/scalar';
import { type Point } from '@fundamentry/stream';

import { Cache } from '#project/cache';
import { type Node } from '#project/tree';

import { type Context } from './Context.js';
import { type Parser } from './Parser.js';
import { Visits } from './Visits.js';

export class Repetitions {
  readonly #bounds: Range<Integer>;

  constructor(bounds: Range<Integer>) {
    this.#bounds = bounds;
  }

  from<Token>(
    start: Point<Token>,
    context: Context<Token>,
    element: Parser.Parse<Token>,
    continuation: Parser.Continuation<Token, readonly Node[]>
  ): void {
    const states = new Cache<number, Visits<number>>();

    const state = (count: Integer, satisfied: boolean) =>
      satisfied && !this.#bounds.hasUpperBound() ? Infinity : count.value();

    const path: Node[] = [];

    const frame = (
      rest: Point<Token>,
      count: Integer,
      satisfied = this.#bounds.contains(count)
    ): void => {
      const next = count.increment();
      const fits = this.#bounds.contains(next);
      const visits = states.get(state(next, fits), () => new Visits());

      context.schedule(() => {
        if (satisfied) continuation.succeed({ value: [...path], rest });

        path.pop();
      });

      if (!satisfied || fits)
        element(rest, context, {
          label: continuation.label,
          succeed: ({ value, rest: after }) => {
            if (
              (!satisfied || !after.equals(rest)) &&
              visits.visit(after.distanceFrom(start))
            ) {
              path.push(value);
              frame(after, next, fits);
            }
          },
        });
    };

    frame(start, Integer.of(0));
  }
}
