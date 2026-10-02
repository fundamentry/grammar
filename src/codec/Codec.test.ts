import { assert, describe, expect, it, vi } from 'vitest';

import { Prism } from '@fundamentry/category';
import { Failure, type Result, Success } from '@fundamentry/coproduct';
import { nonNegativeInteger, positiveInfinity } from '@fundamentry/number';
import { Point } from '@fundamentry/stream';

import { Codec } from './Codec.js';

const decode = <A>(
  codec: Codec<string, A, string>,
  input: string
): Result<A, Point.Step<string, string>> =>
  codec
    .parse(Point.of(input))
    .flatMap(({ value, rest }) =>
      rest.isAtEnd()
        ? new Success(value)
        : new Failure({ value: 'Expected end of input', rest })
    );

const digit = Codec.token(
  Prism.fromPredicate<string, string>(
    candidate => /^[0-9]$/u.test(candidate),
    candidate => `Expected a digit, got '${candidate}'`
  )
);

const letter = Codec.token(
  Prism.fromPredicate<string, string>(
    candidate => /^[a-z]$/u.test(candidate),
    candidate => `Expected a letter, got '${candidate}'`
  )
);

const joined = Prism.of<readonly string[], string, string>(
  values => new Success(values.join('')),
  value => Array.from(value)
);

const mockedCodec = () => {
  const preview = vi.fn<(token: string) => Result<string, string>>();

  const review = vi.fn<(value: string) => string>();

  return { codec: Codec.token(Prism.of(preview, review)), preview, review };
};

