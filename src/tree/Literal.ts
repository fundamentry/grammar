import { type CodePoint } from '@fundamentry/scalar';
import { type Equatable, type Stringable } from '@fundamentry/trait';

export class Literal implements Equatable<unknown>, Stringable {
  readonly #codePoint: CodePoint;

  constructor(codePoint: CodePoint) {
    this.#codePoint = codePoint;
  }

  codePoint(): CodePoint {
    return this.#codePoint;
  }

  equals(other: unknown): boolean {
    return other instanceof Literal && this.#codePoint.equals(other.#codePoint);
  }

  toString(): string {
    return this.#codePoint.toString();
  }
}
