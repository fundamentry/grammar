import { FallibleMorphism, PartialIso, Prism } from '@fundamentry/category';
import { Failure, type Result, Success } from '@fundamentry/coproduct';
import { Range, RangeSet } from '@fundamentry/range';
import { CodePoint, Integer } from '@fundamentry/scalar';
import { Point } from '@fundamentry/stream';

import { type Definition, Definitions } from '#project/definition';
import {
  type Expectation,
  Named,
  Quoted,
  Characters,
} from '#project/expectation';
import {
  Alternation,
  Concatenation,
  type Expression,
  Label,
  Optional,
  Reference,
  Repetition as Repeated,
  Rule as Naming,
  Terminal,
} from '#project/expression';
import { type Mismatch } from '#project/mismatch';
import { type Misprint } from '#project/misprint';
import { Parser } from '#project/parser';
import { Printer } from '#project/printer';
import {
  type Choice,
  Character,
  type Focus,
  type Literal,
  type Node,
  type Nonterminal,
  type Option,
  type Repetition,
  type Sequence,
} from '#project/tree';

import { Caseless } from './Caseless.js';
import { Defaults } from './Defaults.js';
import { Parts } from './Parts.js';
import { Routes } from './Routes.js';
import { type Steps } from './Steps.js';
import { Union } from './Union.js';
import { write, Writer } from './Writer.js';

export const route: unique symbol = Symbol('route');

export const union: unique symbol = Symbol('union');

export namespace Codec {
  export type CodePointLike = string | number | CodePoint;

  export type CharacterSet =
    | CodePointLike
    | readonly [from: CodePointLike, to: CodePointLike]
    | Range<CodePoint>
    | RangeSet<CodePoint>;

  export type Parsed<Value> = Result<Value, Mismatch>;

  export type Printed = Result<string, Misprint>;

  export type Alternatives<T extends readonly Node[]> = T extends readonly [
    infer Head extends Node,
    ...infer Tail extends readonly Node[],
  ]
    ? [
        ...(Head extends Choice<infer Nested> ? Nested : [Head]),
        ...Alternatives<Tail>,
      ]
    : [];
}

export class Codec<in out Value extends Node> {
  readonly #expression: Expression<CodePoint>;

  readonly #alternatives: Expression.Alternatives<CodePoint>;

  #parser?: Parser<CodePoint>;

  #printer?: Printer<CodePoint>;

  protected constructor(
    expression: Expression<CodePoint>,
    alternatives?: Expression.Alternatives<CodePoint>
  ) {
    this.#expression = expression;
    this.#alternatives = alternatives ?? [expression];
  }

