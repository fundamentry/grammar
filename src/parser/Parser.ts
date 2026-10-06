import { type PartialIso } from '@fundamentry/category';
import { type Result } from '@fundamentry/coproduct';
import { type Range } from '@fundamentry/range';
import { Integer } from '@fundamentry/scalar';
import { type Point } from '@fundamentry/stream';

import { Cache } from '#project/cache';
import { EndOfInput, type Expectation, Named } from '#project/expectation';
import { type Expression } from '#project/expression';
import { type Mismatch } from '#project/mismatch';
import {
  type Node,
  Nonterminal,
  Option,
  Repetition,
  Sequence,
} from '#project/tree';

import { Alternatives } from './Alternatives.js';
import { Chain } from './Chain.js';
import { type Column } from './Column.js';
import { Context } from './Context.js';
import { type Continuation } from './Continuation.js';
import { Frontier } from './Frontier.js';
import { LeftCorners } from './LeftCorners.js';
import { Repetitions } from './Repetitions.js';
import { Spans } from './Spans.js';

export namespace Parser {
  export type Parse<in out Token> = (
    point: Point<Token>,
    context: Context<Token>,
    continuation: Continuation<Token>
  ) => void;

  export interface Compiled<in out Token> {
    readonly parse: Parse<Token>;
    readonly starts: (token?: Token) => boolean;
    readonly nullable: boolean;
    readonly expected: readonly Expectation[];
    readonly alternatives?: Alternatives<Token>;
  }

  export type Draft<Token> = Omit<Compiled<Token>, 'nullable'>;

  export type Parsed = Result<Node, Mismatch>;
}

export class Parser<in out Token> implements Expression.Visitor<
  Token,
  undefined,
  Parser.Draft<Token>
> {
  readonly #compiled = new Cache<Expression<Token>, Parser.Compiled<Token>>();

  readonly #rules = new Cache<Expression<Token>, Column.Rule<Token>>();

  readonly #corners: LeftCorners<Token>;

  readonly #root: Parser.Compiled<Token>;

  constructor(expression: Expression<Token>) {
    this.#corners = new LeftCorners(expression);
    this.#root = this.#compile(expression);
  }

  parse(start: Point<Token>): Parser.Parsed {
    return Context.run(start, (point, context, continuation) =>
      this.#root.parse(
        point,
        context,
        continuation.with(step => {
          if (step.rest.isAtEnd()) continuation.succeed(step);
          else context.fail(Frontier.expected(step.rest, new EndOfInput()));
        })
      )
    );
  }

  terminal<Value extends Node>(
    conversion: PartialIso<Token, Value, unknown, string>,
    expectation: Expectation
  ): Parser.Draft<Token> {
    return {
      parse: (point, context, continuation) => {
        const fail = () =>
          context.fail(
            continuation.relabel(Frontier.expected(point, expectation))
          );
        const step = point.step();

        if (step)
          conversion.to(step.value).match({
            onSuccess: value =>
              context.succeed(continuation, [{ value, rest: step.rest }]),
            onFailure: fail,
          });
        else fail();
      },
      starts: token => token !== undefined && conversion.to(token).ok(),
      expected: [expectation],
    };
  }

  concatenation(elements: readonly Expression<Token>[]): Parser.Draft<Token> {
    const compiled = elements.map(element => this.#compile(element));

    const boundary = compiled.findIndex(({ nullable }) => !nullable);
    const leading =
      boundary === -1 ? compiled : compiled.slice(0, boundary + 1);

    return {
      parse: Parser.#preferred((point, context, continuation) => {
        const proceed = (
          index: number,
          prefix: Chain<Node>,
          rest: Point<Token>
        ): void => {
          const element = compiled[index];

          if (element)
            element.parse(
              rest,
              context,
              continuation.with(step =>
                proceed(index + 1, prefix.append(step.value), step.rest)
              )
            );
          else
            context.succeed(continuation, [
              {
                value: new Sequence(prefix.toArray()),
                rest,
              },
            ]);
        };

        proceed(0, Chain.empty(), point);
      }),
      starts: token => leading.some(element => element.starts(token)),
      expected: leading.flatMap(({ expected }) => expected),
    };
  }

  alternation(
    alternatives: Expression.Alternatives<Token>
  ): Parser.Draft<Token> {
    const compiled = Alternatives.of(
      alternatives.map(alternative => this.#compile(alternative))
    );

    return {
      parse: Parser.#preferred((point, context, continuation) =>
        compiled.from(point, context, continuation)
      ),
      starts: token => compiled.starts(token),
      expected: compiled.expected(),
      alternatives: compiled,
    };
  }

  optional(element: Expression<Token>): Parser.Draft<Token> {
    const { parse, starts, expected } = this.#compile(element);

    return {
      parse: Parser.#preferred((point, context, continuation) => {
        context.succeed(continuation, [{ value: new Option(), rest: point }]);
        parse(
          point,
          context,
          continuation.map((value: Node) => new Option(value))
        );
      }),
      starts,
      expected,
    };
  }

  repetition(
    element: Expression<Token>,
    bounds: Range<Integer>
  ): Parser.Draft<Token> {
    const { parse, starts, expected } = this.#compile(element);

    const repetitions = new Repetitions(bounds);
    const iterates =
      !bounds.contains(Integer.of(0)) || bounds.contains(Integer.of(1));

    return {
      parse: Parser.#preferred((point, context, continuation) =>
        repetitions.from(
          point,
          context,
          parse,
          continuation.map((values: readonly Node[]) => new Repetition(values))
        )
      ),
      starts: token => iterates && starts(token),
      expected: iterates ? expected : [],
    };
  }

  label(
    element: Expression<Token>,
    expectation: Expectation
  ): Parser.Draft<Token> {
    const { parse, starts } = this.#compile(element);

    return {
      parse: Parser.#preferred((point, context, continuation) =>
        parse(point, context, continuation.labelled(point, expectation))
      ),
      starts,
      expected: [expectation],
    };
  }

  rule(
    element: Expression<Token>,
    rule: Nonterminal.Rule<string>
  ): Parser.Draft<Token> {
    const { parse, starts } = this.#compile(element);
    const expectation = new Named(rule.name());

    return {
      parse: (point, context, continuation) =>
        parse(
          point,
          context,
          continuation
            .labelled(point, expectation)
            .map((value: Node) => new Nonterminal(rule, value))
        ),
      starts,
      expected: [expectation],
    };
  }

  reference(target: () => Expression<Token>): Parser.Draft<Token> {
    const rule = () =>
      this.#rules.get(target(), expression => ({
        expression,
        parse: (point, context, continuation) =>
          this.#compile(expression).parse(point, context, continuation),
        corners: this.#corners.of(expression).corners,
      }));

    return {
      parse: (point, context: Context<Token>, continuation) =>
        context.recall(rule(), point, continuation),
      starts: () => true,
      expected: [],
    };
  }

  #compile(expression: Expression<Token>): Parser.Compiled<Token> {
    return this.#compiled.get(expression, () => ({
      ...expression.accept(this, undefined),
      nullable: this.#corners.of(expression).nullable,
    }));
  }

  static #preferred<Token>(parse: Parser.Parse<Token>): Parser.Parse<Token> {
    return (point, context, continuation) => {
      const spans = new Spans(point);

      parse(
        point,
        context,
        continuation.with(step => {
          if (spans.visit(step)) continuation.succeed(step);
        })
      );
    };
  }
}
