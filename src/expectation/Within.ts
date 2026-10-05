import { Range, RangeSet } from '@fundamentry/range';
import { type Comparable, type Stringable } from '@fundamentry/trait';

import { Expectation } from './Expectation.js';

export class Within<T extends Comparable<T> & Stringable> extends Expectation {
  readonly #ranges: RangeSet<T>;

  constructor(ranges: RangeSet<T>) {
    super();

    this.#ranges = ranges;
  }

  static [Symbol.hasInstance](
    value: unknown
  ): value is Within<Comparable & Stringable> {
    return value instanceof Object && #ranges in value;
  }

  ranges(): RangeSet<T> {
    return this.#ranges;
  }

  override equals(other: unknown): boolean {
    return other instanceof Within && this.toString() === other.toString();
  }

  only(): T | undefined {
    const value = this.#ranges.asRanges()[0]?.lowerEndpoint();

    return value &&
      String(RangeSet.from([Range.singleton(value)])) === String(this.#ranges)
      ? value
      : undefined;
  }

  override toString(): string {
    const only = this.only();

    return only
      ? `'${only[Symbol.toPrimitive]('string')}'`
      : `one of ${String(this.#ranges)}`;
  }
}
