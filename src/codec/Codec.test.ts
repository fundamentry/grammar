import { assert, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { PartialIso } from '@fundamentry/category';
import { Failure, type Result, Success } from '@fundamentry/coproduct';
import { Range, RangeSet } from '@fundamentry/range';
import { CodePoint, Integer } from '@fundamentry/scalar';

import { Named } from '#project/expectation';
import { Misprint } from '#project/misprint';
import {
  Choice,
  Character,
  type Node,
  Option,
  Repetition,
  Sequence,
  Focus,
  type Literal,
} from '#project/tree';

import { Codec } from './Codec.js';
import { write } from './Writer.js';

class Exposed extends Codec<never> {
  static readonly build = Codec.builder;

  static readonly terminal = Codec.terminal;
}

const { build, terminal } = Exposed;

const character = (value: string): Character =>
  new Character(CodePoint.of(value));

const characters = (text: string): readonly Character[] =>
  Array.from(text, character);

const parse = <A extends Node>(
  codec: Codec<A>,
  input: string
): Codec.Parsed<A> => codec.parse(input);

const print = <A extends Node>(codec: Codec<A>, value: A) => codec.print(value);

const matching = (pattern: RegExp, name: string) =>
  terminal(
    PartialIso.of<CodePoint, Character, string, string>(
      candidate =>
        pattern.test(candidate.toString())
          ? new Success(new Character(candidate))
          : new Failure(`Expected ${name}, got '${candidate.toString()}'`),
      value => new Success(value.codePoint())
    ),
    new Named(name)
  );

const digit = matching(/^[0-9]$/u, 'a digit');
const letter = matching(/^[a-z]$/u, 'a letter');

const error = new Error('Oops!');

const mockedCodec = () => {
  const to = vi.fn<(token: CodePoint) => Result<Character, string>>();
  const from = vi.fn<(value: Character) => Result<CodePoint, string>>();

  return {
    codec: terminal(PartialIso.of(to, from), new Named('a mock')),
    to,
    from,
  };
};

describe('Codec', () => {
  describe('terminal', () => {
    it('must report end of input', () => {
      const outcome = parse(digit, '');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe(
        'Expected a digit, got end of input'
      );
    });

    it('must parse a token into whatever its conversion makes of it', () => {
      expect(parse(digit, '1')).toEqual(new Success(character('1')));
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
      expect(print(digit, character('1'))).toEqual(new Success('1'));
    });

    it('must reject printing a value that does not belong to it', () => {
      expect(print(digit, character('x'))).toEqual(
        new Failure(new Misprint([], "'x' does not belong to this rule"))
      );
    });

    it('must report why its conversion does not convert a value back', () => {
      const { codec, from } = mockedCodec();

      from.mockReturnValueOnce(new Failure('nope'));

      expect(print(codec, character('x'))).toEqual(
        new Failure(new Misprint([], 'nope'))
      );
    });
  });

  describe('character', () => {
    const digits = RangeSet.from([
      Range.closed(CodePoint.of('0'), CodePoint.of('9')),
    ]);
    const numeral = build.character(digits);

    it('must parse a code point within its ranges', () => {
      expect(parse(numeral, '0')).toEqual(new Success(character('0')));
    });

    it('must expect its ranges where a code point falls outside them', () => {
      const outcome = parse(numeral, 'a');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe("Expected %x30-39, got 'a'");
    });

    it('must print the code point of a character within its ranges', () => {
      expect(print(numeral, character('0'))).toEqual(new Success('0'));
    });

    it('must reject printing a character outside its ranges', () => {
      expect(print(numeral, character('a'))).toEqual(
        new Failure(new Misprint([], "'a' does not belong to this rule"))
      );
    });

    it('must reject printing a node that is not a character', () => {
      expect(
        print(numeral, new Sequence([character('0')]) as unknown as Character)
      ).toEqual(new Failure(new Misprint([], "'0' is not a character")));
    });

    const accepts = (codec: Codec<Character>, text: string) =>
      Array.from(text, token => parse(codec, token).ok());

    it('must accept a single character', () => {
      expect(accepts(build.character('2'), '23')).toEqual([true, false]);
    });

    it('must accept any of several characters', () => {
      expect(accepts(build.character('V', 'v'), 'Vvw')).toEqual([
        true,
        true,
        false,
      ]);
    });

    it('must reject a string of more than one character', () => {
      expect(() => build.character('Vv')).toThrow(RangeError);
      expect(() => build.character(['0', '42'])).toThrow(RangeError);
    });

    it('must accept a closed range of characters', () => {
      expect(accepts(build.character(['0', '4']), '045')).toEqual([
        true,
        true,
        false,
      ]);
    });

    it('must accept code points given by number, alone and as range bounds', () => {
      expect(accepts(build.character(0x56, [0x30, 0x39]), 'V5v')).toEqual([
        true,
        true,
        false,
      ]);
    });

    it('must accept code points and ranges of code points as they are', () => {
      const codec = build.character(
        CodePoint.of('x'),
        Range.closed(CodePoint.of('a'), CodePoint.of('c'))
      );

      expect(accepts(codec, 'xbd')).toEqual([true, true, false]);
    });

    it('must expect every member it was given as one set', () => {
      const outcome = parse(build.character('x', ['0', '9']), '!');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe("Expected %x30-39 / %x78, got '!'");
    });
  });

  describe('literal', () => {
    it('must produce a literal', () => {
      expectTypeOf(build.literal('::')).toEqualTypeOf<Codec<Literal>>();
    });

    it('must parse into a sequence of its characters', () => {
      expect(parse(build.literal('::'), '::')).toEqual(
        new Success(new Sequence(characters('::')))
      );
    });

    it('must expect the whole literal where it does not start', () => {
      const outcome = parse(build.literal('http'), 'ftp');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe('Expected %s"http", got \'f\'');
    });

    it('must expect the next matching where it stops part way', () => {
      const outcome = parse(build.literal('http'), 'htp');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe('Expected %s"t", got \'p\'');
    });

    it('must match case-sensitively by default', () => {
      expect(parse(build.literal('http'), 'HTTP').ok()).toBe(false);
    });

    it('must match empty input for an empty literal', () => {
      expect(parse(build.literal(''), '')).toEqual(
        new Success(new Sequence([]))
      );
    });
  });

  describe('sequence', () => {
    const codec = build.sequence(digit, letter);

    it('must parse its elements in sequence', () => {
      expect(parse(codec, '1a')).toEqual(
        new Success(new Sequence([character('1'), character('a')]))
      );
    });

    it('must fail at the first element its codec does not accept, without trying the rest', () => {
      const { codec: rest, to } = mockedCodec();

      const outcome = parse(build.sequence(digit, rest), 'xy');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe("Expected a digit, got 'x'");
      expect(to).not.toHaveBeenCalled();
    });

    it('must print its elements in sequence', () => {
      expect(
        print(codec, new Sequence([character('1'), character('a')]))
      ).toEqual(new Success('1a'));
    });
  });

  describe('parse', () => {
    it('must round-trip a whole input', () => {
      const codec = digit.oneOrMore();

      expect(parse(codec, '123')).toEqual(
        new Success(new Repetition(characters('123')))
      );
      expect(print(codec, new Repetition(characters('123')))).toEqual(
        new Success('123')
      );
    });

    it('must reject trailing input, reporting where it starts', () => {
      const outcome = parse(digit.oneOrMore(), '12a');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe(
        "Expected a digit or end of input, got 'a'"
      );
      expect(outcome.error().offset()).toBe(2);
    });

    it('must report the furthest failure across backtracked branches', () => {
      const outcome = parse(
        build.sequence(digit.or(build.sequence(digit, digit)), letter),
        '123'
      );

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe("Expected a letter, got '3'");
      expect(outcome.error().offset()).toBe(2);
    });

    it('must report trailing input after the furthest candidate', () => {
      const outcome = parse(digit.or(build.sequence(digit, digit)), '12a');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe("Expected end of input, got 'a'");
      expect(outcome.error().offset()).toBe(2);
    });

    it.each<
      [
        string,
        (one: Codec<Character>, input: string) => Result<unknown, unknown>,
      ]
    >([
      [
        'oneOrMore().many()',
        (one, input) => parse(one.oneOrMore().many(), input),
      ],
      ['or(itself).many()', (one, input) => parse(one.or(one).many(), input)],
      [
        'or(sequence(itself, itself)).many()',
        (one, input) => parse(one.or(build.sequence(one, one)).many(), input),
      ],
    ])(
      'must fail %s within polynomially many token conversions',
      (_, grammar) => {
        const input = `${'1'.repeat(20)}!`;
        const { codec: one, to } = mockedCodec();

        to.mockImplementation(token =>
          token.equals(CodePoint.of('1'))
            ? new Success(new Character(token))
            : new Failure("Expected '1'")
        );

        expect(grammar(one, input).ok()).toBe(false);
        expect(to.mock.calls.length).toBeLessThan(input.length ** 2);
      }
    );

    it('must stop exploring once it finds a full parse', () => {
      const { codec: next, to } = mockedCodec();

      expect(parse(digit.or(next), '1')).toEqual(
        new Success(new Choice(0, character('1')))
      );
      expect(to).not.toHaveBeenCalled();
    });

    it('must be stack-safe when backtracking over long input', () => {
      const input = '1'.repeat(100_000);

      expect(parse(build.sequence(digit.many(), digit), input).ok()).toBe(true);
    });
  });

  describe('choice', () => {
    const bang = matching(/^!$/u, "'!'");
    const codec = build.choice(digit, letter, bang);

    it('must take in the alternatives of a nested choice', () => {
      const nested = build.choice(build.choice(digit, letter), bang);

      expectTypeOf(nested).toEqualTypeOf<
        Codec<Choice<[Character, Character, Character]>>
      >();
      expect(parse(nested, '!')).toEqual(
        new Success(new Choice(2, character('!')))
      );
    });

    it('must define a nested choice as one alternation', () => {
      expect(
        String(
          build
            .choice(
              build.choice(build.literal('a'), build.literal('b')),
              build.literal('c')
            )
            .definition()
        )
      ).toBe('%s"a" / %s"b" / %s"c"');
    });

    it('must choose among several alternatives', () => {
      expect(parse(codec, 'a')).toEqual(
        new Success(new Choice(1, character('a')))
      );
    });

    it('must report every alternative that cannot start with the next token', () => {
      const outcome = parse(codec, '?');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe(
        "Expected a digit, a letter, or '!', got '?'"
      );
    });

    it('must print a value with the alternative it took', () => {
      expect(print(codec, new Choice(2, character('!')))).toEqual(
        new Success('!')
      );
    });
  });

  describe('or', () => {
    const codec = digit.or(letter);

    it('must report the alternative that got furthest', () => {
      const bracketed = build.sequence(
        matching(/^\[$/u, "'['"),
        digit,
        matching(/^\]$/u, "']'")
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
      const bang = matching(/^!$/u, "'!'");
      const outcome = parse(digit.or(letter).or(bang), '?');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe(
        "Expected a digit, a letter, or '!', got '?'"
      );
    });

    it('must report every alternative at the end of input', () => {
      const outcome = parse(digit.or(build.sequence(letter, digit)), '');

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
        build
          .sequence(
            digit.repeat(Range.closed(Integer.of(0), Integer.of(0))),
            letter
          )
          .or(digit),
        '!'
      );

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe(
        "Expected a letter or a digit, got '!'"
      );
    });

    it('must extend a chain of alternatives instead of nesting it', () => {
      const bang = matching(/^!$/u, "'!'");
      const chain = digit.or(letter).or(bang);

      expectTypeOf(chain).toEqualTypeOf<
        Codec<Choice<[Character, Character, Character]>>
      >();
      expect(parse(chain, '!')).toEqual(
        new Success(new Choice(2, character('!')))
      );
    });

    it('must take in the alternatives of an alternation it is given', () => {
      const bang = matching(/^!$/u, "'!'");

      expect(parse(digit.or(letter.or(bang)), '!')).toEqual(
        new Success(new Choice(2, character('!')))
      );
    });

    it('must take in the alternatives of a labelled alternation', () => {
      const bang = matching(/^!$/u, "'!'");

      expect(
        parse(digit.or(letter).label('an alphanumeric').or(bang), 'a')
      ).toEqual(new Success(new Choice(1, character('a'))));
    });

    it('must print a value of a flattened alternation', () => {
      const bang = matching(/^!$/u, "'!'");

      expect(
        print(digit.or(letter.or(bang)), new Choice(2, character('!')))
      ).toEqual(new Success('!'));
    });

    it('must report a labelled alternative by its label within a chain', () => {
      const bang = matching(/^!$/u, "'!'");
      const outcome = parse(
        digit.or(letter).label('an alphanumeric').or(bang),
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

    it('must fall back to a later alternative when an earlier one fails', () => {
      expect(parse(codec, 'x')).toEqual(
        new Success(new Choice(1, character('x')))
      );
    });

    it('must backtrack into the next alternative when the rest does not match', () => {
      expect(
        parse(
          build.sequence(digit.or(build.sequence(digit, digit)), letter),
          '12a'
        )
      ).toEqual(
        new Success(
          new Sequence([
            new Choice(1, new Sequence([character('1'), character('2')])),
            character('a'),
          ])
        )
      );
    });

    it('must prefer the earlier alternative when both parse the whole input', () => {
      expect(parse(digit.or(build.sequence(digit)), '1')).toEqual(
        new Success(new Choice(0, character('1')))
      );
    });

    it('must print a value with the first alternative', () => {
      expect(print(codec, new Choice(0, character('1')))).toEqual(
        new Success('1')
      );
    });

    it('must print a value with a later alternative', () => {
      expect(print(codec, new Choice(1, character('x')))).toEqual(
        new Success('x')
      );
    });
  });

  describe('parse', () => {
    it('must read no further into its input than it needs', () => {
      const of = vi.spyOn(CodePoint, 'of');

      try {
        expect(parse(digit, `x${'1'.repeat(1_000)}`).ok()).toBe(false);
        expect(of.mock.calls.length).toBeLessThan(3);
      } finally {
        of.mockRestore();
      }
    });

    it('must read text by code point, not by code unit', () => {
      expect(parse(build.character(0x1f600), '😀')).toEqual(
        new Success(character('😀'))
      );
    });
  });

  describe('print', () => {
    it('must print a value as a string', () => {
      expect(
        build
          .literal('a:')
          .or(digit)
          .print(new Choice(0, new Sequence(characters('a:'))))
      ).toEqual(new Success('a:'));
    });

    it('must refuse a value it cannot print', () => {
      expect(digit.print(character('x'))).toEqual(
        new Failure(new Misprint([], "'x' does not belong to this rule"))
      );
    });

    it('must print a code point outside the basic plane whole', () => {
      expect(build.character(0x1f600).print(character('😀'))).toEqual(
        new Success('😀')
      );
    });
  });

  describe('at', () => {
    it('must parse with the element of a sequence at the index', () => {
      const second = build.sequence(digit, letter).at(1);

      expect(parse(second, 'a').ok()).toBe(true);
      expect(parse(second, '1').ok()).toBe(false);
    });

    it('must see through a label', () => {
      const first = build.sequence(digit, letter).label('pair').at(0);

      expect(parse(first, '1').ok()).toBe(true);
    });

    it('must type the codec by the element at the index', () => {
      expectTypeOf(
        build.sequence(digit, build.literal('-')).at(1)
      ).toEqualTypeOf<Codec<Literal>>();
    });
  });

  describe('alternative', () => {
    it('must parse with the alternative at the index', () => {
      const second = build.choice(digit, letter).alternative(1);

      expect(parse(second, 'a').ok()).toBe(true);
      expect(parse(second, '1').ok()).toBe(false);
    });

    it('must index the alternatives of nested choices as the parse does', () => {
      const codec = build.choice(
        build.choice(digit, letter),
        build.literal('-')
      );
      const parsed = parse(codec, '-');

      assert(parsed.ok());
      expect(parsed.value().index()).toBe(2);
      expect(parse(codec.alternative(2), '-').ok()).toBe(true);
    });
  });

  describe('value', () => {
    it('must parse with what an option holds', () => {
      const held = digit.optional().value();

      expect(parse(held, '1').ok()).toBe(true);
      expect(parse(held, '').ok()).toBe(false);
    });
  });

  describe('element', () => {
    it('must parse with what a repetition repeats', () => {
      const repeated = digit.many().element();

      expect(parse(repeated, '1').ok()).toBe(true);
      expect(parse(repeated, '11').ok()).toBe(false);
    });
  });

  describe('default', () => {
    it('must parse the default text of the codec', () => {
      const defaulted = build
        .sequence(build.literal('-'), digit.optional())
        .default();

      assert(defaulted.ok());
      expect(defaulted.value()).toEqual(
        new Sequence([new Sequence(characters('-')), new Option()])
      );
    });

    it('must report what has no default', () => {
      const defaulted = build.sequence(build.literal('-'), digit).default();

      assert(!defaulted.ok());
      expect(String(defaulted.error())).toBe('a digit');
    });
  });

  describe('write', () => {
    it('must write text parsed by the codec', () => {
      const tree = digit.many().parse('12');

      assert(tree.ok());

      const written = digit[write](
        Focus.of(
          tree.value(),
          (node): node is Node => node instanceof Character
        ),
        () => '7'
      );

      assert(written.ok());
      expect(String(written.value())).toBe('77');
    });
  });

  describe('definition', () => {
    it('must define a repetition by its bounds', () => {
      expect(String(build.character(['0', '9']).many().definition())).toBe(
        '*%x30-39'
      );
    });

    it('must define a literal as a quoted string', () => {
      expect(String(build.literal('http').caseless().definition())).toBe(
        '"http"'
      );
    });

    it('must define a literal without letters as a plain quoted string', () => {
      expect(String(build.literal('::').definition())).toBe('"::"');
    });
  });

  describe('definitions', () => {
    it('must define a codec that uses no rule by itself alone', () => {
      expect(
        Array.from(
          build
            .sequence(build.character('#'), build.character(['0', '9']))
            .definitions(),
          String
        )
      ).toEqual(['%x23 %x30-39']);
    });
  });

  describe('caseless', () => {
    it('must match a literal in any case, keeping the case it parsed', () => {
      const codec = build.literal('http').caseless();
      const parsed = parse(codec, 'HtTp');

      assert(parsed.ok());
      expect(print(codec, parsed.value())).toEqual(new Success('HtTp'));
    });

    it('must expect a literal without case', () => {
      const outcome = parse(build.literal('http').caseless(), 'ftp');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe('Expected "http", got \'f\'');
    });

    it('must define a set of letters by both of its cases', () => {
      expect(String(build.character(['a', 'f']).caseless().definition())).toBe(
        '%x41-46 / %x61-66'
      );
    });

    it('must leave terminals it cannot fold as they are', () => {
      const codec = build.sequence(build.literal('x'), digit).caseless();

      expect(parse(codec, 'X1').ok()).toBe(true);
    });

    it('must keep the alternatives of a choice for flattening', () => {
      const codec = build
        .literal('a')
        .or(build.literal('b'))
        .caseless()
        .or(build.literal('c'));

      expectTypeOf(codec).toEqualTypeOf<
        Codec<Choice<[Literal, Literal, Literal]>>
      >();
      expect(parse(codec, 'B')).toEqual(
        new Success(new Choice(1, new Sequence(characters('B'))))
      );
    });

    it('must keep a codec of one alternative whole', () => {
      expect(parse(build.literal('ab').caseless().or(digit), 'aB').ok()).toBe(
        true
      );
    });
  });

  describe('label', () => {
    it('must replace what was expected when nothing was consumed', () => {
      const outcome = parse(digit.or(letter).label('an alphanumeric'), '!');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe("Expected an alphanumeric, got '!'");
    });

    it('must keep what was expected further in once something was consumed', () => {
      const outcome = parse(
        build.sequence(digit, letter).label('a pair'),
        '1!'
      );

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe("Expected a letter, got '!'");
    });

    it('must let the outer of two labels starting at the same point win', () => {
      const outcome = parse(digit.label('a number').label('a numeral'), '!');

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe("Expected a numeral, got '!'");
    });

    it('must let an inner label win where it starts after the outer one', () => {
      const outcome = parse(
        build.sequence(digit, letter.label('a suffix')).label('a pair'),
        '1!'
      );

      assert(!outcome.ok());
      expect(String(outcome.error())).toBe("Expected a suffix, got '!'");
    });

    it('must parse and print through its element', () => {
      const codec = digit.label('a number');

      expect(parse(codec, '1')).toEqual(new Success(character('1')));
      expect(print(codec, character('1'))).toEqual(new Success('1'));
    });
  });

  describe('optional', () => {
    const codec = digit.optional();

    it('must parse the value when the rule matches', () => {
      expect(parse(codec, '1')).toEqual(
        new Success(new Option(character('1')))
      );
    });

    it('must parse an absent value when the rule does not match', () => {
      expect(parse(codec, '')).toEqual(new Success(new Option<Character>()));
    });

    it('must backtrack to an absent value when the rest does not match', () => {
      expect(parse(build.sequence(codec, digit), '1')).toEqual(
        new Success(new Sequence([new Option<Character>(), character('1')]))
      );
    });

    it('must prefer a present value when both parse the whole input', () => {
      expect(parse(build.sequence(codec, codec), '1')).toEqual(
        new Success(
          new Sequence([new Option(character('1')), new Option<Character>()])
        )
      );
    });

    it('must print the value when present', () => {
      expect(print(codec, new Option(character('1')))).toEqual(
        new Success('1')
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
      ).toEqual(new Success(new Repetition(characters('12'))));
    });

    it('must stop on a zero-width match without collecting it', () => {
      expect(parse(digit.optional().many(), '')).toEqual(
        new Success(new Repetition([]))
      );
    });

    it('must stop at the maximum', () => {
      expect(
        parse(
          build.sequence(
            digit.repeat(Range.closed(Integer.of(1), Integer.of(2))),
            digit
          ),
          '123'
        )
      ).toEqual(
        new Success(
          new Sequence([new Repetition(characters('12')), character('3')])
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
      expect(outcome.error().offset()).toBe(2);
    });

    it('must backtrack to fewer matches when the rest does not match', () => {
      expect(
        parse(
          build.sequence(build.sequence(digit, letter).many(), digit, letter),
          '1a2a3a'
        )
      ).toEqual(
        new Success(
          new Sequence([
            new Repetition([
              new Sequence([character('1'), character('a')]),
              new Sequence([character('2'), character('a')]),
            ]),
            character('3'),
            character('a'),
          ])
        )
      );
    });

    it('must prefer more matches when both parse the whole input', () => {
      expect(parse(build.sequence(digit.many(), digit.many()), '12')).toEqual(
        new Success(
          new Sequence([new Repetition(characters('12')), new Repetition([])])
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
          new Repetition([new Option<Character>(), new Option<Character>()])
        )
      );
    });

    it('must reject printing a count outside its bounds', () => {
      expect(
        digit
          .repeat(Range.closed(Integer.of(1), Integer.of(3)))
          .print(new Repetition(characters('1234')))
      ).toEqual(
        new Failure(new Misprint([], 'Expected a count in [1..3], got 4'))
      );
    });
  });

  describe('times', () => {
    const pair = digit.times(2);

    it('must collect exactly the given number of matches', () => {
      expect(parse(pair, '12')).toEqual(
        new Success(new Repetition(characters('12')))
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
        new Success(new Repetition(characters('123')))
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
        new Success(new Repetition(characters('123')))
      );
    });
  });
});
