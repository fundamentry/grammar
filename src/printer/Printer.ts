import { type PartialIso } from '@fundamentry/category';
import { Failure, type Result, Success } from '@fundamentry/coproduct';
import { type Range } from '@fundamentry/range';
import { Integer } from '@fundamentry/scalar';
import { Point } from '@fundamentry/stream';

import { Cache } from '#project/cache';
import { type Expression } from '#project/expression';
import { Misprint } from '#project/misprint';
import {
  Choice,
  type Node,
  Nonterminal,
  Option,
  Repetition,
  Sequence,
} from '#project/tree';

import { Rope } from './Rope.js';

export namespace Printer {
  export type Printed<Token> = Result<Rope<Token>, Misprint>;

  export type Print<Token> = (value: Node) => Printed<Token>;
}

export class Printer<Token> implements Expression.Visitor<
  Token,
  undefined,
  Printer.Print<Token>
> {
  readonly #compiled = new Cache<Expression<Token>, Printer.Print<Token>>();

  readonly #root: Printer.Print<Token>;

  constructor(expression: Expression<Token>) {
    this.#root = this.#compile(expression);
  }

  print(value: Node): Printer.Printed<Token> {
    return this.#root(value);
  }

  terminal<Value extends Node>(
    conversion: PartialIso<Token, Value, unknown, string>
  ): Printer.Print<Token> {
    return value =>
      conversion.from(value as Value).match<Printer.Printed<Token>>({
        onSuccess: token => new Success(Rope.of(token)),
        onFailure: reason => new Failure(new Misprint([], reason)),
      });
  }

  concatenation(elements: readonly Expression<Token>[]): Printer.Print<Token> {
    const prints = elements.map((element, index) =>
      Printer.#within(this.#compile(element), { node: 'sequence', index })
    );

    return value => {
      if (!(value instanceof Sequence))
        return Printer.#unexpected('a sequence', value);

      const values = value.elements();
      const arity = new Failure(
        new Misprint(
          [],
          `Expected a ${String(prints.length)}-tuple, got ${String(values.length)} items`
        )
      );

      return prints
        .reduce<Result<Point.Step<Node, Rope<Token>>, Misprint>>(
          (printed, print) =>
            printed.flatMap(({ value: rope, rest }) => {
              const step = rest.step();

              return step
                ? print(step.value).map(tail => ({
                    value: rope.concat(tail),
                    rest: step.rest,
                  }))
                : arity;
            }),
          new Success({ value: Rope.empty(), rest: Point.of(values) })
        )
        .flatMap(({ value: rope, rest }) =>
          rest.isAtEnd() ? new Success(rope) : arity
        );
    };
  }

  alternation(
    alternatives: Expression.Alternatives<Token>
  ): Printer.Print<Token> {
    const prints = alternatives.map((alternative, index) =>
      Printer.#within(this.#compile(alternative), { node: 'choice', index })
    );

    return value =>
      value instanceof Choice
        ? value.match(prints)
        : Printer.#unexpected('a choice', value);
  }

  optional(element: Expression<Token>): Printer.Print<Token> {
    const print = Printer.#within(this.#compile(element), { node: 'option' });

    return value => {
      if (!(value instanceof Option))
        return Printer.#unexpected('an option', value);

      const present = value.value();

      return present ? print(present) : new Success(Rope.empty());
    };
  }

  repetition(
    element: Expression<Token>,
    bounds: Range<Integer>
  ): Printer.Print<Token> {
    const print = this.#compile(element);

    return value => {
      if (!(value instanceof Repetition))
        return Printer.#unexpected('a repetition', value);

      const values = value.elements();
      const count = Integer.of(values.length);

      if (!bounds.contains(count))
        return new Failure(
          new Misprint(
            [],
            `Expected a count in ${String(bounds)}, got ${String(count)}`
          )
        );

      return values.reduce<Printer.Printed<Token>>(
        (printed, item, index) =>
          printed.flatMap(rope =>
            Printer.#within(print, { node: 'repetition', index })(item).map(
              tail => rope.concat(tail)
            )
          ),
        new Success(Rope.empty())
      );
    };
  }

  label(element: Expression<Token>): Printer.Print<Token> {
    return Printer.#within(this.#compile(element), { node: 'label' });
  }

  rule(
    element: Expression<Token>,
    rule: Nonterminal.Rule<string>
  ): Printer.Print<Token> {
    const print = this.#compile(element);

    return Printer.#within(
      value =>
        value instanceof Nonterminal && value.rule() === rule
          ? print(value.elements())
          : new Failure(
              new Misprint([], `'${String(value)}' is not ${rule.name()}`)
            ),
      { node: 'rule', name: rule.name() }
    );
  }

  reference(target: () => Expression<Token>): Printer.Print<Token> {
    return value => this.#compile(target())(value);
  }

  #compile(expression: Expression<Token>): Printer.Print<Token> {
    return this.#compiled.get(expression, () =>
      expression.accept(this, undefined)
    );
  }

  static #within<Token>(
    print: Printer.Print<Token>,
    step: Misprint.Step
  ): Printer.Print<Token> {
    return value =>
      print(value).orElse(
        misprint =>
          new Failure(
            new Misprint([step, ...misprint.path()], misprint.message())
          )
      );
  }

  static #unexpected(kind: string, value: Node): Failure<Misprint> {
    return new Failure(
      new Misprint([], `Expected ${kind}, got '${String(value)}'`)
    );
  }
}
