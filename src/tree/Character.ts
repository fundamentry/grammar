import { type CodePoint } from '@fundamentry/scalar';

import { Node } from './Node.js';

export class Character extends Node {
  readonly #codePoint: CodePoint;

  constructor(codePoint: CodePoint) {
    super();

    this.#codePoint = codePoint;
  }

  codePoint(): CodePoint {
    return this.#codePoint;
  }

  override map(): this {
    return this;
  }

  override children(): readonly [] {
    return Object.freeze<[]>([]);
  }

  override equals(other: unknown): boolean {
    return (
      other instanceof Character && this.#codePoint.equals(other.#codePoint)
    );
  }

  override toString(): string {
    return this.#codePoint.toString();
  }
}
