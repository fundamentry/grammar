import { Expectation } from './Expectation.js';

export class Named extends Expectation {
  readonly #name: string;

  constructor(name: string) {
    super();

    this.#name = name;
  }

  name(): string {
    return this.#name;
  }

  override equals(other: unknown): boolean {
    return other instanceof Named && this.#name === other.#name;
  }

  override toString(): string {
    return this.#name;
  }
}
