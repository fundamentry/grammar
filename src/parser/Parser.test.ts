import { assert, describe, expect, it, vi } from 'vitest';

import { PartialIso } from '@fundamentry/category';
import { Failure, Left, Success } from '@fundamentry/coproduct';
import { CodePoint } from '@fundamentry/scalar';
import { Point } from '@fundamentry/stream';

import { Named } from '#project/expectation';
import {
  Alternation,
  Concatenation,
  type Expression,
  Optional,
  Reference,
  Rule,
  Terminal,
} from '#project/expression';
import { Choice, Literal } from '#project/tree';

import { Parser } from './Parser.js';

const character = (name: string, accepts: (codePoint: CodePoint) => boolean) =>
  new Terminal(
    PartialIso.of<CodePoint, Literal, string, string>(
      token =>
        accepts(token)
          ? new Success(new Literal(token))
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
      ).toEqual(
        new Success(new Choice(new Left(new Literal(CodePoint.of('1')))))
      );
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

    it('must parse through a rule', () => {
      expect(new Parser(new Rule(digit, 'DIGIT')).parse(input('1'))).toEqual(
        new Success(new Literal(CodePoint.of('1')))
      );
    });

    it('must not prune an alternative that starts with a reference', () => {
      const parsed = new Parser(
        new Alternation([letter, new Reference(() => digit)])
      ).parse(input('1'));

      expect(parsed.ok()).toBe(true);
    });

    it('must parse a referenced expression once per point', () => {
      const accepts = vi.fn<(token: CodePoint) => boolean>(() => true);
      const counted = character('a counted token', accepts);

      new Parser(
        new Alternation([
          new Concatenation([new Reference(() => counted), letter]),
          new Concatenation([new Reference(() => counted), digit]),
        ])
      ).parse(input('12'));

      expect(accepts).toHaveBeenCalledOnce();
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

    it('must expect the end of input where a candidate stops short of it', () => {
      const parsed = new Parser(digit).parse(input('12'));

      assert(!parsed.ok());
      expect(String(parsed.error())).toBe("Expected end of input, got '2'");
    });

    it('must report the candidate that got furthest when none succeeds', () => {
      const start = input('1x');
      const parsed = new Parser(
        new Alternation([new Concatenation([digit, digit]), letter])
      ).parse(start);

      assert(!parsed.ok());
      expect(String(parsed.error())).toBe("Expected a digit, got 'x'");
      expect(parsed.error().at().distanceFrom(start)).toBe(1);
    });
  });
});
