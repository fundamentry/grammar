import { Data } from '#project/data';
import { type Node } from '#project/tree';

import { Steps } from './Steps.js';

export class Move extends Data {
  readonly #label: string;

  readonly #step: Steps.Step;

  readonly #choice?: Steps.Step;

  private constructor(label: string, step: Steps.Step, choice?: Steps.Step) {
    super();

    this.#label = label;
    this.#step = step;
    this.#choice = choice;
  }

  static rule(name: string): Move {
    return new Move(name, Steps.elements());
  }

  static sequence(index: number): Move {
    return new Move(`sequence[${String(index)}]`, Steps.at(index));
  }

  static choice(index: number, fallback: Steps.Fallback): Move {
    return new Move(
      `choice[${String(index)}]`,
      Steps.alternative(index, fallback),
      Steps.choose(index)
    );
  }

  static option(fallback: Steps.Fallback): Move {
    return new Move('option', Steps.value(fallback));
  }

  step(): Steps.Step {
    return this.#step;
  }

  choose(): Steps.Step {
    return this.#choice ?? this.#step;
  }

  blocks(node: Node): boolean {
    return (
      !this.#step.preview(node).ok() &&
      Boolean(this.#choice?.preview(node).ok())
    );
  }

  excludes(other: unknown): boolean {
    return Boolean(
      other instanceof Move &&
      this.#choice &&
      other.#choice &&
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
