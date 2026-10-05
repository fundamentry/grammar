import { type CodePoint } from '@fundamentry/scalar';

import { Node } from './Node.js';

export class Literal extends Node {
  readonly #codePoint: CodePoint;

  constructor(codePoint: CodePoint) {
    super();

    this.#codePoint = codePoint;
  }

  codePoint(): CodePoint {
    return this.#codePoint;
  }

  override equals(other: unknown): boolean {
    return other instanceof Literal && this.#codePoint.equals(other.#codePoint);
  }

  override toString(): string {
    return this.#codePoint.toString();
  }
}
