import { nonNegative, type NonNegative } from '@fundamentry/number';
import { type Consumable, type Seekable } from '@fundamentry/stream';

import { Matched, Recognition, Unmatched } from '#project/recognition';

export namespace Rule {
  export type Input = Seekable & Consumable;

  export type Derivation<T> = (input: Input) => Matched<T> | Unmatched;
}

export class Rule<T> {
  readonly #derivation: Rule.Derivation<T>;

  constructor(derivation: Rule.Derivation<T>) {
    this.#derivation = input =>
      Recognition.attempt(
        () => derivation(input),
        input.tell(),
        start => input.seek(start)
      );
  }

  derive(input: Rule.Input): Matched<T> | Unmatched {
    return this.#derivation(input);
  }

  map<R>(mapper: (value: T) => R): Rule<R> {
    return new Rule(input => {
      const recognition = this.derive(input);

      return recognition instanceof Matched
        ? recognition.map(mapper)
        : recognition;
    });
  }

  many(): Rule<T[]> {
    return this.atMost(nonNegative(Infinity));
  }

  times(count: NonNegative): Rule<T[]> {
    return new Rule<T[]>(input => {
      const values: T[] = [];

      for (let index = 0; index < count; index++) {
        const recognition = this.derive(input);

        if (!(recognition instanceof Matched)) return new Unmatched();

        values.push(recognition.value());
      }

      return new Matched(values);
    });
  }

  atMost(max: NonNegative): Rule<T[]> {
    return new Rule<T[]>(input => {
      const values: T[] = [];

      for (let index = 0; index < max; index++) {
        const start = input.tell();
        const recognition = this.derive(input);

        if (!(recognition instanceof Matched) || input.tell() === start) break;

        values.push(recognition.value());
      }

      return new Matched(values);
    });
  }

  optional(): Rule<T | undefined> {
    return new Rule<T | undefined>(input => {
      const recognition = this.derive(input);

      return recognition instanceof Matched
        ? recognition
        : recognition.orElse(() => undefined);
    });
  }

  required(): Rule<NonNullable<T>> {
    return this.filter(
      (value): value is NonNullable<T> => value !== undefined && value !== null
    );
  }

  default(fallback: () => NonNullable<T>): Rule<NonNullable<T>> {
    return this.map(value => value ?? fallback());
  }

  filter<S extends T>(predicate: (value: T) => value is S): Rule<S>;

  filter(predicate: (value: T) => boolean): Rule<T>;

  filter(predicate: (value: T) => boolean): Rule<T> {
    return new Rule(input => {
      const recognition = this.derive(input);

      return recognition instanceof Matched && predicate(recognition.value())
        ? recognition
        : new Unmatched();
    });
  }

  or<R>(other: Rule<R>): Rule<T | R> {
    return Rule.oneOf(this, other);
  }

  followedBy<R>(other: Rule<R>): Rule<T> {
    return Rule.sequence(this, other).map(([value]) => value);
  }

  precededBy<R>(other: Rule<R>): Rule<T> {
    return Rule.sequence(other, this).map(([, value]) => value);
  }

  join<U>(this: Rule<U[]>, separator = ''): Rule<string> {
    return this.map(values => values.join(separator));
  }

  reduce<U, A>(
    this: Rule<U[]>,
    reducer: (accumulator: A, value: U, index: number) => A,
    initial: A
  ): Rule<A> {
    return this.map(values => values.reduce(reducer, initial));
  }

  static matching<T>(predicate: (value: unknown) => value is T): Rule<T> {
    return new Rule<T>(input => {
      const value = input.consumeIf(predicate);

      return value !== undefined ? new Matched(value) : new Unmatched();
    });
  }

  static sequence<Values extends unknown[]>(
    ...rules: { [K in keyof Values]: Rule<Values[K]> }
  ): Rule<Values> {
    return new Rule(input => {
      const values: unknown[] = [];

      const matched = rules.every(rule => {
        const recognition = rule.derive(input);

        if (!(recognition instanceof Matched)) return false;

        values.push(recognition.value());

        return true;
      });

      return matched ? new Matched(values as Values) : new Unmatched();
    });
  }

  static oneOf<Values extends unknown[]>(
    ...rules: { [K in keyof Values]: Rule<Values[K]> }
  ): Rule<Values[number]> {
    return new Rule(input =>
      rules.reduce<Matched<Values[number]> | Unmatched>(
        (recognition, rule) =>
          recognition instanceof Matched ? recognition : rule.derive(input),
        new Unmatched()
      )
    );
  }

  static oneOrMore<T>(first: Rule<T>): Rule<[T, ...T[]]>;

  static oneOrMore<F, R>(first: Rule<F>, rest: Rule<R>): Rule<[F, ...R[]]>;

  static oneOrMore(
    first: Rule<unknown>,
    rest: Rule<unknown> = first
  ): Rule<unknown[]> {
    return Rule.sequence(first, rest.many()).map(([head, tail]) => [
      head,
      ...tail,
    ]);
  }
}
