import { FallibleMorphism, PartialIso } from '@fundamentry/category';
import { Failure, type Result, Success } from '@fundamentry/coproduct';
import { Range, RangeSet } from '@fundamentry/range';
import { CodePoint, Integer } from '@fundamentry/scalar';
import { Point } from '@fundamentry/stream';

import { type Definition, Definitions } from '#project/definition';
import { type Expectation, Text, Within } from '#project/expectation';
import {
  Alternation,
  Concatenation,
  type Expression,
  Label,
  Optional,
  Reference,
  Refinement,
  Repetition as Repeated,
  Rule,
  Terminal,
} from '#project/expression';
import { type Mismatch } from '#project/mismatch';
import { type Misprint } from '#project/misprint';
import { Parser } from '#project/parser';
import { Printer } from '#project/printer';
import {
  type Choice,
  Literal,
  type Node,
  type Option,
  type Repetition,
  type Sequence,
} from '#project/tree';

export namespace Codec {
  export type Character = string | number | CodePoint;

  export type Characters =
    | Character
    | readonly [from: Character, to: Character]
    | Range<CodePoint>
    | RangeSet<CodePoint>;

  export type Parsed<Token, Value> = Result<Value, Mismatch<Token>>;

  export type Printed<Token> = Result<Iterable<Token>, Misprint>;

  export interface Constructor<Value extends Node, Refined extends Node> {
    new (elements: Value): Refined;
    rule(): string;
  }

  export interface Target<
    Value extends Node,
    Refined extends Node,
  > extends Constructor<Value, Refined> {
    conversion(
      this: Constructor<Value, NoInfer<Refined>>
    ): PartialIso<Value, NoInfer<Refined>, string, string>;
  }
}

export class Codec<in out Token, in out Value extends Node> {
  readonly #expression: Expression<Token>;

  #parser?: Parser<Token>;

  #printer?: Printer<Token>;

  private constructor(expression: Expression<Token>) {
    this.#expression = expression;
  }

