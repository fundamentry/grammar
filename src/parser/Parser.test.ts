import { describe, expect, it, vi } from 'vitest';

import { ParseError } from '#project/error';
import { type Lexer } from '#project/lexer';
import { Rule } from '#project/rule';

import { Parser } from './Parser.js';

interface Token<Type extends string = string> {
  type: Type;
  value: unknown;
}

const token = <Type extends string>(
  type: Type,
  value: unknown
): Token<Type> => ({ type, value });

const isType =
  <Type extends string>(type: Type) =>
  (candidate: unknown): candidate is Token<Type> =>
    typeof candidate === 'object' &&
    candidate !== null &&
    'type' in candidate &&
    candidate.type === type;

const expectParseError = (thrown: unknown, message: string) => {
  expect(thrown).toBeInstanceOf(ParseError);

  if (thrown instanceof ParseError) expect(thrown.message).toBe(message);
};

const parseAndCatch = <Source, Value, Element>(
  parser: Parser<Source, Value, Element>,
  source: Source
) => {
  try {
    return parser.parse(source);
  } catch (error) {
    return error;
  }
};

describe('Parser', () => {
  describe('parse', () => {
    it('must return the matched value when the grammar matches all tokens', () => {
      const lexer: Lexer<string, Token> = {
        tokenize: () => [token('NUMBER', 1)],
      };
      const rule = Rule.matching(isType('NUMBER')).map(match => match.value);
      const parser = new Parser(rule, lexer);

      expect(parser.parse('1')).toBe(1);
    });

    it('must combine multiple tokens according to the grammar', () => {
      const lexer: Lexer<string, Token> = {
        tokenize: () => [token('NUMBER', 1), token('STRING', 'a')],
      };
      const rule = Rule.sequence(
        Rule.matching(isType('NUMBER')),
        Rule.matching(isType('STRING'))
      ).map(([number, string]) => [number.value, string.value]);
      const parser = new Parser(rule, lexer);

      expect(parser.parse('1a')).toEqual([1, 'a']);
    });

    it('must call tokenize with the exact source exactly once', () => {
      const source = Symbol('source');
      const tokenize = vi.fn(() => []);
      const lexer: Lexer<symbol, Token> = { tokenize };
      const parser = new Parser(Rule.sequence(), lexer);

      parser.parse(source);

      expect(tokenize).toHaveBeenCalledOnce();
      expect(tokenize).toHaveBeenCalledWith(source);
    });

    it('must call derive on the rule exactly once', () => {
      const lexer: Lexer<string, Token> = {
        tokenize: () => [token('NUMBER', 1)],
      };
      const rule = Rule.matching(isType('NUMBER'));
      const derive = vi.spyOn(rule, 'derive');
      const parser = new Parser(rule, lexer);

      parser.parse('1');

      expect(derive).toHaveBeenCalledOnce();
    });

    it('must throw when the grammar does not match', () => {
      const lexer: Lexer<string, Token> = {
        tokenize: () => [token('STRING', 'a')],
      };
      const rule = Rule.matching(isType('NUMBER'));
      const parser = new Parser(rule, lexer);

      expectParseError(
        parseAndCatch(parser, 'a'),
        'Input does not match the expected grammar'
      );
    });

    it('must throw when the grammar matches only a prefix of the tokens', () => {
      const lexer: Lexer<string, Token> = {
        tokenize: () => [token('NUMBER', 1), token('NUMBER', 2)],
      };
      const rule = Rule.matching(isType('NUMBER'));
      const parser = new Parser(rule, lexer);

      expectParseError(
        parseAndCatch(parser, '1 2'),
        'Unexpected trailing input'
      );
    });

    it('must succeed on an empty token stream when the rule accepts zero tokens', () => {
      const lexer: Lexer<string, Token> = { tokenize: () => [] };
      const rule = Rule.sequence().map(() => 'empty');
      const parser = new Parser(rule, lexer);

      expect(parser.parse('')).toBe('empty');
    });

    it('must throw "does not match" on an empty token stream when the rule requires at least one token', () => {
      const lexer: Lexer<string, Token> = { tokenize: () => [] };
      const rule = Rule.matching(isType('NUMBER'));
      const parser = new Parser(rule, lexer);

      expectParseError(
        parseAndCatch(parser, ''),
        'Input does not match the expected grammar'
      );
    });

    it('must propagate an error thrown by the rule without wrapping it', () => {
      const error = new Error('boom');
      const lexer: Lexer<string, Token> = {
        tokenize: () => [token('NUMBER', 1)],
      };
      const rule = new Rule(() => {
        throw error;
      });
      const parser = new Parser(rule, lexer);

      expect(parseAndCatch(parser, '1')).toBe(error);
    });

    it('must propagate an error thrown by the lexer without wrapping it', () => {
      const error = new Error('boom');
      const lexer: Lexer<string, Token> = {
        tokenize: () => {
          throw error;
        },
      };
      const rule = Rule.matching(isType('NUMBER'));
      const parser = new Parser(rule, lexer);

      expect(parseAndCatch(parser, '1')).toBe(error);
    });

    it('must work with a non-string Source type', () => {
      const lexer: Lexer<readonly number[], Token> = {
        tokenize: source => source.map(value => token('NUMBER', value)),
      };
      const rule = Rule.matching(isType('NUMBER')).map(match => match.value);
      const parser = new Parser(rule, lexer);

      expect(parser.parse([42])).toBe(42);
    });

    it('must return the exact value produced by the rule', () => {
      const value = Symbol('value');
      const lexer: Lexer<string, Token> = {
        tokenize: () => [token('NUMBER', 1)],
      };
      const rule = Rule.matching(isType('NUMBER')).map(() => value);
      const parser = new Parser(rule, lexer);

      expect(parser.parse('1')).toBe(value);
    });

    it('must return undefined when it is the value the rule legitimately produces', () => {
      const lexer: Lexer<string, Token> = { tokenize: () => [] };
      const rule = Rule.matching(isType('NUMBER')).optional();
      const parser = new Parser(rule, lexer);

      expect(parser.parse('')).toBeUndefined();
    });

    it('must be reusable across multiple parse calls', () => {
      const lexer: Lexer<number, Token> = {
        tokenize: value => [token('NUMBER', value)],
      };
      const rule = Rule.matching(isType('NUMBER')).map(match => match.value);
      const parser = new Parser(rule, lexer);

      expect(parser.parse(1)).toBe(1);
      expect(parser.parse(2)).toBe(2);
    });

    it('must work when Elements are plain primitive values rather than structured objects', () => {
      const isDigit = (value: unknown): value is string =>
        typeof value === 'string' && /^[0-9]$/.test(value);
      const lexer: Lexer<string, string> = {
        tokenize: source => source.split(''),
      };
      const rule = Rule.matching(isDigit)
        .many()
        .map(digits => Number(digits.join('')));
      const parser = new Parser(rule, lexer);

      expect(parser.parse('42')).toBe(42);
    });
  });
});
