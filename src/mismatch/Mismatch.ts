import { type Point } from '@fundamentry/stream';

import { Data } from '#project/data';
import { EndOfInput, type Expectation } from '#project/expectation';

export class Mismatch<Token> extends Data {
  static readonly #alternatives = new Intl.ListFormat('en', {
    type: 'disjunction',
  });

  static readonly #endOfInput = new EndOfInput();

  readonly #at: Point<Token>;

  readonly #expected: readonly Expectation[];

  readonly #messages: readonly string[];

  private constructor(
    at: Point<Token>,
    expected: readonly Expectation[],
    messages: readonly string[]
  ) {
    super();

    this.#at = at;
    this.#expected = expected;
    this.#messages = messages;
  }

  static empty<Token>(at: Point<Token>): Mismatch<Token> {
    return new Mismatch(at, [], []);
  }

  static expected<Token>(
    at: Point<Token>,
    ...expectations: readonly Expectation[]
  ): Mismatch<Token> {
    return expectations.reduce<Mismatch<Token>>(
      (mismatch, expectation) =>
        mismatch.#combine(new Mismatch(at, [expectation], [])),
      Mismatch.empty(at)
    );
  }

  static message<Token>(at: Point<Token>, message: string): Mismatch<Token> {
    return new Mismatch(at, [], [message]);
  }

  at(): Point<Token> {
    return this.#at;
  }

  expected(): readonly Expectation[] {
    return this.#expected;
  }

  messages(): readonly string[] {
    return this.#messages;
  }

  merge(other: Mismatch<Token>): Mismatch<Token> {
    const distance = other.#at.compareTo(this.#at);

    if (distance !== 0) return distance > 0 ? other : this;

    return this.#combine(other);
  }

  relabel(expectation: Expectation): Mismatch<Token> {
    return new Mismatch(this.#at, [expectation], this.#messages);
  }

  override equals(other: unknown): boolean {
    return (
      other instanceof Mismatch &&
      this.#at.equals(other.#at) &&
      this.toString() === other.toString()
    );
  }

  override toString(): string {
    if (this.#expected.length === 0) return this.#messages.join('; ');

    const found = this.#at.isAtEnd()
      ? String(Mismatch.#endOfInput)
      : `'${String(this.#at.peek())}'`;

    return [
      `Expected ${Mismatch.#alternatives.format(this.#expected.map(String))}, got ${found}`,
      ...this.#messages,
    ].join('; ');
  }

  #combine(other: Mismatch<Token>): Mismatch<Token> {
    return new Mismatch(
      this.#at,
      [
        ...this.#expected,
        ...other.#expected.filter(
          expectation =>
            !this.#expected.some(known => known.equals(expectation))
        ),
      ],
      [
        ...this.#messages,
        ...other.#messages.filter(message => !this.#messages.includes(message)),
      ]
    );
  }
}
