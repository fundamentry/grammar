import { type Range } from '@fundamentry/range';
import { type CodePoint } from '@fundamentry/scalar';

import { Data } from '#project/data';

export class HexValue extends Data {
  static readonly #last = 0x10ffff;

  readonly #values: readonly number[];

  readonly #separator: string;

  private constructor(values: readonly number[], separator: string) {
    super();

    this.#values = values;
    this.#separator = separator;
  }

  static range(range: Range<CodePoint>): HexValue {
    const first =
      (range.lowerEndpoint()?.value() ?? 0) +
      Number(range.lowerBoundType() === 'OPEN');
    const last =
      (range.upperEndpoint()?.value() ?? HexValue.#last) -
      Number(range.upperBoundType() === 'OPEN');

    return new HexValue(first === last ? [first] : [first, last], '-');
  }

  static sequence(codePoints: readonly CodePoint[]): HexValue {
    return new HexValue(
      codePoints.map(codePoint => codePoint.value()),
      '.'
    );
  }

  override equals(other: unknown): boolean {
    return other instanceof HexValue && this.toString() === other.toString();
  }

  override toString(): string {
    return `%x${this.#values.map(value => value.toString(16).toUpperCase().padStart(2, '0')).join(this.#separator)}`;
  }
}
