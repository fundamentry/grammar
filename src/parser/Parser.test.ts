import { assert, describe, expect, it, vi } from 'vitest';

import { PartialIso } from '@fundamentry/category';
import { Failure, Success } from '@fundamentry/coproduct';
import { CodePoint } from '@fundamentry/scalar';
import { Point } from '@fundamentry/stream';

import { Named } from '#project/expectation';
import {
  Alternation,
  Concatenation,
  type Expression,
  Label,
  Optional,
  Reference,
  Rule,
  Terminal,
} from '#project/expression';
import { Choice, Character, Nonterminal, Sequence } from '#project/tree';

import { Parser } from './Parser.js';

const character = (name: string, accepts: (codePoint: CodePoint) => boolean) =>
  new Terminal(
    PartialIso.of<CodePoint, Character, string, string>(
      token =>
        accepts(token)
          ? new Success(new Character(token))
          : new Failure(`Expected ${name}`),
      value => new Success(value.codePoint())
    ),
    new Named(name)
  );

const digit = character('a digit', token => /\d/u.test(token.toString()));

const letter = character('a letter', token => /[a-z]/u.test(token.toString()));

const input = (text: string) => Point.of(Array.from(text, CodePoint.of));

describe('Parser', () => {
  describe('parse', () => {
    it('must yield the first candidate that consumes the whole input', () => {
      expect(
        new Parser(new Alternation([digit, new Concatenation([digit])])).parse(
          input('1')
        )
      ).toEqual(new Success(new Choice(0, new Character(CodePoint.of('1')))));
    });

    it('must explore no further once a candidate consumes the whole input', () => {
      const accepts = vi.fn<(token: CodePoint) => boolean>(() => true);

      new Parser(new Alternation([digit, character('a mock', accepts)])).parse(
        input('1')
      );

      expect(accepts).not.toHaveBeenCalled();
    });

    it('must parse an expression that refers to itself', () => {
      const digits: Expression<CodePoint> = new Optional(
        new Concatenation([digit, new Reference(() => digits)])
      );

      expect(new Parser(digits).parse(input('12')).ok()).toBe(true);
    });

    it('must parse through a rule into a nonterminal of it', () => {
      const rule = { name: () => 'DIGIT' };

      expect(new Parser(new Rule(digit, () => rule)).parse(input('1'))).toEqual(
        new Success(new Nonterminal(rule, new Character(CodePoint.of('1'))))
      );
    });

    it('must report a rule that fails where it starts by its name', () => {
      const parsed = new Parser(
        new Concatenation([
          letter,
          new Rule(digit, () => ({ name: () => 'DIGIT' })),
        ])
      ).parse(input('ax'));

      assert(!parsed.ok());
      expect(String(parsed.error())).toBe("Expected DIGIT, got 'x'");
    });

    it('must report what a rule expects once it has started', () => {
      const parsed = new Parser(
        new Rule(new Concatenation([letter, digit]), () => ({
          name: () => 'PAIR',
        }))
      ).parse(input('ax'));

      assert(!parsed.ok());
      expect(String(parsed.error())).toBe("Expected a digit, got 'x'");
    });

    it('must not prune an alternative that starts with a reference', () => {
      const parsed = new Parser(
        new Alternation([letter, new Reference(() => digit)])
      ).parse(input('1'));

      expect(parsed.ok()).toBe(true);
    });

    it('must try an alternative that starts with any alternative of a nested alternation', () => {
      const parsed = new Parser(
        new Alternation([
          new Concatenation([
            new Alternation([
              new Concatenation([letter, letter]),
              new Concatenation([digit, letter]),
            ]),
            digit,
          ]),
          digit,
        ])
      ).parse(input('1a2'));

      expect(parsed.ok()).toBe(true);
    });

    it('must parse a single token through a reference to it', () => {
      expect(
        new Parser(
          new Concatenation([new Reference(() => digit), letter])
        ).parse(input('1a'))
      ).toEqual(
        new Success(
          new Sequence([
            new Character(CodePoint.of('1')),
            new Character(CodePoint.of('a')),
          ])
        )
      );
    });

    it('must parse a referenced expression once per point', () => {
      const accepts = vi.fn<(token: CodePoint) => boolean>(() => true);
      const counted = new Optional(character('a counted token', accepts));

      new Parser(
        new Alternation([
          new Concatenation([new Reference(() => counted), letter]),
          new Concatenation([new Reference(() => counted), digit]),
        ])
      ).parse(input('12'));

      expect(accepts).toHaveBeenCalledOnce();
    });

    it('must yield the first alternative that matches a single token', () => {
      expect(
        new Parser(
          new Alternation([letter, new Alternation([digit, digit])])
        ).parse(input('1'))
      ).toEqual(
        new Success(
          new Choice(1, new Choice(0, new Character(CodePoint.of('1'))))
        )
      );
    });

    it('must expect every alternative of a single token that matches none', () => {
      const parsed = new Parser(new Alternation([digit, letter])).parse(
        input('!')
      );

      assert(!parsed.ok());
      expect(String(parsed.error())).toBe(
        "Expected a digit or a letter, got '!'"
      );
    });

    it('must parse a single token through a sequence of it', () => {
      expect(new Parser(new Concatenation([digit])).parse(input('1'))).toEqual(
        new Success(new Sequence([new Character(CodePoint.of('1'))]))
      );
    });

    it('must report a single token by its label', () => {
      const parsed = new Parser(new Label(digit, new Named('a number'))).parse(
        input('x')
      );

      assert(!parsed.ok());
      expect(String(parsed.error())).toBe("Expected a number, got 'x'");
    });

    it('must expect a single token at the end of input', () => {
      const parsed = new Parser(digit).parse(input(''));

      assert(!parsed.ok());
      expect(String(parsed.error())).toBe('Expected a digit, got end of input');
    });

    it('must grow a left-recursive expression once per point', () => {
      const calls = (
        root: (chain: Expression<CodePoint>) => Expression<CodePoint>
      ) => {
        const accepts = vi.fn<(token: CodePoint) => boolean>(() => true);
        const counted = character('a counted token', accepts);
        const chain: Expression<CodePoint> = new Alternation([
          new Concatenation([new Reference(() => chain), counted]),
          counted,
        ]);

        new Parser(root(chain)).parse(input('11'));

        return accepts.mock.calls.length;
      };

      const once = calls(
        chain => new Concatenation([new Reference(() => chain), letter])
      );
      const twice = calls(
        chain =>
          new Alternation([
            new Concatenation([new Reference(() => chain), letter]),
            new Concatenation([new Reference(() => chain), digit]),
          ])
      );

      expect(twice).toBe(once);
    });

    it('must explore a candidate that starts with an alternation', () => {
      expect(
        new Parser(
          new Alternation([
            new Concatenation([new Alternation([letter, digit])]),
            digit,
          ])
        ).parse(input('1'))
      ).toEqual(
        new Success(
          new Choice(
            0,
            new Sequence([new Choice(1, new Character(CodePoint.of('1')))])
          )
        )
      );
    });

    it('must expect the end of input where a candidate stops short of it', () => {
      const parsed = new Parser(digit).parse(input('12'));

      assert(!parsed.ok());
      expect(String(parsed.error())).toBe("Expected end of input, got '2'");
    });

    it('must report the candidate that got furthest when none succeeds', () => {
      const parsed = new Parser(
        new Alternation([new Concatenation([digit, digit]), letter])
      ).parse(input('1x'));

      assert(!parsed.ok());
      expect(String(parsed.error())).toBe("Expected a digit, got 'x'");
      expect(parsed.error().offset()).toBe(1);
    });
  });
});
