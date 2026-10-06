import { Range, RangeSet } from '@fundamentry/range';
import { CodePoint } from '@fundamentry/scalar';

import { Expectation } from './Expectation.js';
import { HexValue } from './HexValue.js';

export class Quoted extends Expectation {
  static readonly #quotable = RangeSet.from([
    Range.closed(CodePoint.of(0x20), CodePoint.of(0x21)),
    Range.closed(CodePoint.of(0x23), CodePoint.of(0x7e)),
  ]);

  readonly #text: string;

  readonly #caseSensitive: boolean;

  private constructor(text: string, caseSensitive: boolean) {
    super();

    this.#text = text;
    this.#caseSensitive = caseSensitive;
  }

  static of(text: string): Quoted {
    return new Quoted(text, /[a-z]/iu.test(text));
  }

  text(): string {
    return this.#text;
  }

  isCaseSensitive(): boolean {
    return this.#caseSensitive;
  }

  caseless(): Quoted {
    return new Quoted(this.#text, false);
  }

  override equals(other: unknown): boolean {
    return (
      other instanceof Quoted &&
      this.#text === other.#text &&
      this.#caseSensitive === other.#caseSensitive
    );
  }

  override toString(): string {
    const codePoints = Array.from(this.#text, CodePoint.of);

    if (!codePoints.every(codePoint => Quoted.#quotable.contains(codePoint)))
      return String(HexValue.sequence(codePoints));

    return `${this.#caseSensitive ? '%s' : ''}"${this.#text}"`;
  }
}
