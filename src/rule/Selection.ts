import { type Optic } from '@fundamentry/category';

import { type Codec, route, Steps, write } from '#project/codec';
import {
  Choice,
  Focus,
  type Node,
  Nonterminal,
  Option,
  Repetition,
  Sequence,
  View,
} from '#project/tree';

import { type Rule } from './Rule.js';

export const select: unique symbol = Symbol('select');

export namespace Selection {
  export interface Grammar {
    [write]<T extends Node>(
      place: Focus<T, Node>,
      update: (text: string) => string
    ): Codec.Parsed<T>;
  }
}

export class Selection<
  T extends Node,
  A extends Node,
  G extends Selection.Grammar = Codec<A>,
> extends View<A> {
  readonly #focus: Focus<T, A>;

  readonly #grammar: G;

  readonly #place: Focus<T, Node>;

  private constructor(focus: Focus<T, A>, grammar: G, place: Focus<T, Node>) {
    super(() => focus.values());

    this.#focus = focus;
    this.#grammar = grammar;
    this.#place = place;
  }

  static [select]<T extends Node, Name extends string, Elements extends Node>(
    tree: T,
    rule: Rule<Name, Elements>
  ): Selection<T, Nonterminal<Name, Elements>> {
    return new Selection<T, Nonterminal<Name, Elements>>(
      Focus.of(tree, node => rule.is(node)),
      rule,
      Focus.of(tree, (node): node is Node => rule.is(node))
    );
  }

  set(value: A): T;

  set(text: string): Codec.Parsed<T>;

  set(value: A | string): T | Codec.Parsed<T> {
    return typeof value === 'string'
      ? this.#grammar[write](this.#place, () => value)
      : this.#focus.set(value);
  }

  modify(update: (value: A) => A): T {
    return this.#focus.modify(update);
  }

  edit(update: (text: string) => string): Codec.Parsed<T> {
    return this.#grammar[write](this.#place, update);
  }

  remove(): T {
    return this.#place.remove();
  }

  insert<E extends Node>(
    this: Selection<T, Repetition<E>>,
    index: number,
    element: E
  ): T;

  insert<E extends Node>(
    this: Selection<T, Repetition<E>>,
    index: number,
    text: string
  ): Codec.Parsed<T>;

  insert<E extends Node>(
    this: Selection<T, Repetition<E>>,
    index: number,
    element: E | string
  ): T | Codec.Parsed<T>;

  insert<E extends Node>(
    this: Selection<T, Repetition<E>>,
    index: number,
    element: E | string
  ): T | Codec.Parsed<T> {
    const inserted = (value: E) =>
      this.#focus
        .focus(Repetition.elements())
        .modify(elements => elements.toSpliced(index, 0, value));

    return typeof element === 'string'
      ? this.#grammar.element().parse(element).map(inserted)
      : inserted(element);
  }

  append<E extends Node>(this: Selection<T, Repetition<E>>, element: E): T;

  append<E extends Node>(
    this: Selection<T, Repetition<E>>,
    text: string
  ): Codec.Parsed<T>;

  append<E extends Node>(
    this: Selection<T, Repetition<E>>,
    element: E | string
  ): T | Codec.Parsed<T> {
    return this.insert(Infinity, element);
  }

  prepend<E extends Node>(this: Selection<T, Repetition<E>>, element: E): T;

  prepend<E extends Node>(
    this: Selection<T, Repetition<E>>,
    text: string
  ): Codec.Parsed<T>;

  prepend<E extends Node>(
    this: Selection<T, Repetition<E>>,
    element: E | string
  ): T | Codec.Parsed<T> {
    return this.insert(0, element);
  }

  focus<B>(optic: Optic<Optic.Kind, A, B, unknown>): Focus<T, B> {
    return this.#focus.focus(optic);
  }

  to<Name extends string, Elements extends Node>(
    this: Selection<T, A>,
    rule: Rule<Name, Elements>
  ): Selection<T, Nonterminal<Name, Elements>> {
    const place = this.#place.focus(this.#grammar[route](rule));

    return new Selection(place.focus(rule.prism()), rule, place);
  }

  elements<Name extends string, Elements extends Node>(
    this: Selection<T, Nonterminal<Name, Elements>>
  ): Selection<T, Elements> {
    return new Selection(
      this.#focus.focus(Nonterminal.elements()),
      this.#grammar.elements(),
      this.#place.focus(Steps.elements())
    );
  }

  at<U extends readonly Node[], const I extends Node.Index<U>>(
    this: Selection<T, Sequence<U>>,
    index: I
  ): Selection<T, U[I]> {
    return new Selection(
      this.#focus.focus(Sequence.at<U, I>(index)),
      this.#grammar.at<U, I>(index),
      this.#place.focus(Steps.at(index))
    );
  }

  element<E extends Node>(
    this: Selection<T, Repetition<E>>,
    index: number
  ): Selection<T, E> {
    return new Selection(
      this.#focus.focus(Repetition.at<E>(index)),
      this.#grammar.element(),
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
    const codec = this.#grammar.value();
    const fallback = codec.default();

    return new Selection(
      this.#focus.focus(
        fallback.match<Optic<Optic.Kind, Option<U>, U, unknown>>({
          onSuccess: initial => Option.valueFrom(initial),
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
    const codec = this.#grammar.alternative<U, I>(index);
    const fallback = codec.default();

    return new Selection(
      this.#focus.focus(
        fallback.match<Optic<Optic.Kind, Choice<U>, U[I], unknown>>({
          onSuccess: initial => Choice.alternativeFrom<U, I>(index, initial),
          onFailure: () => Choice.alternative<U, I>(index),
        })
      ),
      codec,
      this.#place.focus(Steps.alternative(index, fallback))
    );
  }
}
