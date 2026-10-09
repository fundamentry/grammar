import { FallibleMorphism, Morphism, Optional } from '@fundamentry/category';
import { Failure, Success } from '@fundamentry/coproduct';

import { type Node, type Nonterminal } from '#project/tree';

import { type Route } from './Route.js';
import { type Slots } from './Slots.js';
import { type Steps } from './Steps.js';

export class Junction<R extends Nonterminal.Rule<string>> {
  readonly #routes: readonly Route<R>[];

  constructor(routes: readonly Route<R>[]) {
    this.#routes = routes;
  }

  optic(slots: Slots): Steps.Step {
    const admitted = (routes: readonly Route<R>[], value: Node) => {
      const [taken] = routes;
      const form = routes.find(route => route.admits(value));

      if (!form)
        throw new RangeError(
          `'${String(value)}' cannot take the place of ${String(taken)}`
        );

      return form;
    };

    const replace = (node: Node, taken: Route<R>, value: Node) =>
      admitted([taken, ...this.alternates(taken)], value)
        .choose(slots)
        .set(node, value);

    const create = (
      node: Node,
      route: Route<R>,
      update: Morphism<Node, Node>
    ) =>
      route
        .optic(slots)
        .modify(
          Morphism.of(value => {
            const created = update.apply(value);

            admitted([route], created);

            return created;
          })
        )
        .apply(node);

    return Optional.of(
      FallibleMorphism.of(
        node =>
          this.along(node, (_, value) => new Success(value)) ??
          new Failure(undefined)
      ),
      Morphism.of(update =>
        Morphism.of(
          node =>
            this.along(node, (taken, value) =>
              replace(node, taken, update.apply(value))
            ) ??
            this.fitting(node, route => create(node, route, update)) ??
            node
        )
      )
    );
  }

  along<T>(
    node: Node,
    visit: (taken: Route<R>, value: Node) => T
  ): T | undefined {
    return this.#routes
      .values()
      .flatMap(route =>
        route.preview(node).match({
          onSuccess: value => [visit(route, value)],
          onFailure: () => [],
        })
      )
      .find(() => true);
  }

  fitting<T>(node: Node, visit: (route: Route<R>) => T): T | undefined {
    return this.#routes
      .values()
      .filter(route => route.fits(node))
      .map(visit)
      .find(() => true);
  }

  alternates(taken: Route<R>): readonly Route<R>[] {
    return this.#routes.filter(route => taken.alternates(route));
  }
}