  static token<Token, Value extends Node>(
    conversion: PartialIso<Token, Value, unknown, string>,
    expectation: Expectation
  ): Codec<Token, Value> {
    return new Codec(new Terminal(Codec.#verified(conversion), expectation));
  }

  static literal(
    ...characters: readonly Codec.Characters[]
  ): Codec<CodePoint, Literal> {
    const point = (character: Codec.Character) =>
      CodePoint.of(
        typeof character === 'number'
          ? String.fromCodePoint(character)
          : String(character)
      );

    const bounded = (
      member: Codec.Characters
    ): member is readonly [from: Codec.Character, to: Codec.Character] =>
      Array.isArray(member);

    const members = (member: Codec.Characters): readonly Range<CodePoint>[] => {
      if (member instanceof RangeSet) return member.asRanges();

      if (member instanceof Range) return [member];

      if (bounded(member))
        return [Range.closed(point(member[0]), point(member[1]))];

      return [Range.singleton(point(member))];
    };

    const ranges = RangeSet.from(characters.flatMap(members));

    return Codec.token(
      PartialIso.of<CodePoint, Literal, undefined, string>(
        codePoint =>
          ranges.contains(codePoint)
            ? new Success(new Literal(codePoint))
            : new Failure(undefined),
        value =>
          value instanceof Literal
            ? new Success(value.codePoint())
            : new Failure(`'${String(value)}' is not a literal`)
      ),
      new Within(ranges)
    );
  }

  static text(
    text: string,
    { caseSensitive = true }: { readonly caseSensitive?: boolean } = {}
  ): Codec<CodePoint, Sequence<readonly Literal[]>> {
    const variants = (character: string) =>
      caseSensitive
        ? [character]
        : [
            ...new Set([
              character,
              character.toLowerCase(),
              character.toUpperCase(),
            ]),
          ].filter(variant => /^.$/su.test(variant));

    return new Codec(
      new Label(
        new Concatenation(
          Array.from(
            text,
            character => Codec.literal(...variants(character)).#expression
          )
        ),
        caseSensitive ? Text.caseSensitive(text) : Text.caseInsensitive(text)
      )
    );
  }

  static sequence<Token, Head extends Node, Tail extends readonly Node[]>(
    first: Codec<Token, Head>,
    ...others: { [K in keyof Tail]: Codec<Token, Tail[K]> }
  ): Codec<Token, Sequence<readonly [Head, ...Tail]>> {
    return new Codec(
      new Concatenation([
        first.#expression,
        ...others.map(codec => codec.#expression),
      ])
    );
  }

  static choice<
    Token,
    First extends Node,
    Second extends Node,
    Rest extends readonly Node[],
  >(
    first: Codec<Token, First>,
    second: Codec<Token, Second>,
    ...others: { [K in keyof Rest]: Codec<Token, Rest[K]> }
  ): Codec<Token, Choice.Of<[First, Second, ...Rest]>> {
    return new Codec(
      others.reduce<Expression<Token>>(
        (alternatives, codec) =>
          new Alternation([alternatives, codec.#expression]),
        new Alternation([first.#expression, second.#expression])
      )
    );
  }

  static lazy<Token, Value extends Node>(
    define: () => Codec<Token, Value>
  ): Codec<Token, Value> {
    return new Codec(new Reference(() => define().#expression));
  }

  parse(tokens: Iterable<Token>): Codec.Parsed<Token, Value> {
    this.#parser ??= new Parser(this.#expression);

    return this.#parser.parse(Point.of(tokens)).map(value => value as Value);
  }

  print(value: Value): Codec.Printed<Token> {
    this.#printer ??= new Printer(this.#expression);

    return this.#printer.print(value);
  }

  definition(this: Codec<CodePoint, Value>): Definition {
    return new Definitions(this.#expression).root();
  }

  definitions(this: Codec<CodePoint, Value>): Iterable<Definition> {
    return new Definitions(this.#expression);
  }

  or<Alternative extends Node>(
    next: Codec<Token, Alternative>
  ): Codec<Token, Choice<Value, Alternative>> {
    return Codec.choice(this, next);
  }

  optional(): Codec<Token, Option<Value>> {
    return new Codec(new Optional(this.#expression));
  }

  repeat(bounds: Range<Integer>): Codec<Token, Repetition<Value>> {
    return new Codec(new Repeated(this.#expression, bounds));
  }

  times(count: number): Codec<Token, Repetition<Value>> {
    return this.repeat(Range.singleton(Integer.of(count)));
  }

  many(): Codec<Token, Repetition<Value>> {
    return this.repeat(Range.atLeast(Integer.of(0)));
  }

  oneOrMore(): Codec<Token, Repetition<Value>> {
    return this.repeat(Range.atLeast(Integer.of(1)));
  }

  refine<Refined extends Node>(
    conversion: PartialIso<Value, Refined, string, string>
  ): Codec<Token, Refined> {
    return new Codec(
      new Refinement(this.#expression, Codec.#verified(conversion))
    );
  }

  as<Refined extends Node>(
    target: Codec.Target<Value, Refined>
  ): Codec<Token, Refined> {
    return new Codec(
      new Rule(this.refine(target.conversion()).#expression, target.rule())
    );
  }

  label(expectation: Expectation): Codec<Token, Value> {
    return new Codec(new Label(this.#expression, expectation));
  }

  static #verified<Source, Value, Reason>(
    conversion: PartialIso<Source, Value, Reason, string>
  ): PartialIso<Source, Value, Reason, string> {
    return PartialIso.of(
      FallibleMorphism.id<Source>(),
      FallibleMorphism.fromPredicate(
        (source: Source) => conversion.to(source).ok(),
        source => `'${String(source)}' does not belong to this rule`
      )
    ).andThen(conversion);
  }
}
