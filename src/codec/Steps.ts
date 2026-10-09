import {
  FallibleMorphism,
  Morphism,
  Optional,
  Prism,
} from '@fundamentry/category';
import { Failure, type Result, Success } from '@fundamentry/coproduct';

import {
  Choice,
  type Node,
  Nonterminal,
  Option,
  Repetition,
  Sequence,
} from '#project/tree';

export namespace Steps {
  export type Step = Optional<Node, Node, unknown>;

  export type Fallback = Result<Node, unknown>;
}

export class Steps {
  static elements(): Steps.Step {
    return Optional.of(
      FallibleMorphism.of(node =>
        node instanceof Nonterminal
          ? new Success(node.elements())
          : new Failure(undefined)
      ),
      Morphism.of(update =>
        Morphism.of(node =>
          node instanceof Nonterminal
            ? new Nonterminal(node.rule(), update.apply(node.elements()))
            : node
        )
      )
    );
  }

  static at(index: number): Steps.Step {
    return Optional.of(
      FallibleMorphism.of(node => {
        const element = node.children()[index];

        return node instanceof Sequence && element
          ? new Success(element)
          : new Failure(undefined);
      }),
      Morphism.of(update =>
        Morphism.of(node => {
          const element = node.children()[index];

          return node instanceof Sequence && element
            ? new Sequence(node.elements().with(index, update.apply(element)))
            : node;
        })
      )
    );
  }

  static element(index: number): Steps.Step {
    return Optional.id<Node>()
      .andThen(
        Prism.fromPredicate(
          node => node instanceof Repetition,
          () => undefined
        )
      )
      .andThen(Repetition.at(index));
  }

  static value(fallback: Steps.Fallback): Steps.Step {
    return Steps.slot(
      (node: Node) => node instanceof Option,
      option => option.value(),
      value => new Option(value),
      fallback
    );
  }

  static alternative(index: number, fallback: Steps.Fallback): Steps.Step {
    return Steps.slot(
      node => node instanceof Choice,
      choice => (choice.index() === index ? choice.value() : undefined),
      value => new Choice(index, value),
      fallback
    );
  }

  static choose(index: number): Steps.Step {
    return Optional.of(
      FallibleMorphism.of(node =>
        node instanceof Choice
          ? new Success(node.value())
          : new Failure(undefined)
      ),
      Morphism.of(update =>
        Morphism.of(node =>
          node instanceof Choice
            ? new Choice(index, update.apply(node.value()))
            : node
        )
      )
    );
  }

  static slot<S extends Node>(
    is: (node: Node) => node is S,
    read: (slot: S) => Node | undefined,
    wrap: (value: Node) => Node,
    fallback: Steps.Fallback
  ): Steps.Step {
    const preview = (slot: S): Steps.Fallback => {
      const value = read(slot);

      return value ? new Success(value) : new Failure(undefined);
    };

    const created =
      (slot: S, update: Morphism<Node, Node>) => (initial: Node) => {
        const updated = update.apply(initial);

        return updated.equals(initial) ? slot : wrap(updated);
      };

    const modify = (slot: S, update: Morphism<Node, Node>) => {
      const value = read(slot);

      return value
        ? wrap(update.apply(value))
        : fallback.match({
            onSuccess: created(slot, update),
            onFailure: () => slot,
          });
    };

    return Optional.of(
      FallibleMorphism.of(node =>
        is(node) ? preview(node) : new Failure(undefined)
      ),
      Morphism.of(update =>
        Morphism.of(node => (is(node) ? modify(node, update) : node))
      )
    );
  }
}
