import { Data } from '#project/data';
import { type Expectation } from '#project/expectation';

export class Mismatch extends Data {
  static readonly #alternatives = new Intl.ListFormat('en', {
    type: 'disjunction',
  });

  readonly #offset: number;

  readonly #expected: readonly Expectation[];

  readonly #found: string;

  constructor(offset: number, expected: readonly Expectation[], found: string) {
    super();

    this.#offset = offset;
    this.#expected = expected;
    this.#found = found;
  }

  offset(): number {
    return this.#offset;
  }

  expected(): readonly Expectation[] {
    return this.#expected;
  }

  override equals(other: unknown): boolean {
    return (
      other instanceof Mismatch &&
      this.#offset === other.#offset &&
      this.toString() === other.toString()
    );
  }

  override toString(): string {
    return `Expected ${Mismatch.#alternatives.format(this.#expected.map(String))}, got ${this.#found}`;
  }
}
