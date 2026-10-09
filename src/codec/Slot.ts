import { FallibleMorphism, Morphism, Optional } from '@fundamentry/category';
import { Failure, type Result, Success } from '@fundamentry/coproduct';

import { Choice, type Node, Option } from '#project/tree';

import { type Slots } from './Slots.js';
import { type Steps } from './Steps.js';

export class Slot<S extends Node> {
  readonly #is: (node: Node) => node is S;

  readonly #read: (slot: S) => Node | undefined;

  readonly #wrap: (value: Node) => Node;

  readonly #fallback: Steps.Fallback;

  private constructor(
    is: (node: Node) => node is S,
    read: (slot: S) => Node | undefined,
    wrap: (value: Node) => Node,
    fallback: Steps.Fallback
  ) {
    this.#is = is;
    this.#read = read;
    this.#wrap = wrap;
    this.#fallback = fallback;
  }

  static value(fallback: Steps.Fallback): Slot<Option<Node>> {
    return new Slot(
      (node): node is Option<Node> => node instanceof Option,
      option => option.value(),
      value => new Option(value),
      fallback
    );
  }

  static alternative(
    index: number,
    fallback: Steps.Fallback
  ): Slot<Choice<readonly Node[]>> {
    return new Slot(
      (node): node is Choice<readonly Node[]> => node instanceof Choice,
      choice => (choice.index() === index ? choice.value() : undefined),
      value => new Choice(index, value),
      fallback
    );
  }

  preview(node: Node): Result<Node, undefined> {
    const value = this.#is(node) ? this.#read(node) : undefined;

    return value ? new Success(value) : new Failure(undefined);
  }

  step(slots: Slots): Steps.Step {
    const created =
      (slot: S, update: Morphism<Node, Node>) => (initial: Node) => {
        const updated = update.apply(initial);

        return slots.keeps(updated, initial) ? slot : this.#wrap(updated);
      };

    const modify = (slot: S, update: Morphism<Node, Node>) => {
      const value = this.#read(slot);

      return value
        ? this.#wrap(update.apply(value))
        : this.#fallback.default().match({
            onSuccess: created(slot, update),
            onFailure: () => slot,
          });
    };

    return Optional.of(
      FallibleMorphism.of(node => this.preview(node)),
      Morphism.of(update =>
        Morphism.of(node => (this.#is(node) ? modify(node, update) : node))
      )
    );
  }
}
