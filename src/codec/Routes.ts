import { type CodePoint } from '@fundamentry/scalar';

import { type Expression } from '#project/expression';
import { type Nonterminal } from '#project/tree';

import { Move } from './Move.js';
import { Route } from './Route.js';
import { type Steps } from './Steps.js';

export namespace Routes {
  export type Rules = ReadonlySet<Nonterminal.Rule<string>>;

  export type Fallbacks = (expression: Expression<CodePoint>) => Steps.Fallback;
}

export class Routes<
  R extends Nonterminal.Rule<string> = Nonterminal.Rule<string>,
> implements Expression.Visitor<CodePoint, Routes.Rules, readonly Route<R>[]> {
  static readonly #alternatives = new Intl.ListFormat('en', {
    type: 'disjunction',
  });

  readonly #targets: readonly R[];

  readonly #fallbacks: Routes.Fallbacks;

  constructor(targets: readonly R[], fallbacks: Routes.Fallbacks) {
    this.#targets = targets;
    this.#fallbacks = fallbacks;
  }

  from(expression: Expression<CodePoint>): readonly Route<R>[] {
    return expression.accept(this, new Set());
  }

  exclusive(expression: Expression<CodePoint>): readonly Route<R>[] {
    const routes = this.from(expression);
    const [first] = routes;

    if (!first) throw new RangeError(`0 routes lead to ${this.#names()}`);

    const [clash] = routes.flatMap((route: Route<R>, index) =>
      routes
        .slice(index + 1)
        .filter(other => !route.excludes(other))
        .map(other => `${String(route)} and ${String(other)}`)
    );

    if (clash) throw new RangeError(`Routes ${clash} can meet in one tree`);

    return routes;
  }

  terminal(): readonly Route<R>[] {
    return [];
  }

  concatenation(
    elements: readonly Expression<CodePoint>[],
    rules: Routes.Rules
  ): readonly Route<R>[] {
    return elements.flatMap((element, index) =>
      element
        .accept(this, rules)
        .map(route => route.after(Move.sequence(index)))
    );
  }

  alternation(
    alternatives: Expression.Alternatives<CodePoint>,
    rules: Routes.Rules
  ): readonly Route<R>[] {
    return alternatives.flatMap((alternative, index) =>
      alternative
        .accept(this, rules)
        .map(route =>
          route.after(Move.choice(index, this.#fallbacks(alternative)))
        )
    );
  }

  optional(
    element: Expression<CodePoint>,
    rules: Routes.Rules
  ): readonly Route<R>[] {
    return element
      .accept(this, rules)
      .map(route => route.after(Move.option(this.#fallbacks(element))));
  }

  repetition(): readonly Route<R>[] {
    return [];
  }

  label(
    element: Expression<CodePoint>,
    _: unknown,
    rules: Routes.Rules
  ): readonly Route<R>[] {
    return element.accept(this, rules);
  }

  rule(
    element: Expression<CodePoint>,
    rule: Nonterminal.Rule<string>,
    rules: Routes.Rules
  ): readonly Route<R>[] {
    const target = this.#targets.find(member => member === rule);

    if (target) return [Route.to(target)];

    return rules.has(rule)
      ? []
      : element
          .accept(this, new Set(rules).add(rule))
          .map(route => route.after(Move.rule(rule.name())));
  }

  reference(
    target: () => Expression<CodePoint>,
    rules: Routes.Rules
  ): readonly Route<R>[] {
    return target().accept(this, rules);
  }

  #names(): string {
    return Routes.#alternatives.format(this.#targets.map(rule => rule.name()));
  }
}
