import { describe, expect, it } from 'vitest';

import { PartialIso } from '@fundamentry/category';
import { Success } from '@fundamentry/coproduct';
import { Range, RangeSet } from '@fundamentry/range';
import { CodePoint, Integer } from '@fundamentry/scalar';

import { type Expectation, Named, Text, Within } from '#project/expectation';
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

import { Definitions } from './Definitions.js';

const terminal = (expectation: Expectation): Expression<CodePoint> =>
  new Terminal(
    PartialIso.of<CodePoint, Literal, string, string>(
      token => new Success(new Literal(token)),
      value => new Success(value.codePoint())
    ),
    expectation
  );

const within = (...ranges: readonly Range<CodePoint>[]) =>
  terminal(new Within(RangeSet.from(ranges)));

const DIGIT = new Rule(
  within(Range.closed(CodePoint.of('0'), CodePoint.of('9'))),
  'DIGIT'
);

const rendered = (expression: Expression<CodePoint>): readonly string[] =>
  Array.from(new Definitions(expression), String);

describe('Definitions', () => {
  describe('root', () => {
    it('must define a rule at the root by its name', () => {
      expect(String(new Definitions(DIGIT).root())).toBe('DIGIT = %x30-39');
    });

    it('must leave a root that is not a rule unnamed', () => {
      expect(
        String(
          new Definitions(
            new Repetition(DIGIT, Range.atLeast(Integer.of(1)))
          ).root()
        )
      ).toBe('1*DIGIT');
    });
  });

  describe('iterator', () => {
    it('must define the root first, then every rule it uses, once, in the order it uses them', () => {
      const SP = new Rule(within(Range.singleton(CodePoint.of(' '))), 'SP');
      const NUMBERS = new Rule(
        new Concatenation([DIGIT, SP, new Rule(DIGIT, 'LAST'), DIGIT]),
        'NUMBERS'
      );

      expect(rendered(NUMBERS)).toEqual([
        'NUMBERS = DIGIT SP LAST DIGIT',
        'DIGIT = %x30-39',
        'SP = %x20',
        'LAST = DIGIT',
      ]);
    });

    it('must define the rules an unnamed root uses after it', () => {
      expect(rendered(new Optional(DIGIT))).toEqual([
        '[DIGIT]',
        'DIGIT = %x30-39',
      ]);
    });

    it('must define a rule that refers to itself by its name', () => {
      const grammar: { readonly digits: Expression<CodePoint> } = {
        digits: new Rule(
          new Concatenation([
            DIGIT,
            new Optional(new Reference(() => grammar.digits)),
          ]),
          'DIGITS'
        ),
      };

      expect(rendered(grammar.digits)).toEqual([
        'DIGITS = DIGIT [DIGITS]',
        'DIGIT = %x30-39',
      ]);
    });

    it('must reject a production that refers to itself outside a rule', () => {
      const grammar: { readonly digits: Expression<CodePoint> } = {
        digits: new Concatenation([
          DIGIT,
          new Optional(new Reference(() => grammar.digits)),
        ]),
      };

      expect(() => rendered(grammar.digits)).toThrow(
        'A recursive production must recur through a rule'
      );
    });
  });

  describe('terminal', () => {
    it('must render several ranges of code points as alternatives', () => {
      expect(
        rendered(
          within(
            Range.closed(CodePoint.of('A'), CodePoint.of('Z')),
            Range.closed(CodePoint.of('a'), CodePoint.of('z'))
          )
        )
      ).toEqual(['%x41-5A / %x61-7A']);
    });

    it('must render what it expects as prose when it cannot spell it out', () => {
      expect(rendered(terminal(new Named('a digit')))).toEqual(['<a digit>']);
    });

    it('must render an unbounded range as prose', () => {
      expect(rendered(within(Range.atLeast(CodePoint.of('a'))))).toEqual([
        '<one of {[a..+∞)}>',
      ]);
    });
  });

  describe('alternation', () => {
    it('must render both sides as alternatives', () => {
      expect(
        rendered(
          new Concatenation([
            new Alternation([DIGIT, new Alternation([DIGIT, DIGIT])]),
            DIGIT,
          ])
        )[0]
      ).toBe('(DIGIT / DIGIT / DIGIT) DIGIT');
    });
  });

  describe('repetition', () => {
    it('must render its element repeated within its bounds', () => {
      expect(
        rendered(
          new Repetition(DIGIT, Range.closed(Integer.of(2), Integer.of(4)))
        )[0]
      ).toBe('2*4DIGIT');
    });
  });

  describe('refinement', () => {
    it('must render its element', () => {
      expect(
        rendered(new Refinement(new Optional(DIGIT), PartialIso.id<Node>()))[0]
      ).toBe('[DIGIT]');
    });
  });

  describe('label', () => {
    it('must render its element', () => {
      expect(
        rendered(new Label(new Optional(DIGIT), new Named('digits')))[0]
      ).toBe('[DIGIT]');
    });

    it('must render a label of text as that text', () => {
      const http = new Concatenation(
        Array.from('http', character =>
          within(Range.singleton(CodePoint.of(character)))
        )
      );

      expect(rendered(new Label(http, Text.caseSensitive('http')))).toEqual([
        '%s"http"',
      ]);
    });

    it('must render its element when the text cannot be quoted', () => {
      const quote = within(Range.singleton(CodePoint.of('"')));

      expect(rendered(new Label(quote, Text.caseSensitive('"')))).toEqual([
        '%x22',
      ]);
    });
  });
});
