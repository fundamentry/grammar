import { type Optic } from '@fundamentry/category';

import {
  type Codec,
  route,
  Steps,
  union,
  type Union,
  write,
} from '#project/codec';
import {
  type Choice,
  Focus,
  type Node,
  type Nonterminal,
  type Option,
  Repetition,
  type Sequence,
  View,
} from '#project/tree';

import { type Rule } from './Rule.js';
import { Rules } from './Rules.js';

export const select: unique symbol = Symbol('select');

export namespace Selection {
  export interface Grammar<A> {
    optic(): Optic<Optic.Kind, Node, A, unknown>;

    [write]<T extends Node>(
      place: Focus<T, Node>,
      update: (text: string) => string
    ): Codec.Parsed<T>;
  }

  export interface Target<A> extends Grammar<A> {
    is(node: Node): node is A & Node;
  }
}

export class Selection<
  T extends Node,
  A extends Node,
  G extends Selection.Grammar<A> = Codec<A>,
> extends View<A> {
  readonly #place: Focus<T, Node>;

  readonly #grammar: G;

  readonly #focus: Focus<T, A>;

  private constructor(place: Focus<T, Node>, grammar: G) {
    const focus = place.focus(grammar.optic());

    super(() => focus.values());

    this.#place = place;
    this.#grammar = grammar;
    this.#focus = focus;
  }

  static [select]<T extends Node, Name extends string, Elements extends Node>(
    tree: T,
    rule: Rule<Name, Elements>
  ): Selection<T, Nonterminal<Name, Elements>> {
    return new Selection(
      Focus.of(tree, (node): node is Node => rule.is(node)),
      rule
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
    return this.#focus.remove();
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
  ): Selection<T, Nonterminal<Name, Elements>>;

  to<const R extends readonly Rule.Any[]>(
    this: Selection<T, A>,
    rules: Rules<R>
  ): Selection<T, Rule.Selected<R[number]>, Union<Rule.Selected<R[number]>>>;

  to<
    Name extends string,
    Elements extends Node,
    const R extends readonly Rule.Any[],
  >(
    this: Selection<T, A>,
    target: Rule<Name, Elements> | Rules<R>
  ):
    | Selection<T, Nonterminal<Name, Elements>>
    | Selection<T, Rule.Selected<R[number]>, Union<Rule.Selected<R[number]>>> {
    return target instanceof Rules
      ? this.#among(target)
      : this.#through(target);
  }

  within<Name extends string, Elements extends Node>(
    rule: Rule<Name, Elements>
  ): Selection<T, Nonterminal<Name, Elements>>;

  within<const R extends readonly Rule.Any[]>(
    rules: Rules<R>
  ): Selection<T, Rule.Selected<R[number]>, Rules<R>>;

  within<B extends Node, H extends Selection.Target<B>>(
    target: H
  ): Selection<T, B, H> {
    return new Selection(
      this.#focus.within((node): node is Node => target.is(node)),
      target
    );
  }

  elements<Name extends string, Elements extends Node>(
    this: Selection<T, Nonterminal<Name, Elements>>
  ): Selection<T, Elements> {
    return new Selection(
      this.#place.focus(Steps.elements()),
      this.#grammar.elements()
    );
  }

  at<U extends readonly Node[], const I extends Node.Index<U>>(
    this: Selection<T, Sequence<U>>,
    index: I
  ): Selection<T, U[I]> {
    return new Selection(
      this.#place.focus(Steps.at(index)),
      this.#grammar.at<U, I>(index)
    );
  }

  element<E extends Node>(
    this: Selection<T, Repetition<E>>,
    index: number
  ): Selection<T, E> {
    return new Selection(
      this.#place.focus(Steps.element(index)),
      this.#grammar.element()
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

    return new Selection(this.#place.focus(Steps.value(codec)), codec);
  }

  alternative<U extends readonly Node[], const I extends Node.Index<U>>(
    this: Selection<T, Choice<U>>,
    index: I
  ): Selection<T, U[I]> {
    const codec = this.#grammar.alternative<U, I>(index);

    return new Selection(
      this.#place.focus(Steps.alternative(index, codec)),
      codec
    );
  }

  #through<Name extends string, Elements extends Node>(
    this: Selection<T, A>,
    rule: Rule<Name, Elements>
  ): Selection<T, Nonterminal<Name, Elements>> {
    return new Selection(this.#place.focus(this.#grammar[route](rule)), rule);
  }

  #among<const R extends readonly Rule.Any[]>(
    this: Selection<T, A>,
    rules: Rules<R>
  ): Selection<T, Rule.Selected<R[number]>, Union<Rule.Selected<R[number]>>> {
    return new Selection(this.#place, this.#grammar[union](rules));
  }
}
