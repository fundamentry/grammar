import { assert, describe, expect, it, vi } from 'vitest';

import { Prism } from '@fundamentry/category';
import { Failure, type Result, Success } from '@fundamentry/coproduct';
import { nonNegativeInteger, positiveInfinity } from '@fundamentry/number';
import { CodePoint } from '@fundamentry/scalar';
import { Point } from '@fundamentry/stream';
import { type Equatable, type Stringable } from '@fundamentry/trait';

import { PrintMismatchError } from '#project/error';
import {
  Literal,
  type Node,
  Option,
  Repetition,
  Sequence,
} from '#project/tree';

import { Codec } from './Codec.js';

class Octet implements Equatable<unknown>, Stringable {
  readonly #value: number;

  constructor(value: number) {
    this.#value = value;
  }

  equals(other: unknown): boolean {
    return other instanceof Octet && this.#value === other.#value;
  }

  toString(): string {
    return String(this.#value);
  }
}

const codePoints = (text: string): readonly CodePoint[] =>
  Array.from(text, CodePoint.of);

const literal = (character: string): Literal =>
  new Literal(CodePoint.of(character));

const literals = (text: string): readonly Literal[] =>
  Array.from(text, literal);

const parse = <A extends Node>(
  codec: Codec<CodePoint, A, string>,
  input: string
): Codec.Parsed<CodePoint, A, string> =>
  codec.parse(Point.of(codePoints(input)));

const decode = <A extends Node>(
  codec: Codec<CodePoint, A, string>,
  input: string
): Result<A, Point.Step<CodePoint, string>> =>
  parse(codec, input).flatMap(({ value, rest }) =>
    rest.isAtEnd()
      ? new Success(value)
      : new Failure({ value: 'Expected end of input', rest })
  );

const character = (pattern: RegExp, name: string) =>
  Codec.token(
    Prism.of<CodePoint, Literal, string>(
      candidate =>
        pattern.test(candidate.toString())
          ? new Success(new Literal(candidate))
          : new Failure(`Expected ${name}, got '${candidate.toString()}'`),
      value => value.codePoint()
    )
  );

const digit = character(/^[0-9]$/u, 'a digit');
const letter = character(/^[a-z]$/u, 'a letter');

const error = new Error('Oops!');

const mockedCodec = () => {
  const preview = vi.fn<(token: CodePoint) => Result<Literal, string>>();
  const review = vi.fn<(value: Literal) => CodePoint>();

  return { codec: Codec.token(Prism.of(preview, review)), preview, review };
};

describe('Codec', () => {
  describe('token', () => {
    it('must report end of input', () => {
      const outcome = decode(digit, '');

      assert(!outcome.ok());
      expect(outcome.error().value).toBe('Expected a token, got end of input');
    });

    it('must parse a token into whatever the prism previews it as', () => {
      expect(decode(digit, '1')).toEqual(new Success(literal('1')));
    });

    it('must report the rejection message for a token the prism does not accept', () => {
      const outcome = decode(digit, 'x');

      assert(!outcome.ok());
      expect(outcome.error().value).toBe("Expected a digit, got 'x'");
    });

    it('must propagate an error thrown while previewing a token', () => {
      const { codec, preview } = mockedCodec();

      preview.mockImplementationOnce(() => {
        throw error;
      });

      expect(() => decode(codec, 'x')).toThrow(error);
    });

    it('must print a value through review', () => {
      expect(digit.print(literal('1'))).toEqual(new Success(codePoints('1')));
    });

    it('must reject printing a value that does not belong to it', () => {
      expect(digit.print(literal('x'))).toEqual(
        new Failure("'x' does not belong to this rule")
      );
    });

    it('must report a print mismatch raised by review', () => {
      const { codec, review } = mockedCodec();

      review.mockImplementationOnce(() => {
        throw new PrintMismatchError('nope');
      });

      expect(codec.print(literal('x'))).toEqual(new Failure('nope'));
    });

    it('must propagate errors that are not print mismatches', () => {
      const { codec, review } = mockedCodec();

      review.mockImplementationOnce(() => {
        throw error;
      });

      expect(() => codec.print(literal('x'))).toThrow(error);
    });
  });

  describe('tuple', () => {
    const codec = Codec.tuple(digit, letter);

    it('must parse its elements in sequence', () => {
      expect(decode(codec, '1a')).toEqual(
        new Success(new Sequence([literal('1'), literal('a')]))
      );
    });

    it('must fail at the first element its codec does not accept, without trying the rest', () => {
      const { codec: rest, preview } = mockedCodec();

      const outcome = decode(Codec.tuple(digit, rest), 'xy');

      assert(!outcome.ok());
      expect(outcome.error().value).toBe("Expected a digit, got 'x'");
      expect(preview).not.toHaveBeenCalled();
    });

    it('must print its elements in sequence', () => {
      expect(codec.print(new Sequence([literal('1'), literal('a')]))).toEqual(
        new Success(codePoints('1a'))
      );
    });

    it('must reject printing the wrong number of elements', () => {
      expect(
        codec
          .print(
            new Sequence([literal('1')]) as unknown as Sequence<
              readonly [Literal, Literal]
            >
          )
          .ok()
      ).toBe(false);
    });

    it('must reject printing an element its codec does not accept', () => {
      expect(codec.print(new Sequence([literal('a'), literal('a')])).ok()).toBe(
        false
      );
    });
  });

  describe('parse', () => {
    it('must round-trip a whole input', () => {
      const codec = digit.oneOrMore();

      expect(decode(codec, '123')).toEqual(
        new Success(new Repetition(literals('123')))
      );
      expect(codec.print(new Repetition(literals('123')))).toEqual(
        new Success(codePoints('123'))
      );
    });

    it('must reject trailing input, reporting where it starts', () => {
      const outcome = decode(digit.oneOrMore(), '12a');

      assert(!outcome.ok());
      expect(outcome.error().rest.peek()).toEqual(CodePoint.of('a'));
    });
  });

  describe('or', () => {
    const codec = digit.or(letter);

    it('must report the alternative that got furthest', () => {
      const bracketed = Codec.tuple(
        character(/^\[$/u, "'['"),
        digit,
        character(/^\]$/u, "']'")
      );
      const outcome = decode(bracketed.or(letter), '[1x');

      assert(!outcome.ok());
      expect(outcome.error().value).toBe("Expected ']', got 'x'");
    });

    it('must report the other alternative when it got at least as far', () => {
      const outcome = decode(codec, '!');

      assert(!outcome.ok());
      expect(outcome.error().value).toBe("Expected a letter, got '!'");
    });

    it('must fall back to the next alternative when the first fails', () => {
      expect(decode(codec, 'x')).toEqual(new Success(literal('x')));
    });

    it('must not try the next alternative when the first succeeds', () => {
      const { codec: next, preview } = mockedCodec();

      expect(decode(digit.or(next), '1')).toEqual(new Success(literal('1')));
      expect(preview).not.toHaveBeenCalled();
    });

    it('must print with the branch that accepts the value', () => {
      expect(codec.print(literal('x'))).toEqual(new Success(codePoints('x')));
    });

    it('must not print the next alternative when the first succeeds', () => {
      const { codec: next, review } = mockedCodec();

      expect(digit.or(next).print(literal('1'))).toEqual(
        new Success(codePoints('1'))
      );
      expect(review).not.toHaveBeenCalled();
    });

    it('must reject a value no branch accepts', () => {
      expect(codec.print(literal('!')).ok()).toBe(false);
    });

    it('must not fall back to the next alternative on other errors', () => {
      const { codec: first, review } = mockedCodec();

      review.mockImplementationOnce(() => {
        throw error;
      });

      expect(() => first.or(letter).print(literal('x'))).toThrow(error);
    });

    it('must propagate an error thrown while attempting the fallback branch', () => {
      const { codec: next, review } = mockedCodec();

      review.mockImplementationOnce(() => {
        throw error;
      });

      expect(() => digit.or(next).print(literal('x'))).toThrow(error);
      expect(review).toHaveBeenCalled();
    });
  });

  describe('optional', () => {
    const codec = digit.optional();

    it('must parse the value when the rule matches', () => {
      expect(decode(codec, '1')).toEqual(new Success(new Option(literal('1'))));
    });

    it('must parse an absent value when the rule does not match', () => {
      expect(decode(codec, '')).toEqual(new Success(new Option<Literal>()));
    });

    it('must print nothing for an absent value', () => {
      expect(codec.print(new Option())).toEqual(new Success([]));
    });

    it('must print the value when present', () => {
      expect(codec.print(new Option(literal('1')))).toEqual(
        new Success(codePoints('1'))
      );
    });
  });

  describe('repeat', () => {
    it('must reject a maximum below the minimum', () => {
      expect(() =>
        digit.repeat(nonNegativeInteger(3), nonNegativeInteger(1))
      ).toThrow(RangeError);
    });

    it('must succeed with exactly the minimum when it equals the maximum', () => {
      expect(
        decode(digit.repeat(nonNegativeInteger(2), nonNegativeInteger(2)), '12')
      ).toEqual(new Success(new Repetition(literals('12'))));
    });

    it('must stop on a zero-width match without collecting it', () => {
      const outcome = parse(digit.optional().many(), 'a');

      assert(outcome.ok());
      expect(outcome.value().value).toEqual(new Repetition([]));
    });

    it('must stop at the maximum', () => {
      const outcome = parse(
        digit.repeat(nonNegativeInteger(1), nonNegativeInteger(2)),
        '123'
      );

      assert(outcome.ok());
      expect(outcome.value().value).toEqual(new Repetition(literals('12')));
    });

    it('must fail with the first failure when fewer than the minimum match', () => {
      const outcome = decode(
        digit.repeat(nonNegativeInteger(2), positiveInfinity(Infinity)),
        '1a'
      );

      assert(!outcome.ok());
      expect(outcome.error().value).toBe("Expected a digit, got 'a'");
    });

    it('must collect zero-width matches up to the minimum', () => {
      const outcome = parse(
        digit
          .optional()
          .repeat(nonNegativeInteger(2), positiveInfinity(Infinity)),
        'a'
      );

      assert(outcome.ok());
      expect(outcome.value().value).toEqual(
        new Repetition([new Option<Literal>(), new Option<Literal>()])
      );
    });

    it('must reject printing a count outside its bounds', () => {
      expect(
        digit
          .repeat(nonNegativeInteger(1), nonNegativeInteger(3))
          .print(new Repetition(literals('1234')))
          .ok()
      ).toBe(false);
    });
  });

  describe('many', () => {
    it('must succeed with an empty repetition when there are no matches', () => {
      expect(decode(digit.many(), '')).toEqual(new Success(new Repetition([])));
    });

    it('must collect every consecutive match', () => {
      expect(decode(digit.many(), '123')).toEqual(
        new Success(new Repetition(literals('123')))
      );
    });

    it('must be stack-safe on long input', () => {
      const input = '1'.repeat(100_000);

      expect(decode(digit.many(), input).ok()).toBe(true);
    });
  });

  describe('oneOrMore', () => {
    it('must fail when there are no matches', () => {
      expect(decode(digit.oneOrMore(), '').ok()).toBe(false);
    });

    it('must collect one or more matches', () => {
      expect(decode(digit.oneOrMore(), '123')).toEqual(
        new Success(new Repetition(literals('123')))
      );
    });
  });

  describe('refine', () => {
    const octet = digit
      .repeat(nonNegativeInteger(1), nonNegativeInteger(3))
      .refine(
        Prism.of<Repetition<Literal>, Octet, string>(
          digits =>
            Number(digits.toString()) <= 255
              ? new Success(new Octet(Number(digits.toString())))
              : new Failure(`${digits.toString()} exceeds 255`),
          value => new Repetition(literals(value.toString()))
        )
      );

    it('must accept a semantically valid value', () => {
      expect(decode(octet, '255')).toEqual(new Success(new Octet(255)));
    });

    it('must reject a semantically invalid value at the start of its span', () => {
      const outcome = decode(octet, '256');

      assert(!outcome.ok());
      expect(outcome.error().value).toBe('256 exceeds 255');
      expect(outcome.error().rest.peek()).toEqual(CodePoint.of('2'));
    });

    it('must reject printing a value its prism does not accept back', () => {
      expect(octet.print(new Octet(256))).toEqual(
        new Failure("'256' does not belong to this rule")
      );
    });

    it('must print through review', () => {
      expect(octet.print(new Octet(42))).toEqual(new Success(codePoints('42')));
    });
  });
});
