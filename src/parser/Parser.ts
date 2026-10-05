import { type PartialIso } from '@fundamentry/category';
import { type Result } from '@fundamentry/coproduct';
import { type Range } from '@fundamentry/range';
import { Integer } from '@fundamentry/scalar';
import { type Point } from '@fundamentry/stream';

import { Cache } from '#project/cache';
import { type Expectation } from '#project/expectation';
import { type Expression } from '#project/expression';
import { Mismatch } from '#project/mismatch';
import { type Node, Option, Repetition, Sequence } from '#project/tree';

import { Alternatives } from './Alternatives.js';
import { Chain } from './Chain.js';
import { Context } from './Context.js';
import { LeftCorners } from './LeftCorners.js';
import { Repetitions } from './Repetitions.js';
import { Visits } from './Visits.js';

export namespace Parser {
  export interface Label<Token> {
    readonly start: Point<Token>;
    readonly expectation: Expectation;
  }

  export interface Continuation<Token, Value = Node> {
    readonly label?: Label<Token>;
    readonly succeed: (step: Point.Step<Token, Value>) => void;
  }

  export type Parse<Token> = (
    point: Point<Token>,
    context: Context<Token>,
    continuation: Continuation<Token>
  ) => void;

  export interface Compiled<Token> {
    readonly parse: Parse<Token>;
    readonly starts: (token?: Token) => boolean;
    readonly nullable: boolean;
    readonly expected: readonly Expectation[];
    readonly alternatives?: Alternatives<Token>;
  }

  export type Draft<Token> = Omit<Compiled<Token>, 'nullable'>;

  export type Parsed<Token> = Result<Node, Mismatch<Token>>;
}

export class Parser<Token> implements Expression.Visitor<
  Token,
  undefined,
  Parser.Draft<Token>
> {
  readonly #compiled = new Cache<Expression<Token>, Parser.Compiled<Token>>();

  readonly #corners: LeftCorners<Token>;

  readonly #root: Parser.Compiled<Token>;

  constructor(expression: Expression<Token>) {
    this.#corners = new LeftCorners(expression);
    this.#root = this.#compile(expression);
  }

  parse(start: Point<Token>): Parser.Parsed<Token> {
    return Context.run(start, this.#root.parse);
  }

  terminal<Value extends Node>(
    conversion: PartialIso<Token, Value, unknown, string>,
    expectation: Expectation
  ): Parser.Draft<Token> {
    return {
      parse: (point, context, continuation) => {
        const step = point.step();
        const value = step ? conversion.to(step.value) : undefined;

        if (step && value?.ok())
          context.succeed(continuation, {
            value: value.value(),
            rest: step.rest,
          });
        else
          context.fail(
            Mismatch.expected(point, expectation),
            continuation.label
          );
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
            element.parse(rest, context, {
              label: continuation.label,
              succeed: step =>
                proceed(index + 1, prefix.append(step.value), step.rest),
            });
          else
            context.succeed(continuation, {
              value: new Sequence(prefix.toArray()),
              rest,
            });
        };

        proceed(0, Chain.empty(), point);
      }),
      starts: token => leading.some(element => element.starts(token)),
      expected: leading.flatMap(({ expected }) => expected),
    };
  }

  alternation([left, right]: readonly [
    Expression<Token>,
    Expression<Token>,
  ]): Parser.Draft<Token> {
    const alternatives = Alternatives.of(
      this.#compile(left),
      this.#compile(right)
    );

    return {
      parse: Parser.#preferred((point, context, continuation) =>
        alternatives.from(point, context, continuation)
      ),
      starts: token => alternatives.starts(token),
      expected: alternatives.expected(),
      alternatives,
    };
  }

  optional(element: Expression<Token>): Parser.Draft<Token> {
    const { parse, starts, expected } = this.#compile(element);

    return {
      parse: Parser.#preferred((point, context, continuation) => {
        context.succeed(continuation, { value: new Option(), rest: point });
        parse(
          point,
          context,
          Parser.#mapped(continuation, value => new Option(value))
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
          Parser.#mapped(
            continuation,
            (values: readonly Node[]) => new Repetition(values)
          )
        )
      ),
      starts: token => iterates && starts(token),
      expected: iterates ? expected : [],
    };
  }

  refinement<Value extends Node, Refined extends Node>(
    element: Expression<Token>,
    conversion: PartialIso<Value, Refined, string, string>
  ): Parser.Draft<Token> {
    const { parse, starts, nullable, expected } = this.#compile(element);

    return {
      parse: Parser.#preferred((point, context, continuation) =>
        parse(point, context, {
          label: continuation.label,
          succeed: ({ value, rest }) =>
            conversion.to(value as Value).match({
              onSuccess: refined =>
                continuation.succeed({ value: refined, rest }),
              onFailure: reason =>
                context.fail(
                  Mismatch.message(rest, reason),
                  continuation.label
                ),
            }),
        })
      ),
      starts: nullable ? () => true : starts,
      expected,
    };
  }

  label(
    element: Expression<Token>,
    expectation: Expectation
  ): Parser.Draft<Token> {
    const { parse, starts } = this.#compile(element);

    return {
      parse: Parser.#preferred((point, context, continuation) =>
        parse(point, context, {
          label: continuation.label?.start.equals(point)
            ? continuation.label
            : { start: point, expectation },
          succeed: continuation.succeed,
        })
      ),
      starts,
      expected: [expectation],
    };
  }

  rule(element: Expression<Token>): Parser.Draft<Token> {
    return this.#compile(element);
  }

  reference(target: () => Expression<Token>): Parser.Draft<Token> {
    const rule = () => this.#compile(target());

    return {
      parse: this.#corners.isLeftRecursive(target())
        ? (point, context: Context<Token>, continuation) =>
            context.grow(rule().parse, point, continuation)
        : (point, context, continuation) =>
            rule().parse(point, context, continuation),
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
      const spans = new Visits<number>();

      parse(point, context, {
        label: continuation.label,
        succeed: step => {
          if (spans.visit(step.rest.distanceFrom(point)))
            continuation.succeed(step);
        },
      });
    };
  }

  static #mapped<Token, Value>(
    continuation: Parser.Continuation<Token>,
    map: (value: Value) => Node
  ): Parser.Continuation<Token, Value> {
    return {
      label: continuation.label,
      succeed: ({ value, rest }) =>
        continuation.succeed({ value: map(value), rest }),
    };
  }
}
