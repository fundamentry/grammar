import { describe, expect, it, vi } from 'vitest';

import { nonNegative } from '@fundamentry/number';
import { Tape } from '@fundamentry/stream';

import { Matched, type Recognition, Unmatched } from '#project/recognition';

import { Rule } from './Rule.js';

const isNumber = (value: unknown): value is number => typeof value === 'number';
const isString = (value: unknown): value is string => typeof value === 'string';

const expectMatched = (recognition: Recognition, value: unknown) => {
  expect(recognition).toBeInstanceOf(Matched);

  if (recognition instanceof Matched)
    expect(recognition.value()).toEqual(value);
};

const expectUnmatched = (recognition: Recognition) => {
  expect(recognition).toBeInstanceOf(Unmatched);
};

describe('Rule', () => {
  describe('derive', () => {
    it('must return the matched recognition and advance the input', () => {
      const input = new Tape([1]);
      const rule = Rule.matching(isNumber);

      expectMatched(rule.derive(input), 1);
      expect(input.tell()).toBe(1);
    });

    it('must restore the input position when the derivation returns unmatched after partially consuming', () => {
      const input = new Tape([1, 'a']);
      const rule = Rule.sequence(
        Rule.matching(isNumber),
        Rule.matching(isNumber)
      );

      expectUnmatched(rule.derive(input));
      expect(input.tell()).toBe(0);
    });

    it('must restore the input position and rethrow when the derivation throws', () => {
      const input = new Tape([1, 2, 3]);
      const error = new Error('boom');
      const rule = new Rule(source => {
        source.consumeIf(isNumber);

        throw error;
      });
      let thrown: unknown;

      try {
        rule.derive(input);
      } catch (caught) {
        thrown = caught;
      }

      expect(thrown).toBe(error);
      expect(input.tell()).toBe(0);
    });
  });

  describe('map', () => {
    it('must call the mapper with the matched value exactly once', () => {
      const mapper = vi.fn(value => value * 2);
      const input = new Tape([1]);
      const rule = Rule.matching(isNumber).map(mapper);

      expectMatched(rule.derive(input), 2);
      expect(mapper).toHaveBeenCalledOnce();
      expect(mapper).toHaveBeenCalledWith(1);
    });

    it('must pass through unmatched without calling the mapper', () => {
      const mapper = vi.fn();
      const input = new Tape(['a']);
      const rule = Rule.matching(isNumber).map(mapper);

      expectUnmatched(rule.derive(input));
      expect(mapper).not.toHaveBeenCalled();
    });
  });

  describe('many', () => {
    it('must collect an empty array when there are no matches', () => {
      const input = new Tape(['a']);
      const rule = Rule.matching(isNumber).many();

      expectMatched(rule.derive(input), []);
      expect(input.tell()).toBe(0);
    });

    it('must collect every consecutive match', () => {
      const input = new Tape([1, 2, 3, 'a']);
      const rule = Rule.matching(isNumber).many();

      expectMatched(rule.derive(input), [1, 2, 3]);
      expect(input.tell()).toBe(3);
    });

    it('must stop instead of looping forever on a zero-width match', () => {
      const input = new Tape([1, 2, 3]);
      const rule = Rule.matching(isString).optional().many();

      expectMatched(rule.derive(input), []);
      expect(input.tell()).toBe(0);
    });
  });

  describe('times', () => {
    it('must succeed with exactly count matches', () => {
      const input = new Tape([1, 2, 3]);
      const rule = Rule.matching(isNumber).times(nonNegative(2));

      expectMatched(rule.derive(input), [1, 2]);
      expect(input.tell()).toBe(2);
    });

    it('must fail and restore the input position when there are not enough matches', () => {
      const input = new Tape([1, 'a']);
      const rule = Rule.matching(isNumber).times(nonNegative(2));

      expectUnmatched(rule.derive(input));
      expect(input.tell()).toBe(0);
    });

    it('must succeed with an empty array without consuming when count is zero', () => {
      const input = new Tape([1]);
      const rule = Rule.matching(isNumber).times(nonNegative(0));

      expectMatched(rule.derive(input), []);
      expect(input.tell()).toBe(0);
    });

    it('must allow repeated zero-width matches for an exact count', () => {
      const input = new Tape([1]);
      const rule = Rule.matching(isString).optional().times(nonNegative(3));

      expectMatched(rule.derive(input), [undefined, undefined, undefined]);
      expect(input.tell()).toBe(0);
    });
  });

  describe('atMost', () => {
    it('must collect up to max matches', () => {
      const input = new Tape([1, 2, 3, 4]);
      const rule = Rule.matching(isNumber).atMost(nonNegative(2));

      expectMatched(rule.derive(input), [1, 2]);
      expect(input.tell()).toBe(2);
    });

    it('must stop early without failing when the derivation stops matching', () => {
      const input = new Tape([1, 'a']);
      const rule = Rule.matching(isNumber).atMost(nonNegative(5));

      expectMatched(rule.derive(input), [1]);
      expect(input.tell()).toBe(1);
    });

    it('must stop instead of looping forever on a zero-width match', () => {
      const input = new Tape([1, 2, 3]);
      const rule = Rule.matching(isString).optional().atMost(nonNegative(5));

      expectMatched(rule.derive(input), []);
      expect(input.tell()).toBe(0);
    });
  });

  describe('optional', () => {
    it('must return the matched value', () => {
      const input = new Tape([1]);
      const rule = Rule.matching(isNumber).optional();

      expectMatched(rule.derive(input), 1);
      expect(input.tell()).toBe(1);
    });

    it('must return undefined without consuming when unmatched', () => {
      const input = new Tape(['a']);
      const rule = Rule.matching(isNumber).optional();

      expectMatched(rule.derive(input), undefined);
      expect(input.tell()).toBe(0);
    });
  });

  describe('required', () => {
    it('must return the matched value', () => {
      const input = new Tape([1]);
      const rule = Rule.matching(isNumber).optional().required();

      expectMatched(rule.derive(input), 1);
      expect(input.tell()).toBe(1);
    });

    it('must fail without consuming when the value is undefined', () => {
      const input = new Tape(['a']);
      const rule = Rule.matching(isNumber).optional().required();

      expectUnmatched(rule.derive(input));
      expect(input.tell()).toBe(0);
    });
  });

  describe('default', () => {
    it('must return the matched value', () => {
      const input = new Tape([1]);
      const rule = Rule.matching(isNumber)
        .optional()
        .default(() => 0);

      expectMatched(rule.derive(input), 1);
      expect(input.tell()).toBe(1);
    });

    it('must return the fallback value without consuming when unmatched', () => {
      const input = new Tape(['a']);
      const rule = Rule.matching(isNumber)
        .optional()
        .default(() => 0);

      expectMatched(rule.derive(input), 0);
      expect(input.tell()).toBe(0);
    });

    it('must only invoke the fallback callback when unmatched', () => {
      const fallback = vi.fn(() => 0);
      const matchedInput = new Tape([1]);
      const unmatchedInput = new Tape(['a']);
      const rule = Rule.matching(isNumber).optional().default(fallback);

      expectMatched(rule.derive(matchedInput), 1);
      expect(fallback).not.toHaveBeenCalled();

      expectMatched(rule.derive(unmatchedInput), 0);
      expect(fallback).toHaveBeenCalledOnce();
    });
  });

  describe('filter', () => {
    it('must call the predicate with the matched value exactly once and keep a value that satisfies it', () => {
      const predicate = vi.fn(value => value % 2 === 0);
      const input = new Tape([2]);
      const rule = Rule.matching(isNumber).filter(predicate);

      expectMatched(rule.derive(input), 2);
      expect(predicate).toHaveBeenCalledOnce();
      expect(predicate).toHaveBeenCalledWith(2);
    });

    it('must call the predicate with the matched value exactly once and fail, restoring the input position, when it rejects the value', () => {
      const predicate = vi.fn(value => value % 2 === 0);
      const input = new Tape([1]);
      const rule = Rule.matching(isNumber).filter(predicate);

      expectUnmatched(rule.derive(input));
      expect(predicate).toHaveBeenCalledOnce();
      expect(predicate).toHaveBeenCalledWith(1);
      expect(input.tell()).toBe(0);
    });

    it('must remain unmatched without calling the predicate when the derivation already failed', () => {
      const predicate = vi.fn(() => true);
      const input = new Tape(['a']);
      const rule = Rule.matching(isNumber).filter(predicate);

      expectUnmatched(rule.derive(input));
      expect(predicate).not.toHaveBeenCalled();
    });

    it('must narrow the result type via a type guard predicate', () => {
      const input = new Tape(['a']);
      const rule = Rule.matching(isString).filter(
        (value): value is 'a' => value === 'a'
      );

      expectMatched(rule.derive(input), 'a');
    });
  });

  describe('or', () => {
    it('must return the value from this rule when it matches', () => {
      const input = new Tape([1]);
      const rule = Rule.matching(isNumber).or(Rule.matching(isString));

      expectMatched(rule.derive(input), 1);
      expect(input.tell()).toBe(1);
    });

    it('must try the other rule when this one fails', () => {
      const input = new Tape(['a']);
      const rule = Rule.matching(isNumber).or(Rule.matching(isString));

      expectMatched(rule.derive(input), 'a');
      expect(input.tell()).toBe(1);
    });

    it('must fail without consuming when neither rule matches', () => {
      const input = new Tape([true]);
      const rule = Rule.matching(isNumber).or(Rule.matching(isString));

      expectUnmatched(rule.derive(input));
      expect(input.tell()).toBe(0);
    });
  });

  describe('matching', () => {
    it('must consume and return the value when the predicate matches', () => {
      const input = new Tape([1, 'a']);
      const rule = Rule.matching(isNumber);

      expectMatched(rule.derive(input), 1);
      expect(input.tell()).toBe(1);
    });

    it('must fail without consuming when the predicate does not match', () => {
      const input = new Tape(['a']);
      const rule = Rule.matching(isNumber);

      expectUnmatched(rule.derive(input));
      expect(input.tell()).toBe(0);
    });

    it('must fail without consuming when the input is empty', () => {
      const input = new Tape([]);
      const rule = Rule.matching(isNumber);

      expectUnmatched(rule.derive(input));
      expect(input.tell()).toBe(0);
    });
  });

  describe('sequence', () => {
    it('must combine every matched value into a tuple', () => {
      const input = new Tape([1, 'a']);
      const rule = Rule.sequence(
        Rule.matching(isNumber),
        Rule.matching(isString)
      );

      expectMatched(rule.derive(input), [1, 'a']);
      expect(input.tell()).toBe(2);
    });

    it('must fail and restore the input position when a later rule fails', () => {
      const input = new Tape([1, 2]);
      const rule = Rule.sequence(
        Rule.matching(isNumber),
        Rule.matching(isString)
      );

      expectUnmatched(rule.derive(input));
      expect(input.tell()).toBe(0);
    });

    it('must succeed with an empty tuple when given no rules', () => {
      const input = new Tape([1]);
      const rule = Rule.sequence();

      expectMatched(rule.derive(input), []);
      expect(input.tell()).toBe(0);
    });
  });

  describe('oneOf', () => {
    it('must return the first alternative that matches', () => {
      const input = new Tape([1]);
      const rule = Rule.oneOf(Rule.matching(isNumber), Rule.matching(isString));

      expectMatched(rule.derive(input), 1);
      expect(input.tell()).toBe(1);
    });

    it('must try later alternatives when earlier ones fail', () => {
      const input = new Tape(['a']);
      const rule = Rule.oneOf(Rule.matching(isNumber), Rule.matching(isString));

      expectMatched(rule.derive(input), 'a');
      expect(input.tell()).toBe(1);
    });

    it('must restore the input position when an earlier composite alternative partially consumes before failing', () => {
      const input = new Tape([1, 'b']);
      const rule = Rule.oneOf(
        Rule.sequence(Rule.matching(isNumber), Rule.matching(isNumber)),
        Rule.sequence(Rule.matching(isNumber), Rule.matching(isString))
      );

      expectMatched(rule.derive(input), [1, 'b']);
      expect(input.tell()).toBe(2);
    });

    it('must fail without consuming when no alternative matches', () => {
      const input = new Tape([true]);
      const rule = Rule.oneOf(Rule.matching(isNumber), Rule.matching(isString));

      expectUnmatched(rule.derive(input));
      expect(input.tell()).toBe(0);
    });

    it('must fail when given no rules', () => {
      const input = new Tape([1]);
      const rule = Rule.oneOf();

      expectUnmatched(rule.derive(input));
    });
  });

  describe('oneOrMore', () => {
    it('must fail when the first rule never matches', () => {
      const input = new Tape(['a']);
      const rule = Rule.oneOrMore(Rule.matching(isNumber));

      expectUnmatched(rule.derive(input));
      expect(input.tell()).toBe(0);
    });

    it('must collect exactly one match when there is no more after it', () => {
      const input = new Tape([1, 'a']);
      const rule = Rule.oneOrMore(Rule.matching(isNumber));

      expectMatched(rule.derive(input), [1]);
      expect(input.tell()).toBe(1);
    });

    it('must collect one or more matches using a single rule', () => {
      const input = new Tape([1, 2, 3, 'a']);
      const rule = Rule.oneOrMore(Rule.matching(isNumber));

      expectMatched(rule.derive(input), [1, 2, 3]);
      expect(input.tell()).toBe(3);
    });

    it('must collect a first match followed by zero or more of a different rule', () => {
      const input = new Tape(['a', 1, 2, 'b']);
      const rule = Rule.oneOrMore(
        Rule.matching(isString),
        Rule.matching(isNumber)
      );

      expectMatched(rule.derive(input), ['a', 1, 2]);
      expect(input.tell()).toBe(3);
    });
  });
});
