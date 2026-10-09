import { describe, expect, it } from 'vitest';

import { PartialIso } from '@fundamentry/category';
import { Failure, Success } from '@fundamentry/coproduct';
import { Range } from '@fundamentry/range';
import { type CodePoint, Integer } from '@fundamentry/scalar';

import { Named } from '#project/expectation';
import {
  Alternation,
  Concatenation,
  type Expression,
  Label,
  Optional,
  Reference,
  Repetition,
  Rule,
  Separated,
  Terminal,
} from '#project/expression';
import { Character } from '#project/tree';

import { LeftCorners } from './LeftCorners.js';

const digit = new Terminal(
  PartialIso.of<CodePoint, Character, string, string>(
    token => new Success(new Character(token)),
    value => new Failure(`'${value.toString()}' is unprintable`)
  ),
  new Named('a digit')
);

describe('LeftCorners', () => {
  describe('of', () => {
    it('must not let a terminal match empty input', () => {
      expect(new LeftCorners(digit).of(digit).nullable).toBe(false);
    });

    it('must let an option match empty input', () => {
      const optional = new Optional(digit);

      expect(new LeftCorners(optional).of(optional).nullable).toBe(true);
    });

    it('must let a sequence match empty input only when every element does', () => {
      const empty = new Concatenation([
        new Optional(digit),
        new Optional(digit),
      ]);
      const full = new Concatenation([new Optional(digit), digit]);

      expect(new LeftCorners(empty).of(empty).nullable).toBe(true);
      expect(new LeftCorners(full).of(full).nullable).toBe(false);
    });

    it('must let a list match empty input only when it allows no elements', () => {
      const empty = new Separated(digit, digit, Range.atLeast(Integer.of(0)));
      const full = new Separated(digit, digit, Range.atLeast(Integer.of(1)));

      expect(new LeftCorners(empty).of(empty).nullable).toBe(true);
      expect(new LeftCorners(full).of(full).nullable).toBe(false);
    });

    it('must let a repetition that allows no iterations match empty input', () => {
      const repetition = new Repetition(digit, Range.atLeast(Integer.of(0)));

      expect(new LeftCorners(repetition).of(repetition).nullable).toBe(true);
    });

    it('must let an alternation match empty input when either side does', () => {
      const alternation = new Alternation([digit, new Optional(digit)]);

      expect(new LeftCorners(alternation).of(alternation).nullable).toBe(true);
    });

    it('must not find a terminal left-recursive', () => {
      expect(new LeftCorners(digit).of(digit).corners.has(digit)).toBe(false);
    });

    it('must find a rule that starts with itself left-recursive', () => {
      const sum: Expression<CodePoint> = new Alternation([
        new Concatenation([new Reference(() => sum), digit]),
        digit,
      ]);

      expect(new LeftCorners(sum).of(sum).corners.has(sum)).toBe(true);
    });

    it('must not find a rule that ends with itself left-recursive', () => {
      const list: Expression<CodePoint> = new Optional(
        new Concatenation([digit, new Reference(() => list)])
      );

      expect(new LeftCorners(list).of(list).corners.has(list)).toBe(false);
    });

    it('must find a rule that refers to itself after what can match empty input left-recursive', () => {
      const rule: Expression<CodePoint> = new Alternation([
        new Concatenation([new Optional(digit), new Reference(() => rule)]),
        digit,
      ]);

      expect(new LeftCorners(rule).of(rule).corners.has(rule)).toBe(true);
    });

    it('must find rules that start with each other left-recursive', () => {
      const grammar: {
        readonly term: Expression<CodePoint>;
        readonly factor: Expression<CodePoint>;
      } = {
        term: new Alternation([
          new Concatenation([new Reference(() => grammar.factor), digit]),
          digit,
        ]),
        factor: new Alternation([
          new Concatenation([new Reference(() => grammar.term), digit]),
          digit,
        ]),
      };
      const corners = new LeftCorners(grammar.term);

      expect(corners.of(grammar.term).corners.has(grammar.term)).toBe(true);
      expect(corners.of(grammar.factor).corners.has(grammar.factor)).toBe(true);
    });

    it('must look through labels and rules', () => {
      const rule: Expression<CodePoint> = new Alternation([
        new Rule(
          new Label(
            new Concatenation([new Reference(() => rule), digit]),
            new Named('a rule')
          ),
          () => ({ name: () => 'RULE' })
        ),
        digit,
      ]);

      expect(new LeftCorners(rule).of(rule).corners.has(rule)).toBe(true);
    });

    it('must not look into a repetition that never iterates', () => {
      const rule: Expression<CodePoint> = new Alternation([
        new Concatenation([
          new Repetition(
            new Reference(() => rule),
            Range.singleton(Integer.of(0))
          ),
          digit,
        ]),
        digit,
      ]);

      expect(new LeftCorners(rule).of(rule).corners.has(rule)).toBe(false);
    });
  });
});