  protected static terminal<Value extends Node>(
    this: void,
    conversion: PartialIso<CodePoint, Value, unknown, string>,
    expectation: Expectation
  ): Codec<Value> {
    return new Codec(new Terminal(Codec.#verified(conversion), expectation));
  }

  protected static character(
    this: void,
    ...characters: readonly Codec.CharacterSet[]
  ): Codec<Character> {
    const point = (character: Codec.CodePointLike) =>
      typeof character === 'number'
        ? CodePoint.of(character)
        : CodePoint.of(String(character));

    const bounded = (
      member: Codec.CharacterSet
    ): member is readonly [
      from: Codec.CodePointLike,
      to: Codec.CodePointLike,
    ] => Array.isArray(member);

    const members = (
      member: Codec.CharacterSet
    ): readonly Range<CodePoint>[] => {
      if (member instanceof RangeSet) return member.asRanges();

      if (member instanceof Range) return [member];

      if (bounded(member))
        return [Range.closed(point(member[0]), point(member[1]))];

      return [Range.singleton(point(member))];
    };

    const ranges = RangeSet.from(characters.flatMap(members));

    return Codec.terminal(
      PartialIso.of<CodePoint, Character, undefined, string>(
        codePoint =>
          ranges.contains(codePoint)
            ? new Success(new Character(codePoint))
            : new Failure(undefined),
        value =>
          value instanceof Character
            ? new Success(value.codePoint())
            : new Failure(`'${String(value)}' is not a character`)
      ),
      new Characters(ranges)
    );
  }

  protected static literal(this: void, value: string): Codec<Literal> {
    return new Codec(
      new Label(
        new Concatenation(
          Array.from(
            value,
            character =>
              new Label(
                Codec.character(character).#expression,
                Quoted.of(character)
              )
          )
        ),
        Quoted.of(value)
      )
    );
  }

  protected static sequence<Head extends Node, Tail extends readonly Node[]>(
    this: void,
    first: Codec<Head>,
    ...others: { [K in keyof Tail]: Codec<Tail[K]> }
  ): Codec<Sequence<readonly [Head, ...Tail]>> {
    return new Codec(
      new Concatenation([
        first.#expression,
        ...others.map(codec => codec.#expression),
      ])
    );
  }

  protected static choice<
    First extends Node,
    Second extends Node,
    Rest extends readonly Node[],
  >(
    this: void,
    first: Codec<First>,
    second: Codec<Second>,
    ...others: { [K in keyof Rest]: Codec<Rest[K]> }
  ): Codec<Choice<Codec.Alternatives<[First, Second, ...Rest]>>> {
    const alternatives: Expression.Alternatives<CodePoint> = [
      ...first.#alternatives,
      ...second.#alternatives,
      ...others.flatMap(codec => codec.#alternatives),
    ];

    return new Codec(new Alternation(alternatives), alternatives);
  }

  protected static readonly builder = {
    character: Codec.character,
    literal: Codec.literal,
    sequence: Codec.sequence,
    choice: Codec.choice,
  };

  protected static named<const Name extends string, Value extends Node>(
    rule: () => Nonterminal.Rule<Name>,
    body: () => Codec<Value>
  ): Expression<CodePoint> {
    return new Naming(new Reference(() => body().#expression), rule);
  }

  parse(input: string): Codec.Parsed<Value> {
    this.#parser ??= new Parser(this.#expression);

    return this.#parser
      .parse(Point.of(input[Symbol.iterator]().map(CodePoint.of)))
      .map(value => value as Value);
  }

  print(value: Value): Codec.Printed {
    this.#printer ??= new Printer(this.#expression);

    return this.#printer
      .print(value)
      .map(codePoints => Array.from(codePoints, String).join(''));
  }

  default(): Result<Value, Expectation | Mismatch> {
    return new Defaults()
      .text(this.#expression)
      .match<Result<Value, Expectation | Mismatch>>({
        onSuccess: text => this.parse(text),
        onFailure: expectation => new Failure(expectation),
      });
  }

  [route](target: Nonterminal.Rule<string>): Steps.Step {
    return Codec.#routes([target]).only(this.#expression).optic();
  }

  [union]<A extends Node>(
    members: readonly Union.Member[],
    witness: Prism<Node, A, unknown>
  ): Union<A> {
    return new Union(
      Codec.#routes(members).exclusive(this.#expression),
      witness
    );
  }

  [write]<T extends Node>(
    place: Focus<T, Node>,
    update: (text: string) => string
  ): Codec.Parsed<T> {
    return new Writer(node => this.parse(update(String(node)))).write(place);
  }

  is(node: Node): node is Value {
    this.#printer ??= new Printer(this.#expression);

    return this.#printer.print(node).ok();
  }

  optic(): Prism<Node, Value, undefined> {
    return Prism.fromPredicate(
      node => this.is(node),
      () => undefined
    );
  }

  definition(): Definition {
    return new Definitions(this.#expression).root();
  }

  definitions(): Iterable<Definition> {
    return new Definitions(this.#expression);
  }

  elements<Name extends string, Elements extends Node>(
    this: Codec<Nonterminal<Name, Elements>>
  ): Codec<Elements> {
    return this.#part(0);
  }

  at<T extends readonly Node[], const I extends Node.Index<T>>(
    this: Codec<Sequence<T>>,
    index: I
  ): Codec<T[I]> {
    return this.#part(index);
  }

  alternative<T extends readonly Node[], const I extends Node.Index<T>>(
    this: Codec<Choice<T>>,
    index: I
  ): Codec<T[I]> {
    return this.#part(index);
  }

  value<T extends Node>(this: Codec<Option<T>>): Codec<T> {
    return this.#part(0);
  }

  element<A extends Node>(this: Codec<Repetition<A>>): Codec<A> {
    return this.#part(0);
  }

  or<Alternative extends Node>(
    next: Codec<Alternative>
  ): Codec<Choice<Codec.Alternatives<[Value, Alternative]>>> {
    return Codec.choice(this, next);
  }

  optional(): Codec<Option<Value>> {
    return new Codec(new Optional(this.#expression));
  }

  repeat(bounds: Range<Integer>): Codec<Repetition<Value>> {
    return new Codec(new Repeated(this.#expression, bounds));
  }

  times(count: number): Codec<Repetition<Value>> {
    return this.repeat(Range.singleton(Integer.of(count)));
  }

  many(): Codec<Repetition<Value>> {
    return this.repeat(Range.atLeast(Integer.of(0)));
  }

  oneOrMore(): Codec<Repetition<Value>> {
    return this.repeat(Range.atLeast(Integer.of(1)));
  }

  caseless(): Codec<Value> {
    const caseless = new Caseless(
      characters => Codec.character(characters.ranges()).#expression
    );
    const [first, ...others] = this.#alternatives;

    return new Codec(
      caseless.rewrite(this.#expression),
      others.length > 0
        ? [
            caseless.rewrite(first),
            ...others.map(other => caseless.rewrite(other)),
          ]
        : undefined
    );
  }

  label(name: string): Codec<Value> {
    const expectation = new Named(name);
    const [first, ...others] = this.#alternatives;

    return new Codec(
      new Label(this.#expression, expectation),
      others.length > 0
        ? [
            new Label(first, expectation),
            ...others.map(other => new Label(other, expectation)),
          ]
        : undefined
    );
  }

  #part<Part extends Node>(index: number): Codec<Part> {
    return new Codec(new Parts(this.#expression).at(index));
  }

  static #routes<R extends Nonterminal.Rule<string>>(
    targets: readonly R[]
  ): Routes<R> {
    return new Routes(targets, expression => new Codec(expression).default());
  }

  static #verified<Source, Value, Reason>(
    conversion: PartialIso<Source, Value, Reason, string>
  ): PartialIso<Source, Value, Reason, string> {
    const verified = PartialIso.of(
      FallibleMorphism.id<Source>(),
      FallibleMorphism.fromPredicate(
        (source: Source) => conversion.to(source).ok(),
        source => `'${String(source)}' does not belong to this rule`
      )
    ).andThen(conversion);

    return PartialIso.of(
      (source: Source) => conversion.to(source),
      (value: Value) => verified.from(value)
    );
  }
}
