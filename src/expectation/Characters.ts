import { Range, RangeSet } from '@fundamentry/range';
import { CodePoint } from '@fundamentry/scalar';

import { Expectation } from './Expectation.js';
import { HexValue } from './HexValue.js';

export class Characters extends Expectation {
  readonly #ranges: RangeSet<CodePoint>;

  constructor(ranges: RangeSet<CodePoint>) {
    super();

    this.#ranges = ranges;
  }

  static [Symbol.hasInstance](value: unknown): value is Characters {
    return value instanceof Object && #ranges in value;
  }

  ranges(): RangeSet<CodePoint> {
    return this.#ranges;
  }

  elements(): readonly string[] {
    return this.#ranges.asRanges().map(range => String(HexValue.range(range)));
  }

  caseless(): Characters {
    const swapped = (first: number, offset: number) =>
      Array.from({ length: 26 }, (_, index) => first + index)
        .filter(code => this.#ranges.contains(CodePoint.of(code)))
        .map(code =>
          Range.closedOpen(
            CodePoint.of(code + offset),
            CodePoint.of(code + offset + 1)
          )
        );

    return new Characters(
      RangeSet.from([
        ...this.#ranges.asRanges(),
        ...swapped(0x41, 0x20),
        ...swapped(0x61, -0x20),
      ])
    );
  }

  override equals(other: unknown): boolean {
    return other instanceof Characters && this.toString() === other.toString();
  }

  override toString(): string {
    return this.elements().join(' / ');
  }
}
