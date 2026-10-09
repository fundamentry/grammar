import { type Result } from '@fundamentry/coproduct';

import { Data } from '#project/data';
import { type Node } from '#project/tree';

import { Slot } from './Slot.js';
import { type Slots } from './Slots.js';
import { Steps } from './Steps.js';

export namespace Move {
  export interface Way {
    preview(node: Node): Result<Node, unknown>;

    step(slots: Slots): Steps.Step;
  }
}

export class Move extends Data {
  readonly #label: string;

  readonly #way: Move.Way;

  readonly #choice?: Steps.Step;

  private constructor(label: string, way: Move.Way, choice?: Steps.Step) {
    super();

    this.#label = label;
    this.#way = way;
    this.#choice = choice;
  }

  static rule(name: string): Move {
    return new Move(name, Move.#through(Steps.elements()));
  }

  static sequence(index: number): Move {
    return new Move(
      `sequence[${String(index)}]`,
      Move.#through(Steps.at(index))
    );
  }

  static choice(index: number, fallback: Steps.Fallback): Move {
    return new Move(
      `choice[${String(index)}]`,
      Slot.alternative(index, fallback),
      Steps.choose(index)
    );
  }

  static option(fallback: Steps.Fallback): Move {
    return new Move('option', Slot.value(fallback));
  }

  preview(node: Node): Result<Node, unknown> {
    return this.#way.preview(node);
  }

  step(slots: Slots): Steps.Step {
    return this.#way.step(slots);
  }

  choose(slots: Slots): Steps.Step {
    return this.#choice ?? this.#way.step(slots);
  }

  blocks(node: Node): boolean {
    return (
      !this.#way.preview(node).ok() && Boolean(this.#choice?.preview(node).ok())
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

  static #through(step: Steps.Step): Move.Way {
    return { preview: node => step.preview(node), step: () => step };
  }

  override equals(other: unknown): boolean {
    return other instanceof Move && this.#label === other.#label;
  }

  override toString(): string {
    return this.#label;
  }
}
