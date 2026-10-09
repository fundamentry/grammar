import { Data } from '#project/data';

import { Steps } from './Steps.js';

export class Move extends Data {
  readonly #label: string;

  readonly #step: Steps.Step;

  readonly #chooses: boolean;

  private constructor(label: string, step: Steps.Step, chooses: boolean) {
    super();

    this.#label = label;
    this.#step = step;
    this.#chooses = chooses;
  }

  static rule(name: string): Move {
    return new Move(name, Steps.elements(), false);
  }

  static sequence(index: number): Move {
    return new Move(`sequence[${String(index)}]`, Steps.at(index), false);
  }

  static choice(index: number, fallback: Steps.Fallback): Move {
    return new Move(
      `choice[${String(index)}]`,
      Steps.alternative(index, fallback),
      true
    );
  }

  static option(fallback: Steps.Fallback): Move {
    return new Move('option', Steps.value(fallback), false);
  }

  step(): Steps.Step {
    return this.#step;
  }

  excludes(other: unknown): boolean {
    return (
      other instanceof Move &&
      this.#chooses &&
      other.#chooses &&
      !this.equals(other)
    );
  }

  override equals(other: unknown): boolean {
    return other instanceof Move && this.#label === other.#label;
  }

  override toString(): string {
    return this.#label;
  }
}
