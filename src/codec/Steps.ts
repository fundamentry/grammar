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
  Repetition,
  Sequence,
} from '#project/tree';

export namespace Steps {
  export type Step = Optional<Node, Node, unknown>;

  export interface Fallback {
    default(): Result<Node, unknown>;
  }
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
}
