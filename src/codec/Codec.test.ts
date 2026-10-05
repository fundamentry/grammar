import { assert, describe, expect, it, vi } from 'vitest';

import { PartialIso } from '@fundamentry/category';
import {
  Failure,
  Left,
  type Result,
  Right,
  Success,
} from '@fundamentry/coproduct';
import { Range, RangeSet } from '@fundamentry/range';
import { CodePoint, Integer } from '@fundamentry/scalar';

import { Named } from '#project/expectation';
import { Misprint } from '#project/misprint';
import {
  Choice,
  Literal,
  Node,
  Option,
  Repetition,
  Sequence,
} from '#project/tree';

import { Codec } from './Codec.js';

class Octet extends Node {
  readonly #value: number;

  constructor(value: number) {
    super();

    this.#value = value;
  }

  override equals(other: unknown): boolean {
    return other instanceof Octet && this.#value === other.#value;
  }

  override toString(): string {
    return String(this.#value);
  }
}

class Count extends Node {
  readonly #digits: Repetition<Literal>;

  constructor(digits: Repetition<Literal>) {
    super();

    this.#digits = digits;
  }

  static rule(): string {
    return 'digit-count';
  }

  static conversion(
    this: new (digits: Repetition<Literal>) => Count
  ): PartialIso<Repetition<Literal>, Count, string, string> {
    return PartialIso.of(
      digits => new Success(new this(digits)),
      count => new Success(count.#digits)
    );
  }

  override equals(other: unknown): boolean {
    return other instanceof Count && this.#digits.equals(other.#digits);
  }

  override toString(): string {
    return String(this.#digits);
  }
}

const codePoints = (text: string): readonly CodePoint[] =>
  Array.from(text, CodePoint.of);

const literal = (character: string): Literal =>
  new Literal(CodePoint.of(character));

const literals = (text: string): readonly Literal[] =>
  Array.from(text, literal);

const parse = <A extends Node>(
  codec: Codec<CodePoint, A>,
  input: string
): Codec.Parsed<CodePoint, A> => codec.parse(codePoints(input));

const print = <A extends Node>(codec: Codec<CodePoint, A>, value: A) =>
  codec.print(value).map(tokens => [...tokens]);

const character = (pattern: RegExp, name: string) =>
  Codec.token(
    PartialIso.of<CodePoint, Literal, string, string>(
      candidate =>
        pattern.test(candidate.toString())
          ? new Success(new Literal(candidate))
          : new Failure(`Expected ${name}, got '${candidate.toString()}'`),
      value => new Success(value.codePoint())
    ),
    new Named(name)
  );

const left = <L extends Node, R extends Node = L>(value: L) =>
  new Choice<L, R>(new Left(value));

const right = <R extends Node, L extends Node = R>(value: R) =>
  new Choice<L, R>(new Right(value));

const digit = character(/^[0-9]$/u, 'a digit');
const letter = character(/^[a-z]$/u, 'a letter');

const error = new Error('Oops!');

const mockedCodec = () => {
  const to = vi.fn<(token: CodePoint) => Result<Literal, string>>();
  const from = vi.fn<(value: Literal) => Result<CodePoint, string>>();

  return {
    codec: Codec.token(PartialIso.of(to, from), new Named('a mock')),
    to,
    from,
  };
};

describe('Codec', () => {
  describe('token', () => {
    it('must report end of input', () => {
      const outcome = parse(digit, '');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe(
        'Expected a digit, got end of input'
      );
    });

    it('must parse a token into whatever its conversion makes of it', () => {
      expect(parse(digit, '1')).toEqual(new Success(literal('1')));
    });

    it('must report the rejection message for a token its conversion does not accept', () => {
      const outcome = parse(digit, 'x');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe("Expected a digit, got 'x'");
    });

    it('must propagate an error thrown while converting a token', () => {
      const { codec, to } = mockedCodec();

      to.mockImplementationOnce(() => {
        throw error;
      });

      expect(() => parse(codec, 'x')).toThrow(error);
    });

    it('must print a value through its conversion', () => {
      expect(print(digit, literal('1'))).toEqual(new Success(codePoints('1')));
    });

    it('must reject printing a value that does not belong to it', () => {
      expect(print(digit, literal('x'))).toEqual(
        new Failure(Misprint.of("'x' does not belong to this rule"))
      );
    });

    it('must report why its conversion does not convert a value back', () => {
      const { codec, from } = mockedCodec();

      from.mockReturnValueOnce(new Failure('nope'));

      expect(print(codec, literal('x'))).toEqual(
        new Failure(Misprint.of('nope'))
      );
    });
  });

  describe('literal', () => {
    const digits = RangeSet.from([
      Range.closed(CodePoint.of('0'), CodePoint.of('9')),
    ]);
    const numeral = Codec.literal(digits);

    it('must parse a code point within its ranges', () => {
      expect(parse(numeral, '0')).toEqual(new Success(literal('0')));
    });

    it('must expect its ranges where a code point falls outside them', () => {
      const outcome = parse(numeral, 'a');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe(
        `Expected one of ${digits.toString()}, got 'a'`
      );
    });

    it('must print the code point of a literal within its ranges', () => {
      expect(print(numeral, literal('0'))).toEqual(
        new Success(codePoints('0'))
      );
    });

    it('must reject printing a literal outside its ranges', () => {
      expect(print(numeral, literal('a'))).toEqual(
        new Failure(Misprint.of("'a' does not belong to this rule"))
      );
    });

    it('must reject printing a node that is not a literal', () => {
      expect(
        print(numeral, new Sequence([literal('0')]) as unknown as Literal)
      ).toEqual(new Failure(Misprint.of("'0' is not a literal")));
    });

    const accepts = (codec: Codec<CodePoint, Literal>, text: string) =>
      Array.from(text, token => parse(codec, token).ok());

    it('must accept a single character', () => {
      expect(accepts(Codec.literal('2'), '23')).toEqual([true, false]);
    });

    it('must accept any of several characters', () => {
      expect(accepts(Codec.literal('V', 'v'), 'Vvw')).toEqual([
        true,
        true,
        false,
      ]);
    });

    it('must reject a string of more than one character', () => {
      expect(() => Codec.literal('Vv')).toThrow(RangeError);
      expect(() => Codec.literal(['0', '42'])).toThrow(RangeError);
    });

    it('must accept a closed range of characters', () => {
      expect(accepts(Codec.literal(['0', '4']), '045')).toEqual([
        true,
        true,
        false,
      ]);
    });

    it('must accept code points given by number, alone and as range bounds', () => {
      expect(accepts(Codec.literal(0x56, [0x30, 0x39]), 'V5v')).toEqual([
        true,
        true,
        false,
      ]);
    });

    it('must accept code points and ranges of code points as they are', () => {
      const codec = Codec.literal(
        CodePoint.of('x'),
        Range.closed(CodePoint.of('a'), CodePoint.of('c'))
      );

      expect(accepts(codec, 'xbd')).toEqual([true, true, false]);
    });

    it('must expect every member it was given as one set', () => {
      const outcome = parse(Codec.literal('x', ['0', '9']), '!');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe(
        `Expected one of ${RangeSet.from([
          Range.closed(CodePoint.of('0'), CodePoint.of('9')),
          Range.singleton(CodePoint.of('x')),
        ]).toString()}, got '!'`
      );
    });
  });

  describe('text', () => {
    it('must parse its characters as a sequence of literals', () => {
      expect(parse(Codec.text('::'), '::')).toEqual(
        new Success(new Sequence(literals('::')))
      );
    });

    it('must expect the whole text where it does not start', () => {
      const outcome = parse(Codec.text('http'), 'ftp');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe("Expected 'http', got 'f'");
    });

    it('must expect the next character where it stops part way', () => {
      const outcome = parse(Codec.text('http'), 'htp');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe("Expected 't', got 'p'");
    });

    it('must match case-sensitively by default', () => {
      expect(parse(Codec.text('http'), 'HTTP').ok()).toBe(false);
    });

    it('must match any case when asked to, printing the case it parsed', () => {
      const codec = Codec.text('http', { caseSensitive: false });
      const parsed = parse(codec, 'HtTp');

      assert(parsed.ok());
      expect(print(codec, parsed.value())).toEqual(
        new Success(codePoints('HtTp'))
      );
    });

    it('must leave a character whose other case is not one character as it is', () => {
      const codec = Codec.text('ß', { caseSensitive: false });

      expect(parse(codec, 'ß').ok()).toBe(true);
      expect(parse(codec, 'S').ok()).toBe(false);
    });

    it('must match empty input for empty text', () => {
      expect(parse(Codec.text(''), '')).toEqual(new Success(new Sequence([])));
    });
  });

  describe('sequence', () => {
    const codec = Codec.sequence(digit, letter);

    it('must parse its elements in sequence', () => {
      expect(parse(codec, '1a')).toEqual(
        new Success(new Sequence([literal('1'), literal('a')]))
      );
    });

    it('must fail at the first element its codec does not accept, without trying the rest', () => {
      const { codec: rest, to } = mockedCodec();

      const outcome = parse(Codec.sequence(digit, rest), 'xy');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe("Expected a digit, got 'x'");
      expect(to).not.toHaveBeenCalled();
    });

    it('must print its elements in sequence', () => {
      expect(print(codec, new Sequence([literal('1'), literal('a')]))).toEqual(
        new Success(codePoints('1a'))
      );
    });
  });

  describe('parse', () => {
    it('must round-trip a whole input', () => {
      const codec = digit.oneOrMore();

      expect(parse(codec, '123')).toEqual(
        new Success(new Repetition(literals('123')))
      );
      expect(print(codec, new Repetition(literals('123')))).toEqual(
        new Success(codePoints('123'))
      );
    });

    it('must reject trailing input, reporting where it starts', () => {
      const outcome = parse(digit.oneOrMore(), '12a');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe(
        "Expected a digit or end of input, got 'a'"
      );
      expect(outcome.error().at().peek()).toEqual(CodePoint.of('a'));
    });

    it('must report the furthest failure across backtracked branches', () => {
      const outcome = parse(
        Codec.sequence(digit.or(Codec.sequence(digit, digit)), letter),
        '123'
      );

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe("Expected a letter, got '3'");
      expect(outcome.error().at().peek()).toEqual(CodePoint.of('3'));
    });

    it('must report trailing input after the furthest candidate', () => {
      const outcome = parse(digit.or(Codec.sequence(digit, digit)), '12a');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe("Expected end of input, got 'a'");
      expect(outcome.error().at().peek()).toEqual(CodePoint.of('a'));
    });

    it.each<
      [
        string,
        (
          one: Codec<CodePoint, Literal>,
          input: string
        ) => Result<unknown, unknown>,
      ]
    >([
      [
        'oneOrMore().many()',
        (one, input) => parse(one.oneOrMore().many(), input),
      ],
      ['or(itself).many()', (one, input) => parse(one.or(one).many(), input)],
      [
        'or(sequence(itself, itself)).many()',
        (one, input) => parse(one.or(Codec.sequence(one, one)).many(), input),
      ],
    ])(
      'must fail %s within polynomially many token conversions',
      (_, grammar) => {
        const input = `${'1'.repeat(20)}!`;
        const { codec: one, to } = mockedCodec();

        to.mockImplementation(token =>
          token.equals(CodePoint.of('1'))
            ? new Success(new Literal(token))
            : new Failure("Expected '1'")
        );

        expect(grammar(one, input).ok()).toBe(false);
        expect(to.mock.calls.length).toBeLessThan(input.length ** 2);
      }
    );

    it('must stop exploring once it finds a full parse', () => {
      const { codec: next, to } = mockedCodec();

      expect(parse(digit.or(next), '1')).toEqual(
        new Success(left(literal('1')))
      );
      expect(to).not.toHaveBeenCalled();
    });

    it('must be stack-safe when backtracking over long input', () => {
      const input = '1'.repeat(100_000);

      expect(parse(Codec.sequence(digit.many(), digit), input).ok()).toBe(true);
    });
  });

  describe('choice', () => {
    const bang = character(/^!$/u, "'!'");
    const codec = Codec.choice(digit, letter, bang);

    it('must nest several alternatives like a chain of or', () => {
      expect(parse(codec, 'a')).toEqual(parse(digit.or(letter).or(bang), 'a'));
      expect(parse(codec, 'a')).toEqual(new Success(left(right(literal('a')))));
    });

    it('must report every alternative that cannot start with the next token', () => {
      const outcome = parse(codec, '?');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe(
        "Expected a digit, a letter, or '!', got '?'"
      );
    });

    it('must print a value with the alternative of its side', () => {
      expect(print(codec, right(literal('!')))).toEqual(
        new Success(codePoints('!'))
      );
    });
  });

  describe('lazy', () => {
    type Nested = Sequence<
      readonly [Literal, Repetition<Choice<Literal, Nested>>, Literal]
    >;

    const open = character(/^\($/u, "'('");
    const close = character(/^\)$/u, "')'");
    const nested: Codec<CodePoint, Nested> = Codec.lazy(() =>
      Codec.sequence(open, digit.or(nested).many(), close)
    );

    it('must parse a rule that refers to itself', () => {
      expect(parse(nested, '(())')).toEqual(
        new Success(
          new Sequence([
            literal('('),
            new Repetition([
              right(
                new Sequence([literal('('), new Repetition([]), literal(')')])
              ),
            ]),
            literal(')'),
          ])
        )
      );
    });

    it('must print what it parses', () => {
      const parsed = parse(nested, '(1(2)3)');

      assert(parsed.ok());
      expect(print(nested, parsed.value())).toEqual(
        new Success(codePoints('(1(2)3)'))
      );
    });

    it('must be stack-safe and linear on deeply nested input', () => {
      const depth = 10_000;
      const start = performance.now();

      expect(
        parse(nested, `${'('.repeat(depth)}${')'.repeat(depth)}`).ok()
      ).toBe(true);
      expect(performance.now() - start).toBeLessThan(5_000);
    });

    it('must parse rules that refer to each other', () => {
      type Odd = Sequence<readonly [Literal, Option<Even>]>;
      type Even = Sequence<readonly [Literal, Option<Odd>]>;

      const grammar: {
        readonly odd: Codec<CodePoint, Odd>;
        readonly even: Codec<CodePoint, Even>;
      } = {
        odd: Codec.lazy(() => Codec.sequence(digit, grammar.even.optional())),
        even: Codec.lazy(() => Codec.sequence(letter, grammar.odd.optional())),
      };

      expect(parse(grammar.odd, '1a2').ok()).toBe(true);
      expect(parse(grammar.odd, '1a').ok()).toBe(true);
      expect(parse(grammar.odd, '12').ok()).toBe(false);
    });

    it('must report what was expected before and within a rule it refers to', () => {
      const outcome = parse(letter.or(nested), '1');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe("Expected a letter or '(', got '1'");
    });

    it('must report where a rule it refers to stops short', () => {
      const outcome = parse(nested, '((1)');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe(
        "Expected a digit, '(', or ')', got end of input"
      );
    });

    describe('left recursion', () => {
      type Sum = Choice<Sequence<readonly [Sum, Literal, Literal]>, Literal>;

      const plus = character(/^\+$/u, "'+'");
      const sum: Codec<CodePoint, Sum> = Codec.lazy(() =>
        Codec.sequence(sum, plus, digit).or(digit)
      );

      it('must parse a rule that starts with itself, associating to the left', () => {
        expect(parse(sum, '1+2+3')).toEqual(
          new Success(
            left(
              new Sequence([
                left(
                  new Sequence([
                    right(literal('1')),
                    literal('+'),
                    literal('2'),
                  ])
                ),
                literal('+'),
                literal('3'),
              ])
            )
          )
        );
      });

      it('must parse the base case of a rule that starts with itself', () => {
        expect(parse(sum, '1')).toEqual(new Success(right(literal('1'))));
      });

      it('must print what it parses', () => {
        const parsed = parse(sum, '1+2+3');

        assert(parsed.ok());
        expect(print(sum, parsed.value())).toEqual(
          new Success(codePoints('1+2+3'))
        );
      });

      it('must report how far a rule that starts with itself got', () => {
        const outcome = parse(sum, '1+2+x');

        assert(!outcome.ok());
        expect(String(outcome.error())).toBe("Expected a digit, got 'x'");
        expect(outcome.error().at().peek()).toEqual(CodePoint.of('x'));
      });

      it('must parse rules that start with each other', () => {
        type Term = Choice<Sequence<readonly [Factor, Literal]>, Literal>;
        type Factor = Choice<Sequence<readonly [Term, Literal]>, Literal>;

        const grammar: {
          readonly term: Codec<CodePoint, Term>;
          readonly factor: Codec<CodePoint, Factor>;
        } = {
          term: Codec.lazy(() =>
            Codec.sequence(grammar.factor, letter).or(digit)
          ),
          factor: Codec.lazy(() =>
            Codec.sequence(grammar.term, plus).or(letter)
          ),
        };

        expect(parse(grammar.term, '1+a+b').ok()).toBe(true);
        expect(parse(grammar.term, 'ab').ok()).toBe(true);
        expect(parse(grammar.term, '1+').ok()).toBe(false);
      });

      it('must parse a rule that starts with itself within another one', () => {
        type List = Choice<Sequence<readonly [List, Literal, Sum]>, Sum>;

        const comma = character(/^,$/u, "','");
        const list: Codec<CodePoint, List> = Codec.lazy(() =>
          Codec.sequence(list, comma, sum).or(sum)
        );

        const parsed = parse(list, '1+2,3,4+5');

        assert(parsed.ok());
        expect(print(list, parsed.value())).toEqual(
          new Success(codePoints('1+2,3,4+5'))
        );
      });

      it('must be stack-safe and fast on a long rule that starts with itself', () => {
        const input = Array.from({ length: 5_000 }, () => '1').join('+');
        const start = performance.now();

        expect(parse(sum, input).ok()).toBe(true);
        expect(performance.now() - start).toBeLessThan(5_000);
      });
    });

    it('must define its rule once, however often it parses and prints', () => {
      const define = vi.fn(() => digit);
      const codec = Codec.lazy(define);

      parse(codec, '1');
      parse(codec, '2');
      print(codec, literal('3'));

      expect(define).toHaveBeenCalledOnce();
    });
  });

  describe('or', () => {
    const codec = digit.or(letter);

    it('must report the alternative that got furthest', () => {
      const bracketed = Codec.sequence(
        character(/^\[$/u, "'['"),
        digit,
        character(/^\]$/u, "']'")
      );
      const outcome = parse(bracketed.or(letter), '[1x');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe("Expected ']', got 'x'");
    });

    it('must report every alternative that got as far, in the order tried', () => {
      const outcome = parse(codec, '!');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe(
        "Expected a digit or a letter, got '!'"
      );
    });

    it('must report every alternative of a chain that cannot start with the next token', () => {
      const bang = character(/^!$/u, "'!'");
      const outcome = parse(digit.or(letter).or(bang), '?');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe(
        "Expected a digit, a letter, or '!', got '?'"
      );
    });

    it('must report every alternative at the end of input', () => {
      const outcome = parse(digit.or(Codec.sequence(letter, digit)), '');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe(
        'Expected a digit or a letter, got end of input'
      );
    });

    it('must report a repetition that cannot start with the next token', () => {
      const outcome = parse(digit.oneOrMore().or(letter), '!');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe(
        "Expected a digit or a letter, got '!'"
      );
    });

    it('must report what follows an empty repetition that cannot start with the next token', () => {
      const outcome = parse(
        Codec.sequence(
          digit.repeat(Range.closed(Integer.of(0), Integer.of(0))),
          letter
        ).or(digit),
        '!'
      );

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe(
        "Expected a letter or a digit, got '!'"
      );
    });

    it('must report a refinement that rejects an empty match before what follows it', () => {
      const present = PartialIso.of<Option<Literal>, Literal, string, string>(
        option => {
          const value = option.value();

          return value ? new Success(value) : new Failure('must be present');
        },
        value => new Success(new Option(value))
      );
      const outcome = parse(
        Codec.sequence(digit.optional().refine(present), letter).or(digit),
        '!'
      );

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe(
        "Expected a digit, got '!'; must be present"
      );
    });

    it('must keep the nesting of a chain of alternatives', () => {
      const bang = character(/^!$/u, "'!'");

      expect(parse(digit.or(letter).or(bang), 'a')).toEqual(
        new Success(new Choice(new Left(new Choice(new Right(literal('a'))))))
      );
      expect(parse(digit.or(letter.or(bang)), '!')).toEqual(
        new Success(new Choice(new Right(new Choice(new Right(literal('!'))))))
      );
    });

    it('must report a labelled alternative by its label within a chain', () => {
      const bang = character(/^!$/u, "'!'");
      const outcome = parse(
        digit.or(letter).label(new Named('an alphanumeric')).or(bang),
        '?'
      );

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe(
        "Expected an alphanumeric or '!', got '?'"
      );
    });

    it('must report each distinct failure once', () => {
      const outcome = parse(digit.or(digit), 'x');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe("Expected a digit, got 'x'");
    });

    it('must fall back to the right alternative when the left fails', () => {
      expect(parse(codec, 'x')).toEqual(new Success(right(literal('x'))));
    });

    it('must backtrack into the next alternative when the rest does not match', () => {
      expect(
        parse(
          Codec.sequence(digit.or(Codec.sequence(digit, digit)), letter),
          '12a'
        )
      ).toEqual(
        new Success(
          new Sequence([
            right(new Sequence([literal('1'), literal('2')])),
            literal('a'),
          ])
        )
      );
    });

    it('must prefer the left alternative when both parse the whole input', () => {
      expect(parse(digit.or(Codec.sequence(digit)), '1')).toEqual(
        new Success(left(literal('1')))
      );
    });

    it('must print a left value with the left alternative', () => {
      expect(print(codec, left(literal('1')))).toEqual(
        new Success(codePoints('1'))
      );
    });

    it('must print a right value with the right alternative', () => {
      expect(print(codec, right(literal('x')))).toEqual(
        new Success(codePoints('x'))
      );
    });
  });

  describe('as', () => {
    const count = digit.many().as(Count);

    it('must parse into the node its target converts to', () => {
      expect(parse(count, '12')).toEqual(
        new Success(new Count(new Repetition(literals('12'))))
      );
    });

    it('must print the node through its target', () => {
      expect(print(count, new Count(new Repetition(literals('12'))))).toEqual(
        new Success(codePoints('12'))
      );
    });

    it('must name the rule of its target in the path of a misprint', () => {
      const outcome = count.print(new Count(new Repetition(literals('1x'))));

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe(
        "at /digit-count/refinement/repetition[1]: 'x' does not belong to this rule"
      );
    });
  });

  describe('definition', () => {
    it('must define the rule a codec refines into', () => {
      expect(
        String(Codec.literal(['0', '9']).many().as(Count).definition())
      ).toBe('digit-count = *%x30-39');
    });

    it('must define text as a quoted string', () => {
      expect(
        String(Codec.text('http', { caseSensitive: false }).definition())
      ).toBe('"http"');
    });

    it('must define text without case as a plain quoted string', () => {
      expect(String(Codec.text('::').definition())).toBe('"::"');
    });
  });

  describe('definitions', () => {
    it('must define a codec, then every rule it uses', () => {
      const count = Codec.literal(['0', '9']).many().as(Count);

      expect(
        Array.from(
          Codec.sequence(Codec.literal('#'), count).definitions(),
          String
        )
      ).toEqual(['%x23 digit-count', 'digit-count = *%x30-39']);
    });
  });

  describe('label', () => {
    it('must replace what was expected when nothing was consumed', () => {
      const outcome = parse(
        digit.or(letter).label(new Named('an alphanumeric')),
        '!'
      );

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe("Expected an alphanumeric, got '!'");
    });

    it('must keep what was expected further in once something was consumed', () => {
      const outcome = parse(
        Codec.sequence(digit, letter).label(new Named('a pair')),
        '1!'
      );

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe("Expected a letter, got '!'");
    });

    it('must let the outer of two labels starting at the same point win', () => {
      const outcome = parse(
        digit.label(new Named('a number')).label(new Named('a numeral')),
        '!'
      );

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe("Expected a numeral, got '!'");
    });

    it('must let an inner label win where it starts after the outer one', () => {
      const outcome = parse(
        Codec.sequence(digit, letter.label(new Named('a suffix'))).label(
          new Named('a pair')
        ),
        '1!'
      );

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe("Expected a suffix, got '!'");
    });

    it('must parse and print through its element', () => {
      const codec = digit.label(new Named('a number'));

      expect(parse(codec, '1')).toEqual(new Success(literal('1')));
      expect(print(codec, literal('1'))).toEqual(new Success(codePoints('1')));
    });
  });

  describe('optional', () => {
    const codec = digit.optional();

    it('must parse the value when the rule matches', () => {
      expect(parse(codec, '1')).toEqual(new Success(new Option(literal('1'))));
    });

    it('must parse an absent value when the rule does not match', () => {
      expect(parse(codec, '')).toEqual(new Success(new Option<Literal>()));
    });

    it('must backtrack to an absent value when the rest does not match', () => {
      expect(parse(Codec.sequence(codec, digit), '1')).toEqual(
        new Success(new Sequence([new Option<Literal>(), literal('1')]))
      );
    });

    it('must prefer a present value when both parse the whole input', () => {
      expect(parse(Codec.sequence(codec, codec), '1')).toEqual(
        new Success(
          new Sequence([new Option(literal('1')), new Option<Literal>()])
        )
      );
    });

    it('must print the value when present', () => {
      expect(print(codec, new Option(literal('1')))).toEqual(
        new Success(codePoints('1'))
      );
    });
  });

  describe('repeat', () => {
    it('must reject bounds that contain no count when built', () => {
      expect(() =>
        digit.repeat(Range.open(Integer.of(1), Integer.of(2)))
      ).toThrow(RangeError);
    });

    it('must succeed with exactly the minimum when it equals the maximum', () => {
      expect(
        parse(digit.repeat(Range.closed(Integer.of(2), Integer.of(2))), '12')
      ).toEqual(new Success(new Repetition(literals('12'))));
    });

    it('must stop on a zero-width match without collecting it', () => {
      expect(parse(digit.optional().many(), '')).toEqual(
        new Success(new Repetition([]))
      );
    });

    it('must stop at the maximum', () => {
      expect(
        parse(
          Codec.sequence(
            digit.repeat(Range.closed(Integer.of(1), Integer.of(2))),
            digit
          ),
          '123'
        )
      ).toEqual(
        new Success(
          new Sequence([new Repetition(literals('12')), literal('3')])
        )
      );
    });

    it('must not match beyond the maximum', () => {
      const outcome = parse(
        digit.repeat(Range.closed(Integer.of(1), Integer.of(2))),
        '123'
      );

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe("Expected end of input, got '3'");
      expect(outcome.error().at().peek()).toEqual(CodePoint.of('3'));
    });

    it('must backtrack to fewer matches when the rest does not match', () => {
      expect(
        parse(
          Codec.sequence(Codec.sequence(digit, letter).many(), digit, letter),
          '1a2a3a'
        )
      ).toEqual(
        new Success(
          new Sequence([
            new Repetition([
              new Sequence([literal('1'), literal('a')]),
              new Sequence([literal('2'), literal('a')]),
            ]),
            literal('3'),
            literal('a'),
          ])
        )
      );
    });

    it('must prefer more matches when both parse the whole input', () => {
      expect(parse(Codec.sequence(digit.many(), digit.many()), '12')).toEqual(
        new Success(
          new Sequence([new Repetition(literals('12')), new Repetition([])])
        )
      );
    });

    it('must fail when fewer than the minimum match', () => {
      const outcome = parse(digit.repeat(Range.atLeast(Integer.of(2))), '1a');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe("Expected a digit, got 'a'");
    });

    it('must collect zero-width matches up to the minimum', () => {
      expect(
        parse(digit.optional().repeat(Range.atLeast(Integer.of(2))), '')
      ).toEqual(
        new Success(
          new Repetition([new Option<Literal>(), new Option<Literal>()])
        )
      );
    });

    it('must reject printing a count outside its bounds', () => {
      expect(
        digit
          .repeat(Range.closed(Integer.of(1), Integer.of(3)))
          .print(new Repetition(literals('1234')))
      ).toEqual(new Failure(Misprint.of('Expected a count in [1..3], got 4')));
    });
  });

  describe('times', () => {
    const pair = digit.times(2);

    it('must collect exactly the given number of matches', () => {
      expect(parse(pair, '12')).toEqual(
        new Success(new Repetition(literals('12')))
      );
    });

    it('must fail on fewer matches', () => {
      expect(parse(pair, '1').ok()).toBe(false);
    });

    it('must fail on more matches', () => {
      expect(parse(pair, '123').ok()).toBe(false);
    });
  });

  describe('many', () => {
    it('must succeed with an empty repetition when there are no matches', () => {
      expect(parse(digit.many(), '')).toEqual(new Success(new Repetition([])));
    });

    it('must collect every consecutive match', () => {
      expect(parse(digit.many(), '123')).toEqual(
        new Success(new Repetition(literals('123')))
      );
    });

    it('must be stack-safe on long input', () => {
      const input = '1'.repeat(100_000);

      expect(parse(digit.many(), input).ok()).toBe(true);
    });
  });

  describe('oneOrMore', () => {
    it('must fail when there are no matches', () => {
      expect(parse(digit.oneOrMore(), '').ok()).toBe(false);
    });

    it('must collect one or more matches', () => {
      expect(parse(digit.oneOrMore(), '123')).toEqual(
        new Success(new Repetition(literals('123')))
      );
    });
  });

  describe('refine', () => {
    const octets = PartialIso.of<Repetition<Literal>, Octet, string, string>(
      digits =>
        Number(digits.toString()) <= 255
          ? new Success(new Octet(Number(digits.toString())))
          : new Failure(`${digits.toString()} exceeds 255`),
      value => new Success(new Repetition(literals(value.toString())))
    );

    const octet = digit
      .repeat(Range.closed(Integer.of(1), Integer.of(3)))
      .refine(octets);

    it('must accept a semantically valid value', () => {
      expect(parse(octet, '255')).toEqual(new Success(new Octet(255)));
    });

    it('must reject a semantically invalid value at the end of its span', () => {
      const outcome = parse(octet, '256');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe('256 exceeds 255');
      expect(outcome.error().at().isAtEnd()).toBe(true);
    });

    it('must refine only the preferred tree of each span', () => {
      const sequences = PartialIso.of<
        Choice<Literal, Sequence<readonly [Literal]>>,
        Sequence<readonly [Literal]>,
        string,
        string
      >(
        choice => {
          const either = choice.either();

          return either.isRight()
            ? new Success(either.right())
            : new Failure('Expected a sequence');
        },
        sequence =>
          new Success(
            new Choice<Literal, Sequence<readonly [Literal]>>(
              new Right(sequence)
            )
          )
      );

      const outcome = parse(
        digit.or(Codec.sequence(digit)).refine(sequences),
        '1'
      );

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe('Expected a sequence');
    });

    it('must reject printing a value its conversion does not accept back', () => {
      expect(print(octet, new Octet(256))).toEqual(
        new Failure(Misprint.of("'256' does not belong to this rule"))
      );
    });

    it('must print through its conversion', () => {
      expect(print(octet, new Octet(42))).toEqual(
        new Success(codePoints('42'))
      );
    });
  });
});
