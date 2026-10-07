import { type Optic } from '@fundamentry/category';

import { type Codec } from '#project/codec';
import {
  Choice,
  type Focus,
  type Node,
  Nonterminal,
  Option,
  Sequence,
} from '#project/tree';

export class Selection<T extends Node, A extends Node> {
  readonly #focus: Focus<T, A>;

  readonly #codec: Codec<A>;

  constructor(focus: Focus<T, A>, codec: Codec<A>) {
    this.#focus = focus;
    this.#codec = codec;
  }

  values(): IteratorObject<A> {
    return this.#focus.values();
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

  focus<B>(optic: Optic<Optic.Kind, A, B, unknown>): Focus<T, B> {
    return this.#focus.focus(optic);
  }

  elements<Name extends string, Elements extends Node>(
    this: Selection<T, Nonterminal<Name, Elements>>
  ): Selection<T, Elements> {
    return new Selection(
      this.#focus.focus(Nonterminal.elements()),
      this.#codec.elements()
    );
  }

  at<U extends readonly Node[], const I extends Node.Index<U>>(
    this: Selection<T, Sequence<U>>,
    index: I
  ): Selection<T, U[I]> {
    return new Selection(
      this.#focus.focus(Sequence.at<U, I>(index)),
      this.#codec.at<U, I>(index)
    );
  }

  value<U extends Node>(this: Selection<T, Option<U>>): Selection<T, U> {
    const codec = this.#codec.value();

    return new Selection(
      this.#focus.focus(
        codec.default().match<Optic<Optic.Kind, Option<U>, U, unknown>>({
          onSuccess: fallback => Option.valueOr(fallback),
          onFailure: () => Option.value(),
        })
      ),
      codec
    );
  }

  alternative<U extends readonly Node[], const I extends Node.Index<U>>(
    this: Selection<T, Choice<U>>,
    index: I
  ): Selection<T, U[I]> {
    const codec = this.#codec.alternative<U, I>(index);

    return new Selection(
      this.#focus.focus(
        codec.default().match<Optic<Optic.Kind, Choice<U>, U[I], unknown>>({
          onSuccess: fallback => Choice.alternativeOr<U, I>(index, fallback),
          onFailure: () => Choice.alternative<U, I>(index),
        })
      ),
      codec
    );
  }
}
