import { type Optic, Prism } from '@fundamentry/category';

import { type Codec, Steps } from '#project/codec';
import {
  Choice,
  Focus,
  type Node,
  Nonterminal,
  Option,
  Repetition,
  Sequence,
} from '#project/tree';

import { type Rule } from './Rule.js';

export class Selection<T extends Node, A extends Node> implements Iterable<A> {
  readonly #focus: Focus<T, A>;

  readonly #codec: Codec<A>;

  readonly #place: Focus<T, Node>;

  private constructor(
    focus: Focus<T, A>,
    codec: Codec<A>,
    place: Focus<T, Node>
  ) {
    this.#focus = focus;
    this.#codec = codec;
    this.#place = place;
  }

  static of<T extends Node, Name extends string, Elements extends Node>(
    tree: T,
    rule: Rule<Name, Elements>
  ): Selection<T, Nonterminal<Name, Elements>> {
    return new Selection(
      Focus.of(tree, node => rule.is(node)),
      rule,
      Focus.of(tree, (node): node is Node => rule.is(node))
    );
  }

  values(): IteratorObject<A> {
    return this.#focus.values();
  }

  [Symbol.iterator](): IteratorObject<A> {
    return this.values();
  }

  find(): A | undefined {
    return this.#focus.find();
  }

  set(value: A): T;

  set(text: string): Codec.Parsed<T>;

  set(value: A | string): T | Codec.Parsed<T> {
    return typeof value === 'string'
      ? this.#codec.parse(value).map(node => this.#focus.set(node))
      : this.#focus.set(value);
  }

  modify(update: (value: A) => A): T {
    return this.#focus.modify(update);
  }

  remove(): T {
    return this.#place.remove();
  }

  focus<B>(optic: Optic<Optic.Kind, A, B, unknown>): Focus<T, B> {
    return this.#focus.focus(optic);
  }

  to<Name extends string, Elements extends Node>(
    rule: Rule<Name, Elements>
  ): Selection<T, Nonterminal<Name, Elements>> {
    const place = this.#place.focus(this.#codec.route(rule));

    return new Selection(
      place.focus(
        Prism.fromPredicate(
          node => rule.is(node),
          () => undefined
        )
      ),
      rule,
      place
    );
  }

  elements<Name extends string, Elements extends Node>(
    this: Selection<T, Nonterminal<Name, Elements>>
  ): Selection<T, Elements> {
    return new Selection(
      this.#focus.focus(Nonterminal.elements()),
      this.#codec.elements(),
      this.#place.focus(Steps.elements())
    );
  }

  at<U extends readonly Node[], const I extends Node.Index<U>>(
    this: Selection<T, Sequence<U>>,
    index: I
  ): Selection<T, U[I]> {
    return new Selection(
      this.#focus.focus(Sequence.at<U, I>(index)),
      this.#codec.at<U, I>(index),
      this.#place.focus(Steps.at(index))
    );
  }

  element<E extends Node>(
    this: Selection<T, Repetition<E>>,
    index: number
  ): Selection<T, E> {
    return new Selection(
      this.#focus.focus(Repetition.at<E>(index)),
      this.#codec.element(),
      this.#place.focus(Steps.element(index))
    );
  }

  first<E extends Node>(this: Selection<T, Repetition<E>>): Selection<T, E> {
    return this.element(0);
  }

  last<E extends Node>(this: Selection<T, Repetition<E>>): Selection<T, E> {
    return this.element(-1);
  }

  value<U extends Node>(this: Selection<T, Option<U>>): Selection<T, U> {
    const codec = this.#codec.value();
    const fallback = codec.default();

    return new Selection(
      this.#focus.focus(
        fallback.match<Optic<Optic.Kind, Option<U>, U, unknown>>({
          onSuccess: initial => Option.valueOr(initial),
          onFailure: () => Option.value(),
        })
      ),
      codec,
      this.#place.focus(Steps.value(fallback))
    );
  }

  alternative<U extends readonly Node[], const I extends Node.Index<U>>(
    this: Selection<T, Choice<U>>,
    index: I
  ): Selection<T, U[I]> {
    const codec = this.#codec.alternative<U, I>(index);
    const fallback = codec.default();

    return new Selection(
      this.#focus.focus(
        fallback.match<Optic<Optic.Kind, Choice<U>, U[I], unknown>>({
          onSuccess: initial => Choice.alternativeOr<U, I>(index, initial),
          onFailure: () => Choice.alternative<U, I>(index),
        })
      ),
      codec,
      this.#place.focus(Steps.alternative(index, fallback))
    );
  }
}
