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

import { PrintMismatchError } from '../error/PrintMismatchError.js';

export namespace Codec {
  export type Parsed<Token, A, E> = Result<
    Point.Step<Token, A>,
    Point.Step<Token, E>
  >;
}

export class Codec<in out Token, in out A, out E> {
  readonly #parse: (point: Point<Token>) => Codec.Parsed<Token, A, E>;

  readonly #print: (value: A) => readonly Token[];

  private constructor(
    parse: (point: Point<Token>) => Codec.Parsed<Token, A, E>,
    print: (value: A) => readonly Token[]
  ) {
    this.#parse = parse;
    this.#print = print;
  }

  static token<Token, A, E>(
    prism: Prism<Token, A, E>
  ): Codec<Token, A, E | string> {
    return new Codec<Token, Token, string>(
      point => {
        const step = point.step();

        return step
          ? new Success(step)
          : new Failure({
              value: 'Expected a token, got end of input',
              rest: point,
            });
      },
      token => [token]
    ).refine(prism);
  }

  static tuple<Token, E, H, T extends readonly unknown[]>(
    first: Codec<Token, H, E>,
    ...others: { [K in keyof T]: Codec<Token, T[K], E> }
  ): Codec<Token, readonly [H, ...T], E> {
    const codecs = [first, ...others] as readonly Codec<Token, unknown, E>[];

    return new Codec<Token, readonly [H, ...T], E>(
      point =>
        codecs.reduce<Codec.Parsed<Token, unknown[], E>>(
          (result, codec) =>
            result.flatMap(({ value: values, rest }) =>
              codec.parse(rest).map(({ value, rest: next }) => {
                values.push(value);

                return { value: values, rest: next };
              })
            ),
          new Success({ value: [], rest: point })
        ) as Codec.Parsed<Token, readonly [H, ...T], E>,
      values => {
        if (values.length !== codecs.length)
          throw new PrintMismatchError(
            `Expected a ${String(codecs.length)}-tuple, got ${String(values.length)} items`
          );

        return codecs.flatMap((codec, index) => codec.#print(values[index]));
      }
    );
  }

  parse(point: Point<Token>): Codec.Parsed<Token, A, E> {
    return this.#parse(point);
  }

  print(value: A): Result<readonly Token[], string> {
    try {
      return new Success(this.#print(value));
    } catch (error) {
      if (error instanceof PrintMismatchError)
        return new Failure(error.message);

      throw error;
    }
  }

  or<B, F>(next: Codec<Token, B, F>): Codec<Token, A | B, E | F> {
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
      value => {
        try {
          return this.#print(value as A);
        } catch (error) {
          if (error instanceof PrintMismatchError)
            return next.#print(value as B);

          throw error;
        }
      }
    );
  }

  optional(): Codec<Token, A | undefined, E> {
    return new Codec<Token, A | undefined, E>(
      point =>
        this.parse(point).orElse(
          () => new Success({ value: undefined, rest: point })
        ),
      value => (value === undefined ? [] : this.#print(value))
    );
  }

  repeat(
    min: NonNegativeInteger,
    max: NonNegativeInteger | PositiveInfinity
  ): Codec<Token, readonly A[], E> {
    if (max < min)
      throw new RangeError(
        `Expected max (${String(max)}) to be at least min (${String(min)})`
      );

    const required = isZero(min)
      ? undefined
      : Codec.tuple(this, ...Array.from({ length: min - 1 }, () => this));

    return new Codec<Token, readonly A[], E>(
      point =>
        (required?.parse(point) ?? new Success({ value: [], rest: point })).map(
          ({ value, rest: start }) => {
            const values: A[] = [...value];
            let rest = start;

            while (values.length < max) {
              const attempt = this.parse(rest);

              if (!attempt.ok() || attempt.value().rest.equals(rest)) break;

              values.push(attempt.value().value);
              rest = attempt.value().rest;
            }

            return { value: values, rest };
          }
        ),
      values => {
        if (values.length < min || values.length > max)
          throw new PrintMismatchError(
            `Expected between ${String(min)} and ${String(max)} items, got ${String(values.length)}`
          );

        return values.flatMap(value => this.#print(value));
      }
    );
  }

  many(): Codec<Token, readonly A[], E> {
    return this.repeat(nonNegativeInteger(0), positiveInfinity(Infinity));
  }

  oneOrMore(): Codec<Token, readonly A[], E> {
    return this.repeat(nonNegativeInteger(1), positiveInfinity(Infinity));
  }

  refine<B, F>(prism: Prism<A, B, F>): Codec<Token, B, E | F> {
    return new Codec<Token, B, E | F>(
      point =>
        this.parse(point).flatMap(({ value, rest }) =>
          prism
            .preview(value)
            .map(refined => ({ value: refined, rest }))
            .orElse(reason => new Failure({ value: reason, rest: point }))
        ),
      value => {
        const reviewed = prism.review(value);

        if (!prism.preview(reviewed).ok())
          throw new PrintMismatchError(
            `'${String(reviewed)}' does not belong to this rule`
          );

        return this.#print(reviewed);
      }
    );
  }
}
