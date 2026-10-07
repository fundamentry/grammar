import { type PartialIso } from '@fundamentry/category';

import { type Expectation, Named } from '#project/expectation';
import { type Expression } from '#project/expression';
import { Choice, type Node, Nonterminal, Sequence } from '#project/tree';

export namespace Singles {
  export interface Single<in out Token> {
    readonly match: (token: Token) => Node | undefined;
    readonly expected: readonly Expectation[];
  }
}

export class Singles<in out Token> implements Expression.Visitor<
  Token,
  undefined,
  Singles.Single<Token> | undefined
> {
  readonly #known = new Map<
    Expression<Token>,
    Singles.Single<Token> | undefined
  >();

  of(expression: Expression<Token>): Singles.Single<Token> | undefined {
    if (this.#known.has(expression)) return this.#known.get(expression);

    this.#known.set(expression, undefined);

    const single = expression.accept(this, undefined);

    this.#known.set(expression, single);

    return single;
  }

  terminal<Value extends Node>(
    conversion: PartialIso<Token, Value, unknown, string>,
    expectation: Expectation
  ): Singles.Single<Token> {
    return {
      match: token =>
        conversion.to(token).match<Node | undefined>({
          onSuccess: value => value,
          onFailure: () => undefined,
        }),
      expected: [expectation],
    };
  }

  concatenation(
    elements: readonly Expression<Token>[]
  ): Singles.Single<Token> | undefined {
    const [first, ...others] = elements.map(element => this.of(element));

    return first && others.length === 0
      ? Singles.#wrapped(first, value => new Sequence([value]), first.expected)
      : undefined;
  }

  alternation(
    alternatives: Expression.Alternatives<Token>
  ): Singles.Single<Token> | undefined {
    const singles = alternatives.map(alternative => this.of(alternative));

    return singles.every(single => single !== undefined)
      ? {
          match: token =>
            singles
              .values()
              .map(({ match }, index) => {
                const value = match(token);

                return value && new Choice(index, value);
              })
              .find(choice => choice !== undefined),
          expected: singles.flatMap(({ expected }) => expected),
        }
      : undefined;
  }

  optional(): undefined {
    return undefined;
  }

  repetition(): undefined {
    return undefined;
  }

  label(
    element: Expression<Token>,
    expectation: Expectation
  ): Singles.Single<Token> | undefined {
    const single = this.of(element);

    return single && { match: single.match, expected: [expectation] };
  }

  rule(
    element: Expression<Token>,
    rule: Nonterminal.Rule<string>
  ): Singles.Single<Token> | undefined {
    const single = this.of(element);

    return (
      single &&
      Singles.#wrapped(single, value => new Nonterminal(rule, value), [
        new Named(rule.name()),
      ])
    );
  }

  reference(
    target: () => Expression<Token>
  ): Singles.Single<Token> | undefined {
    return this.of(target());
  }

  static #wrapped<Token>(
    { match }: Singles.Single<Token>,
    wrap: (value: Node) => Node,
    expected: readonly Expectation[]
  ): Singles.Single<Token> {
    return {
      match: token => {
        const value = match(token);

        return value && wrap(value);
      },
      expected,
    };
  }
}
