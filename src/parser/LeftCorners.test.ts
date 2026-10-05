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
  Refinement,
  Repetition,
  Rule,
  Terminal,
} from '#project/expression';
import { Literal, type Node } from '#project/tree';

import { LeftCorners } from './LeftCorners.js';

const digit = new Terminal(
  PartialIso.of<CodePoint, Literal, string, string>(
    token => new Success(new Literal(token)),
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

    it('must let a repetition that allows no iterations match empty input', () => {
      const repetition = new Repetition(digit, Range.atLeast(Integer.of(0)));

      expect(new LeftCorners(repetition).of(repetition).nullable).toBe(true);
    });

    it('must let an alternation match empty input when either side does', () => {
      const alternation = new Alternation([digit, new Optional(digit)]);

      expect(new LeftCorners(alternation).of(alternation).nullable).toBe(true);
    });
  });

  describe('isLeftRecursive', () => {
    it('must not find a terminal left-recursive', () => {
      expect(new LeftCorners(digit).isLeftRecursive(digit)).toBe(false);
    });

    it('must find a rule that starts with itself left-recursive', () => {
      const sum: Expression<CodePoint> = new Alternation([
        new Concatenation([new Reference(() => sum), digit]),
        digit,
      ]);

      expect(new LeftCorners(sum).isLeftRecursive(sum)).toBe(true);
    });

    it('must not find a rule that ends with itself left-recursive', () => {
      const list: Expression<CodePoint> = new Optional(
        new Concatenation([digit, new Reference(() => list)])
      );

      expect(new LeftCorners(list).isLeftRecursive(list)).toBe(false);
    });

    it('must find a rule that refers to itself after what can match empty input left-recursive', () => {
      const rule: Expression<CodePoint> = new Alternation([
        new Concatenation([new Optional(digit), new Reference(() => rule)]),
        digit,
      ]);

      expect(new LeftCorners(rule).isLeftRecursive(rule)).toBe(true);
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

      expect(corners.isLeftRecursive(grammar.term)).toBe(true);
      expect(corners.isLeftRecursive(grammar.factor)).toBe(true);
    });

    it('must look through refinements, labels and rules', () => {
      const rule: Expression<CodePoint> = new Alternation([
        new Rule(
          new Label(
            new Refinement(
              new Concatenation([new Reference(() => rule), digit]),
              PartialIso.id<Node>()
            ),
            new Named('a rule')
          ),
          'RULE'
        ),
        digit,
      ]);

      expect(new LeftCorners(rule).isLeftRecursive(rule)).toBe(true);
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

      expect(new LeftCorners(rule).isLeftRecursive(rule)).toBe(false);
    });
  });
});
