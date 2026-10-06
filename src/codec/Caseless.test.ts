import { describe, expect, it } from 'vitest';

import { PartialIso } from '@fundamentry/category';
import { Success } from '@fundamentry/coproduct';
import { Range, RangeSet } from '@fundamentry/range';
import { CodePoint, Integer } from '@fundamentry/scalar';

import { Named, Quoted, Characters } from '#project/expectation';
import {
  Alternation,
  Concatenation,
  type Expression,
  Label,
  Optional,
  Reference,
  Repetition,
  Rule,
  Terminal,
} from '#project/expression';
import { Character } from '#project/tree';

import { Caseless } from './Caseless.js';

const conversion = PartialIso.of<CodePoint, Character, string, string>(
  codePoint => new Success(new Character(codePoint)),
  literal => new Success(literal.codePoint())
);

const letter = (character: string) =>
  new Terminal(
    conversion,
    new Characters(RangeSet.from([Range.singleton(CodePoint.of(character))]))
  );

const rendered: (within: Characters) => Expression<CodePoint> = within =>
  new Terminal(conversion, new Named(String(within)));

const caseless = new Caseless(rendered);

const visit = (expression: Expression<CodePoint>): unknown =>
  expression.accept<undefined, unknown>(
    {
      terminal: (_, expectation) => [String(expectation)],
      concatenation: elements => ['concatenation', ...elements.map(visit)],
      alternation: alternatives => ['alternation', ...alternatives.map(visit)],
      optional: element => ['optional', visit(element)],
      repetition: (element, bounds) => [
        'repetition',
        String(bounds),
        visit(element),
      ],
      label: (element, expectation) => [
        'label',
        String(expectation),
        visit(element),
      ],
      rule: () => ['rule'],
      reference: () => ['reference'],
    } satisfies Expression.Visitor<CodePoint, undefined, unknown>,
    undefined
  );

describe('Caseless', () => {
  describe('rewrite', () => {
    it('must widen a terminal of characters to both cases', () => {
      expect(visit(caseless.rewrite(letter('a')))).toEqual(['%x41 / %x61']);
    });

    it('must leave any other terminal as it is', () => {
      const terminal = new Terminal(conversion, new Named('a digit'));

      expect(caseless.rewrite(terminal)).toBe(terminal);
    });

    it('must rewrite within sequences, alternations, options and repetitions', () => {
      expect(
        visit(
          caseless.rewrite(
            new Concatenation([
              new Alternation([letter('a'), letter('b')]),
              new Optional(letter('c')),
              new Repetition(letter('d'), Range.atLeast(Integer.of(0))),
            ])
          )
        )
      ).toEqual([
        'concatenation',
        ['alternation', ['%x41 / %x61'], ['%x42 / %x62']],
        ['optional', ['%x43 / %x63']],
        ['repetition', '[0..+∞)', ['%x44 / %x64']],
      ]);
    });

    it('must quote a label of text without case', () => {
      expect(
        visit(caseless.rewrite(new Label(letter('a'), Quoted.of('a'))))
      ).toEqual(['label', '"a"', ['%x41 / %x61']]);
    });

    it('must keep any other label', () => {
      expect(
        visit(caseless.rewrite(new Label(letter('a'), new Named('a letter'))))
      ).toEqual(['label', 'a letter', ['%x41 / %x61']]);
    });

    it('must leave a rule and a reference as they are', () => {
      const identity = { name: () => 'A' };
      const rule = new Rule(letter('a'), () => identity);
      const reference = new Reference(() => letter('a'));

      expect(caseless.rewrite(rule)).toBe(rule);
      expect(caseless.rewrite(reference)).toBe(reference);
    });
  });
});
