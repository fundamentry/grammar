import { type Range } from '@fundamentry/range';
import { Integer } from '@fundamentry/scalar';
import { type Point } from '@fundamentry/stream';

import { Cache } from '#project/cache';
import { type Node } from '#project/tree';

import { type Context } from './Context.js';
import { type Continuation } from './Continuation.js';
import { type Parser } from './Parser.js';
import { Spans } from './Spans.js';

export class Repetitions {
  readonly #bounds: Range<Integer>;

  constructor(bounds: Range<Integer>) {
    this.#bounds = bounds;
  }

  from<Token>(
    start: Point<Token>,
    context: Context<Token>,
    element: Parser.Parse<Token>,
    continuation: Continuation<Token, readonly Node[]>
  ): void {
    const states = new Cache<number, Spans<Token>>(new Map());

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
      const spans = states.get(state(next, fits), () => new Spans(start));

      context.schedule(() => {
        if (satisfied) continuation.succeed({ value: [...path], rest });

        path.pop();
      });

      if (!satisfied || fits)
        element(
          rest,
          context,
          continuation.with<Node>(step => {
            if ((!satisfied || !step.rest.equals(rest)) && spans.visit(step)) {
              path.push(step.value);
              frame(step.rest, next, fits);
            }
          })
        );
    };

    frame(start, Integer.of(0));
  }
}