describe('Codec', () => {
  describe('token', () => {
    const { codec, preview, review } = mockedCodec();

    const input = 'x';

    it('must report end of input', () => {
      const outcome = decode(codec, '');

      assert(!outcome.ok());
      expect(outcome.error().value).toBe('Expected a token, got end of input');
    });

    it('must parse a token into whatever the prism previews it as', () => {
      preview.mockReturnValueOnce(new Success('ok'));

      expect(decode(codec, input)).toEqual(new Success('ok'));
    });

    it('must report the rejection message for a token that fails the predicate', () => {
      preview.mockReturnValueOnce(new Failure('nope'));

      const outcome = decode(codec, input);

      assert(!outcome.ok());
      expect(outcome.error().value).toBe('nope');
    });

    it('must reject printing a value that does not belong to it', () => {
      review.mockReturnValueOnce(input);
      preview.mockReturnValueOnce(new Failure('nope'));

      expect(codec.print('ignored')).toEqual(
        new Failure(`'${input}' does not belong to this rule`)
      );
    });
  });

  describe('tuple', () => {
    const a = mockedCodec();
    const b = mockedCodec();

    const codec = Codec.tuple(a.codec, b.codec);

    const input = 'xy';

    it('must parse its elements in sequence', () => {
      a.preview.mockReturnValueOnce(new Success('A'));
      b.preview.mockReturnValueOnce(new Success('B'));

      expect(decode(codec, input)).toEqual(new Success(['A', 'B']));
    });

    it('must fail at the first element its codec does not accept, without trying the rest', () => {
      a.preview.mockReturnValueOnce(new Failure('nope'));

      const outcome = decode(codec, input);

      assert(!outcome.ok());
      expect(outcome.error().value).toBe('nope');
      expect(b.preview).not.toHaveBeenCalled();
    });

    it('must print its elements in sequence', () => {
      a.review.mockReturnValueOnce('A');
      a.preview.mockReturnValueOnce(new Success('A'));
      b.review.mockReturnValueOnce('B');
      b.preview.mockReturnValueOnce(new Success('B'));

      expect(codec.print(['a', 'b'])).toEqual(new Success(['A', 'B']));
    });

    it('must reject printing the wrong number of elements', () => {
      expect(
        codec.print(['a'] as unknown as readonly [string, string]).ok()
      ).toBe(false);
    });

    it('must reject printing an element its codec does not accept', () => {
      a.review.mockReturnValueOnce('A');
      a.preview.mockReturnValueOnce(new Failure('nope'));

      expect(codec.print(['a', 'b']).ok()).toBe(false);
    });
  });

  describe('parse', () => {
    const error = new Error('Oops!');

    it('must round-trip a whole input', () => {
      const codec = digit.oneOrMore().refine(joined);

      expect(decode(codec, '123')).toEqual(new Success('123'));
      expect(codec.print('123')).toEqual(new Success(['1', '2', '3']));
    });

    it('must reject trailing input, reporting where it starts', () => {
      const outcome = decode(digit.oneOrMore(), '12a');

      assert(!outcome.ok());
      expect(outcome.error().rest.peek()).toBe('a');
    });

    it('must propagate an error thrown while previewing a token', () => {
      const { codec, preview } = mockedCodec();

      preview.mockImplementationOnce(() => {
        throw error;
      });

      expect(() => decode(codec, 'x')).toThrow(error);
    });
  });

  describe('print', () => {
    const { codec, preview, review } = mockedCodec();

    const input = 'x';

    const error = new Error('Oops!');

    it('must wrap a successful print in a Success', () => {
      review.mockReturnValueOnce('reviewed');
      preview.mockReturnValueOnce(new Success('reviewed'));

      expect(codec.print(input)).toEqual(new Success(['reviewed']));
    });

    it('must propagate errors that are not print mismatches', () => {
      review.mockImplementationOnce(() => {
        throw error;
      });

      expect(() => codec.print(input)).toThrow(error);
    });

    it('must not fall back to the next alternative on other errors', () => {
      review.mockImplementationOnce(() => {
        throw error;
      });

      const { codec: alternative } = mockedCodec();

      expect(() => codec.or(alternative).print(input)).toThrow(error);
    });

    it('must propagate an error thrown while attempting the fallback branch', () => {
      review.mockReturnValueOnce('reviewed');
      preview.mockReturnValueOnce(new Failure('nope'));

      const { codec: alternative, review: alternativeReview } = mockedCodec();

      alternativeReview.mockImplementationOnce(() => {
        throw error;
      });

      expect(() => codec.or(alternative).print(input)).toThrow(error);
      expect(alternativeReview).toHaveBeenCalled();
    });
  });

  describe('or', () => {
    it('must report the alternative that got furthest', () => {
      const bracketed = Codec.tuple(
        Codec.token(
          Prism.fromPredicate<string, string>(
            candidate => candidate === '[',
            candidate => `Expected '[', got '${candidate}'`
          )
        ),
        digit,
        Codec.token(
          Prism.fromPredicate<string, string>(
            candidate => candidate === ']',
            candidate => `Expected ']', got '${candidate}'`
          )
        )
      );
      const outcome = decode(bracketed.or(letter), '[1x');

      assert(!outcome.ok());
      expect(outcome.error().value).toBe("Expected ']', got 'x'");
    });

    it('must report the other alternative when it got at least as far', () => {
      const a = mockedCodec();
      const b = mockedCodec();

      a.preview.mockReturnValueOnce(new Failure('a-nope'));
      b.preview.mockReturnValueOnce(new Failure('b-nope'));

      const outcome = decode(a.codec.or(b.codec), 'x');

      assert(!outcome.ok());
      expect(outcome.error().value).toBe('b-nope');
    });

    it('must fall back to the next alternative when the first fails', () => {
      const a = mockedCodec();
      const b = mockedCodec();

      a.preview.mockReturnValueOnce(new Failure('nope'));
      b.preview.mockReturnValueOnce(new Success('ok'));

      expect(decode(a.codec.or(b.codec), 'x')).toEqual(new Success('ok'));
    });

    it('must not try the next alternative when the first succeeds', () => {
      const a = mockedCodec();
      const b = mockedCodec();

      a.preview.mockReturnValueOnce(new Success('ok'));

      expect(decode(a.codec.or(b.codec), 'x')).toEqual(new Success('ok'));
      expect(b.preview).not.toHaveBeenCalled();
    });

    it('must print with the branch that accepts the value', () => {
      const a = mockedCodec();
      const b = mockedCodec();

      a.review.mockReturnValueOnce('rejected');
      a.preview.mockReturnValueOnce(new Failure('nope'));
      b.review.mockReturnValueOnce('accepted');
      b.preview.mockReturnValueOnce(new Success('accepted'));

      expect(a.codec.or(b.codec).print('value')).toEqual(
        new Success(['accepted'])
      );
    });

    it('must not print the next alternative when the first succeeds', () => {
      const a = mockedCodec();
      const b = mockedCodec();

      a.review.mockReturnValueOnce('accepted');
      a.preview.mockReturnValueOnce(new Success('accepted'));

      expect(a.codec.or(b.codec).print('value')).toEqual(
        new Success(['accepted'])
      );
      expect(b.review).not.toHaveBeenCalled();
    });

    it('must reject a value no branch accepts', () => {
      const a = mockedCodec();
      const b = mockedCodec();

      a.review.mockReturnValueOnce('rejected');
      a.preview.mockReturnValueOnce(new Failure('nope'));
      b.review.mockReturnValueOnce('rejected');
      b.preview.mockReturnValueOnce(new Failure('nope'));

      expect(a.codec.or(b.codec).print('value').ok()).toBe(false);
    });
  });

  describe('optional', () => {
    it('must parse the value when the rule matches', () => {
      const { codec, preview } = mockedCodec();

      preview.mockReturnValueOnce(new Success('ok'));

      expect(decode(codec.optional(), 'x')).toEqual(new Success('ok'));
    });

    it('must parse nothing when the rule does not match', () => {
      const { codec } = mockedCodec();

      expect(decode(codec.optional(), '')).toEqual(new Success(undefined));
    });

    it('must print nothing for undefined', () => {
      const { codec } = mockedCodec();

      expect(codec.optional().print(undefined)).toEqual(new Success([]));
    });

    it('must print the value when present', () => {
      const { codec, review, preview } = mockedCodec();

      review.mockReturnValueOnce('ok');
      preview.mockReturnValueOnce(new Success('ok'));

      expect(codec.optional().print('value')).toEqual(new Success(['ok']));
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
      ).toEqual(new Success(['1', '2']));
    });

    it('must stop on a zero-width match without collecting it', () => {
      const outcome = digit.optional().many().parse(Point.of('a'));

      assert(outcome.ok());
      expect(outcome.value().value).toEqual([]);
    });

    it('must stop at the maximum', () => {
      const outcome = digit
        .repeat(nonNegativeInteger(1), nonNegativeInteger(2))
        .parse(Point.of('123'));

      assert(outcome.ok());
      expect(outcome.value().value).toEqual(['1', '2']);
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
      const outcome = digit
        .optional()
        .repeat(nonNegativeInteger(2), positiveInfinity(Infinity))
        .parse(Point.of('a'));

      assert(outcome.ok());
      expect(outcome.value().value).toEqual([undefined, undefined]);
    });

    it('must reject printing a count outside its bounds', () => {
      expect(
        digit
          .repeat(nonNegativeInteger(1), nonNegativeInteger(3))
          .print(['1', '2', '3', '4'])
          .ok()
      ).toBe(false);
    });
  });

  describe('many', () => {
    it('must succeed with an empty array when there are no matches', () => {
      expect(decode(digit.many(), '')).toEqual(new Success([]));
    });

    it('must collect every consecutive match', () => {
      expect(decode(digit.many(), '123')).toEqual(new Success(['1', '2', '3']));
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
        new Success(['1', '2', '3'])
      );
    });
  });

  describe('refine', () => {
    const octet = digit
      .repeat(nonNegativeInteger(1), nonNegativeInteger(3))
      .refine(joined)
      .refine(
        Prism.of<string, number, string>(
          value =>
            Number(value) <= 255
              ? new Success(Number(value))
              : new Failure(`${value} exceeds 255`),
          value => String(value)
        )
      );

    it('must accept a semantically valid value', () => {
      expect(decode(octet, '255')).toEqual(new Success(255));
    });

    it('must reject a semantically invalid value at the start of its span', () => {
      const outcome = decode(octet, '256');

      assert(!outcome.ok());
      expect(outcome.error().value).toBe('256 exceeds 255');
      expect(outcome.error().rest.peek()).toBe('2');
    });

    it('must print through review', () => {
      expect(octet.print(42)).toEqual(new Success(['4', '2']));
    });
  });
});
