import { type Range } from '@fundamentry/range';
import { Integer } from '@fundamentry/scalar';

import { Data } from '#project/data';

export namespace Term {
  export type Precedence = 'alternation' | 'concatenation' | 'element';
}

export class Term extends Data {
  static readonly #precedences: readonly Term.Precedence[] = [
    'alternation',
    'concatenation',
    'element',
  ];

  readonly #text: string;

  readonly #precedence: Term.Precedence;

  private constructor(text: string, precedence: Term.Precedence) {
    super();

    this.#text = text;
    this.#precedence = precedence;
  }

  static element(text: string): Term {
    return new Term(text, 'element');
  }

  static concatenation(...terms: readonly Term[]): Term {
    const [first, ...others] = terms;

    if (!first) return Term.element('""');

    if (others.length === 0) return first;

    return new Term(
      terms.map(term => term.within('concatenation')).join(' '),
      'concatenation'
    );
  }

  static alternation(first: Term, ...others: readonly Term[]): Term {
    if (others.length === 0) return first;

    return new Term(
      [first, ...others].map(term => term.within('alternation')).join(' / '),
      'alternation'
    );
  }

  optional(): Term {
    return Term.element(`[${this.#text}]`);
  }

  repeated(bounds: Range<Integer>): Term {
    const canonical = bounds.canonical();

    const count = (value?: Integer) => (value?.value() ? value.toString() : '');

    const minimum = canonical.lowerEndpoint() ?? Integer.of(0);
    const maximum = canonical.upperEndpoint()?.decrement();

    const prefix = maximum?.equals(minimum)
      ? minimum.toString()
      : `${count(minimum)}*${count(maximum)}`;

    return Term.element(`${prefix}${this.within('element')}`);
  }

  within(precedence: Term.Precedence): string {
    return Term.#precedences.indexOf(this.#precedence) >=
      Term.#precedences.indexOf(precedence)
      ? this.#text
      : `(${this.#text})`;
  }

  override equals(other: unknown): boolean {
    return (
      other instanceof Term &&
      this.#text === other.#text &&
      this.#precedence === other.#precedence
    );
  }

  override toString(): string {
    return this.#text;
  }
}
