import { type Optic } from '@fundamentry/category';
import { Failure, Success } from '@fundamentry/coproduct';

import { type Codec, route, Steps } from '#project/codec';
import {
  Choice,
  Focus,
  type Node,
  Nonterminal,
  Option,
  Repetition,
  Sequence,
} from '#project/tree';

import { Projection } from './Projection.js';
import { type Rule } from './Rule.js';
import { type View } from './View.js';

export const select: unique symbol = Symbol('select');

export class Selection<T extends Node, A extends Node> implements View<A> {
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

  static [select]<T extends Node, Name extends string, Elements extends Node>(
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

  map<B>(project: (value: A) => B): View<B> {
    return new Projection(() => this.values()).map(project);
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

  edit(update: (text: string) => string): Codec.Parsed<T> {
    const failures: Exclude<Codec.Parsed<A>, Success<A>>[] = [];

    const edited = this.#focus.modify(value => {
      const parsed = this.#codec.parse(update(String(value)));

      return parsed.match({
        onSuccess: node => node,
        onFailure: mismatch => {
          failures.push(new Failure(mismatch));

          return value;
        },
      });
    });

    const [failure] = failures;

    return failure ?? new Success(edited);
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
      ? this.#codec.element().parse(element).map(inserted)
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
    rule: Rule<Name, Elements>
  ): Selection<T, Nonterminal<Name, Elements>> {
    const place = this.#place.focus(this.#codec[route](rule));

    return new Selection(place.focus(rule.prism()), rule, place);
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
    const codec = this.#codec.alternative<U, I>(index);
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
