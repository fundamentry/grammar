import { Equatable, type Stringable } from '@fundamentry/trait';

export abstract class Data implements Equatable, Stringable {
  abstract equals(other: unknown): boolean;

  abstract toString(): string;

  [Equatable.symbol](other: unknown): boolean {
    return this.equals(other);
  }

  [Symbol.toPrimitive](): string {
    return this.toString();
  }
}
