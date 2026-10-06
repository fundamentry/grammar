import { type Point } from '@fundamentry/stream';

import { Data } from '#project/data';
import { EndOfInput, type Expectation } from '#project/expectation';
import { Mismatch } from '#project/mismatch';

export class Frontier<Token> extends Data {
  static readonly #endOfInput = new EndOfInput();

  readonly #at: Point<Token>;

  readonly #expected: readonly Expectation[];

  private constructor(at: Point<Token>, expected: readonly Expectation[]) {
    super();

    this.#at = at;
    this.#expected = expected;
  }

  static empty<Token>(at: Point<Token>): Frontier<Token> {
    return new Frontier(at, []);
  }

  static expected<Token>(
    at: Point<Token>,
    ...expectations: readonly Expectation[]
  ): Frontier<Token> {
    return expectations.reduce<Frontier<Token>>(
      (frontier, expectation) =>
        frontier.#combine(new Frontier(at, [expectation])),
      Frontier.empty(at)
    );
  }

  at(): Point<Token> {
    return this.#at;
  }

  expected(): readonly Expectation[] {
    return this.#expected;
  }

  compareReach(other: Frontier<Token>): number {
    if (this.#isEmpty() || other.#isEmpty())
      return Number(other.#isEmpty()) - Number(this.#isEmpty());

    return this.#at.compareTo(other.#at);
  }

  merge(other: Frontier<Token>): Frontier<Token> {
    const distance = other.compareReach(this);

    if (distance !== 0) return distance > 0 ? other : this;

    return this.#combine(other);
  }

  relabel(expectation: Expectation): Frontier<Token> {
    return this.#isEmpty() ? this : new Frontier(this.#at, [expectation]);
  }

  override equals(other: unknown): boolean {
    return (
      other instanceof Frontier &&
      this.#at.equals(other.#at) &&
      this.toString() === other.toString()
    );
  }

  mismatch(origin: Point<Token>): Mismatch {
    return new Mismatch(
      this.#at.distanceFrom(origin),
      this.#expected,
      this.#at.isAtEnd()
        ? String(Frontier.#endOfInput)
        : `'${String(this.#at.peek())}'`
    );
  }

  override toString(): string {
    return String(this.mismatch(this.#at));
  }

  #isEmpty(): boolean {
    return this.#expected.length === 0;
  }

  #combine(other: Frontier<Token>): Frontier<Token> {
    return new Frontier(this.#at, [
      ...this.#expected,
      ...other.#expected.filter(
        expectation => !this.#expected.some(known => known.equals(expectation))
      ),
    ]);
  }
}
