import { Range } from '@fundamentry/range';
import { Integer } from '@fundamentry/scalar';

import { type Node, Option, Repetition, Sequence } from '#project/tree';

import { Concatenation } from './Concatenation.js';
import { type Expression } from './Expression.js';
import { Optional } from './Optional.js';
import { Repetition as Repeated } from './Repetition.js';

export class Separated<Token> implements Expression<Token> {
  readonly #element: Expression<Token>;

  readonly #separator: Expression<Token>;

  readonly #bounds: Range<Integer>;

  readonly #expansion: Expression<Token>;

  constructor(
    element: Expression<Token>,
    separator: Expression<Token>,
    bounds: Range<Integer>
  ) {
    this.#element = element;
    this.#separator = separator;
    this.#bounds = bounds;
    this.#expansion = Separated.expand(element, separator, bounds);
  }

  static expand<Token>(
    element: Expression<Token>,
    separator: Expression<Token>,
    bounds: Range<Integer>
  ): Expression<Token> {
    const list = new Concatenation([
      element,
      new Repeated(
        new Concatenation([separator, element]),
        Separated.rest(bounds)
      ),
    ]);

    return bounds.contains(Integer.of(0)) ? new Optional(list) : list;
  }

  static rest(bounds: Range<Integer>): Range<Integer> {
    const items = bounds
      .intersection(Range.atLeast(Integer.of(1)))
      ?.canonical();
    const lower = items?.lowerEndpoint();
    const upper = items?.upperEndpoint();

    if (!lower || items?.isEmpty())
      throw new RangeError(`Invalid list bounds: ${String(bounds)}`);

    return upper
      ? Range.closedOpen(lower.decrement(), upper.decrement())
      : Range.atLeast(lower.decrement());
  }

  static collect(expanded: Node): Repetition<Node, Node> {
    const lists = expanded instanceof Option ? expanded.children() : [expanded];
    const parts = lists.flatMap(list => list.children());
    const pairs = parts.slice(1).flatMap(rest => rest.children());

    return new Repetition(
      [
        ...parts.slice(0, 1),
        ...pairs.flatMap(pair => pair.children().slice(1)),
      ],
      pairs.flatMap(pair => pair.children().slice(0, 1))
    );
  }

  static spread(list: Repetition<Node, Node>, bounds: Range<Integer>): Node {
    const [first, ...rest] = list.elements();
    const separators = list.separators();
    const pairs = rest.flatMap((item, index) =>
      separators
        .slice(index, index + 1)
        .map(separator => new Sequence([separator, item]))
    );
    const spread = first && new Sequence([first, new Repetition(pairs)]);

    return bounds.contains(Integer.of(0))
      ? new Option(spread)
      : (spread ?? new Sequence([]));
  }

  accept<Input, Output>(
    visitor: Expression.Visitor<Token, Input, Output>,
    input: Input
  ): Output {
    return visitor.separated(
      this.#element,
      this.#separator,
      this.#bounds,
      this.#expansion,
      input
    );
  }
}
