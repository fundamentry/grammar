import { type PartialIso } from '@fundamentry/category';
import { type Range } from '@fundamentry/range';
import { type Integer } from '@fundamentry/scalar';

import { type Expectation } from '#project/expectation';
import { type Node, type Nonterminal } from '#project/tree';

import { type Expression } from './Expression.js';

export namespace Fallback {
  export interface Preferred<
    Token,
    Input,
    Output extends object,
  > extends Expression.Composites<Token, Input, Output | undefined> {
    terminal<Value extends Node>(
      conversion: PartialIso<Token, Value, unknown, string>,
      expectation: Expectation,
      input: Input
    ): Output;
  }
}

export class Fallback<
  Token,
  Input,
  Preferred extends object,
  Output,
> implements Expression.Visitor<Token, Input, Output> {
  readonly #preferred: Fallback.Preferred<Token, Input, Preferred>;

  readonly #lift: (preferred: Preferred) => Output;

  readonly #otherwise: Expression.Composites<Token, Input, Output>;

  constructor(
    preferred: Fallback.Preferred<Token, Input, Preferred>,
    lift: (preferred: Preferred) => Output,
    otherwise: Expression.Composites<Token, Input, Output>
  ) {
    this.#preferred = preferred;
    this.#lift = lift;
    this.#otherwise = otherwise;
  }

  terminal<Value extends Node>(
    conversion: PartialIso<Token, Value, unknown, string>,
    expectation: Expectation,
    input: Input
  ): Output {
    return this.#lift(this.#preferred.terminal(conversion, expectation, input));
  }

  concatenation(elements: readonly Expression<Token>[], input: Input): Output {
    const preferred = this.#preferred.concatenation(elements, input);

    return preferred
      ? this.#lift(preferred)
      : this.#otherwise.concatenation(elements, input);
  }

  alternation(
    alternatives: Expression.Alternatives<Token>,
    input: Input
  ): Output {
    const preferred = this.#preferred.alternation(alternatives, input);

    return preferred
      ? this.#lift(preferred)
      : this.#otherwise.alternation(alternatives, input);
  }

  optional(element: Expression<Token>, input: Input): Output {
    const preferred = this.#preferred.optional(element, input);

    return preferred
      ? this.#lift(preferred)
      : this.#otherwise.optional(element, input);
  }

  repetition(
    element: Expression<Token>,
    bounds: Range<Integer>,
    input: Input
  ): Output {
    const preferred = this.#preferred.repetition(element, bounds, input);

    return preferred
      ? this.#lift(preferred)
      : this.#otherwise.repetition(element, bounds, input);
  }

  label(
    element: Expression<Token>,
    expectation: Expectation,
    input: Input
  ): Output {
    const preferred = this.#preferred.label(element, expectation, input);

    return preferred
      ? this.#lift(preferred)
      : this.#otherwise.label(element, expectation, input);
  }

  rule(
    element: Expression<Token>,
    rule: Nonterminal.Rule<string>,
    input: Input
  ): Output {
    const preferred = this.#preferred.rule(element, rule, input);

    return preferred
      ? this.#lift(preferred)
      : this.#otherwise.rule(element, rule, input);
  }

  reference(target: () => Expression<Token>, input: Input): Output {
    const preferred = this.#preferred.reference(target, input);

    return preferred
      ? this.#lift(preferred)
      : this.#otherwise.reference(target, input);
  }
}
