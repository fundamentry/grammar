import { type Prism } from '@fundamentry/category';
import { Failure, type Result, Success } from '@fundamentry/coproduct';
import {
  type NonNegativeInteger,
  type PositiveInfinity,
  isZero,
  nonNegativeInteger,
  positiveInfinity,
} from '@fundamentry/number';
import { type Point } from '@fundamentry/stream';

import { PrintMismatchError } from '#project/error';
import { type Node, Option, Repetition, Sequence } from '#project/tree';

export namespace Codec {
  export type Parsed<Token, A, E> = Result<
    Point.Step<Token, A>,
    Point.Step<Token, E>
  >;

  export type Printed<Token> = Result<readonly Token[], string>;
}

const review = <S, B, F>(
  prism: Prism<S, B, F>,
  value: B
): Result<S, string> => {
  try {
    const reviewed = prism.review(value);

    return prism.preview(reviewed).ok()
      ? new Success(reviewed)
      : new Failure(`'${String(reviewed)}' does not belong to this rule`);
  } catch (error) {
    if (error instanceof PrintMismatchError) return new Failure(error.message);

    throw error;
  }
};

const concatenate = <Token>(
  results: Iterable<Codec.Printed<Token>>
): Codec.Printed<Token> => {
  const tokens: Token[] = [];

  for (const result of results) {
    if (!result.ok()) return result;

    tokens.push(...result.value());
  }

  return new Success(tokens);
};

export class Codec<in out Token, in out A extends Node, out E> {
  readonly #parse: (point: Point<Token>) => Codec.Parsed<Token, A, E>;

  readonly #print: (value: A) => Codec.Printed<Token>;

  private constructor(
    parse: (point: Point<Token>) => Codec.Parsed<Token, A, E>,
    print: (value: A) => Codec.Printed<Token>
  ) {
    this.#parse = parse;
    this.#print = print;
  }

  static token<Token, A extends Node, E>(
    prism: Prism<Token, A, E>
  ): Codec<Token, A, E | string> {
    return new Codec<Token, A, E | string>(
      point => {
        const step = point.step();

        if (!step)
          return new Failure({
            value: 'Expected a token, got end of input',
            rest: point,
          });

        return prism
          .preview(step.value)
          .map(value => ({ value, rest: step.rest }))
          .orElse(reason => new Failure({ value: reason, rest: point }));
      },
      value => review(prism, value).map(reviewed => [reviewed])
    );
  }

  static tuple<Token, E, H extends Node, T extends readonly Node[]>(
    first: Codec<Token, H, E>,
    ...others: { [K in keyof T]: Codec<Token, T[K], E> }
  ): Codec<Token, Sequence<readonly [H, ...T]>, E> {
    const codecs = [first, ...others] as readonly Codec<Token, Node, E>[];

    return new Codec<Token, Sequence<readonly [H, ...T]>, E>(
      point =>
        codecs
          .reduce<Codec.Parsed<Token, readonly Node[], E>>(
            (result, codec) =>
              result.flatMap(({ value: values, rest }) =>
                codec.parse(rest).map(({ value, rest: next }) => ({
                  value: [...values, value],
                  rest: next,
                }))
              ),
            new Success({ value: [], rest: point })
          )
          .map(({ value, rest }) => ({
            value: new Sequence(value as unknown as readonly [H, ...T]),
            rest,
          })),
      sequence => {
        const values = sequence.elements();

        if (values.length !== codecs.length)
          return new Failure(
            `Expected a ${String(codecs.length)}-tuple, got ${String(values.length)} items`
          );

        return concatenate(
          codecs.values().map((codec, index) => codec.#print(values[index]))
        );
      }
    );
  }

  parse(point: Point<Token>): Codec.Parsed<Token, A, E> {
    return this.#parse(point);
  }

  print(value: A): Codec.Printed<Token> {
    return this.#print(value);
  }

  or<B extends Node, F>(next: Codec<Token, B, F>): Codec<Token, A | B, E | F> {
    return new Codec<Token, A | B, E | F>(
      point =>
        this.parse(point).orElse(left =>
          next
            .parse(point)
            .orElse(
              right =>
                new Failure(left.rest.compareTo(right.rest) > 0 ? left : right)
            )
        ),
      value => this.#print(value as A).orElse(() => next.#print(value as B))
    );
  }

  optional(): Codec<Token, Option<A>, E> {
    return new Codec<Token, Option<A>, E>(
      point =>
        this.parse(point)
          .map(({ value, rest }) => ({ value: new Option(value), rest }))
          .orElse(() => new Success({ value: new Option<A>(), rest: point })),
      option =>
        concatenate(
          option
            .elements()
            .values()
            .map(value => this.#print(value))
        )
    );
  }

  repeat(
    min: NonNegativeInteger,
    max: NonNegativeInteger | PositiveInfinity
  ): Codec<Token, Repetition<A>, E> {
    if (max < min)
      throw new RangeError(
        `Expected max (${String(max)}) to be at least min (${String(min)})`
      );

    const required = isZero(min)
      ? undefined
      : Codec.tuple(this, ...Array.from({ length: min - 1 }, () => this));

    return new Codec<Token, Repetition<A>, E>(
      point =>
        (
          required?.parse(point) ??
          new Success({ value: new Sequence([]), rest: point })
        ).map(({ value, rest: start }) => {
          const values: A[] = [...value.elements()];
          let rest = start;

          while (values.length < max) {
            const attempt = this.parse(rest);

            if (!attempt.ok() || attempt.value().rest.equals(rest)) break;

            values.push(attempt.value().value);
            rest = attempt.value().rest;
          }

          return { value: new Repetition(values), rest };
        }),
      repetition => {
        const values = repetition.elements();

        if (values.length < min || values.length > max)
          return new Failure(
            `Expected between ${String(min)} and ${String(max)} items, got ${String(values.length)}`
          );

        return concatenate(values.values().map(value => this.#print(value)));
      }
    );
  }

  many(): Codec<Token, Repetition<A>, E> {
    return this.repeat(nonNegativeInteger(0), positiveInfinity(Infinity));
  }

  oneOrMore(): Codec<Token, Repetition<A>, E> {
    return this.repeat(nonNegativeInteger(1), positiveInfinity(Infinity));
  }

  refine<B extends Node, F>(prism: Prism<A, B, F>): Codec<Token, B, E | F> {
    return new Codec<Token, B, E | F>(
      point =>
        this.parse(point).flatMap(({ value, rest }) =>
          prism
            .preview(value)
            .map(refined => ({ value: refined, rest }))
            .orElse(reason => new Failure({ value: reason, rest: point }))
        ),
      value => review(prism, value).flatMap(reviewed => this.#print(reviewed))
    );
  }
}
