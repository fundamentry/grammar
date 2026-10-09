import { type Optic } from '@fundamentry/category';
import { type Result } from '@fundamentry/coproduct';

import {
  type Codec,
  type gaps,
  type route,
  Slot,
  Slots,
  Steps,
  type union,
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
import { type Rules } from './Rules.js';

export const select: unique symbol = Symbol('select');

export const reach: unique symbol = Symbol('reach');

export namespace Selection {
  export interface Grammar<A> {
    optic(slots: Slots): Optic<Optic.Kind, Node, A, unknown>;

    [write]<T extends Node>(
      place: Focus<T, Node>,
      update: (text: string) => string,
      slots: Slots
    ): Codec.Parsed<T>;
  }

  export interface Target<A> extends Grammar<A> {
    is(node: Node): node is A & Node;
  }

  export type Routes = Pick<
    Codec<Node>,
    typeof gaps | typeof route | typeof union
  >;

  export interface Reached<H> {
    readonly step: (slots: Slots) => Steps.Step;

    readonly grammar: H;

    readonly gaps: readonly string[];
  }

  export interface Destination<H> {
    [reach](routes: Routes): Reached<H>;
  }
}

export class Selection<
  T extends Node,
  A extends Node,
  G extends Selection.Grammar<A> = Codec<A>,
> extends View<A> {
  readonly #path: (slots: Slots) => Focus<T, Node>;

  readonly #place: Focus<T, Node>;

  readonly #grammar: G;

  readonly #focus: Focus<T, A>;

  readonly #gaps: readonly string[];

  private constructor(
    path: (slots: Slots) => Focus<T, Node>,
    grammar: G,
    gaps: readonly string[]
  ) {
    const place = path(Slots.edit);
    const focus = place.focus(grammar.optic(Slots.edit));

    super(() => focus.values());

    this.#path = path;
    this.#place = place;
    this.#grammar = grammar;
    this.#focus = focus;
    this.#gaps = gaps;
  }

  static [select]<
    T extends Node,
    B extends Node,
    H extends Selection.Target<B>,
  >(tree: T, target: H): Selection<T, B, H> {
    return new Selection(
      () => Focus.of(tree, (node): node is Node => target.is(node)),
      target,
      []
    );
  }

  only(): A {
    if (this.#gaps.length > 0)
      throw new RangeError(
        `Exactly one node is not guaranteed at ${this.#gaps.join(', ')}`
      );

    const values = this.values().toArray();
    const [value] = values;

    if (value && values.length === 1) return value;

    throw new RangeError(
      `Expected exactly one node, found ${String(values.length)}`
    );
  }

  set(value: A): T;

  set(text: string): Codec.Parsed<T>;

  set(value: A | string): T | Codec.Parsed<T> {
    const place = this.#path(Slots.fill);

    return typeof value === 'string'
      ? this.#grammar[write](place, () => value, Slots.fill)
      : place.focus(this.#grammar.optic(Slots.fill)).set(value);
  }

  modify(update: (value: A) => A): T {
    return this.#focus.modify(update);
  }

  edit(update: (text: string) => string): Codec.Parsed<T> {
    return this.#grammar[write](this.#place, update, Slots.edit);
  }

  remove(): Result<T, readonly Node[]> {
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

  to<B extends Node, H extends Selection.Grammar<B>>(
    this: Selection<T, A>,
    target: Selection.Destination<H>
  ): Selection<T, B, H> {
    const { step, grammar, gaps } = target[reach](this.#grammar);

    return new Selection(
      slots => this.#path(slots).focus(step(slots)),
      grammar,
      [...this.#gaps, ...gaps]
    );
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
      slots =>
        this.#path(slots)
          .focus(this.#grammar.optic(slots))
          .within((node): node is Node => target.is(node)),
      target,
      [...this.#gaps, '/within']
    );
  }

  elements<Name extends string, Elements extends Node>(
    this: Selection<T, Nonterminal<Name, Elements>>
  ): Selection<T, Elements> {
    return new Selection(
      slots => this.#path(slots).focus(Steps.elements()),
      this.#grammar.elements(),
      this.#gaps
    );
  }

  at<U extends readonly Node[], const I extends Node.Index<U>>(
    this: Selection<T, Sequence<U>>,
    index: I
  ): Selection<T, U[I]> {
    return new Selection(
      slots => this.#path(slots).focus(Steps.at(index)),
      this.#grammar.at<U, I>(index),
      this.#gaps
    );
  }

  element<E extends Node>(
    this: Selection<T, Repetition<E>>,
    index: number
  ): Selection<T, E> {
    return new Selection(
      slots => this.#path(slots).focus(Steps.element(index)),
      this.#grammar.element(),
      [...this.#gaps, `/element[${String(index)}]`]
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

    return new Selection(
      slots => this.#path(slots).focus(Slot.value(codec).step(slots)),
      codec,
      [...this.#gaps, '/option']
    );
  }

  alternative<U extends readonly Node[], const I extends Node.Index<U>>(
    this: Selection<T, Choice<U>>,
    index: I
  ): Selection<T, U[I]> {
    const codec = this.#grammar.alternative<U, I>(index);

    return new Selection(
      slots =>
        this.#path(slots).focus(Slot.alternative(index, codec).step(slots)),
      codec,
      [...this.#gaps, `/choice[${String(index)}]`]
    );
  }
}
