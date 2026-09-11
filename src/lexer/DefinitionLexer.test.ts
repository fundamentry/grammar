import { describe, expect, it, vi } from 'vitest';

import { UnknownTokenDefinitionError } from '#project/error';
import { Token } from '#project/token';

import { DefinitionLexer } from './DefinitionLexer.js';

class TestToken extends Token {}

const definitionFor = (
  type: string,
  test: (element: string) => boolean = element => element === type
): Token.Definition<string, TestToken> => ({
  test,
  create: element => new TestToken(type, element, element),
});

describe('DefinitionLexer', () => {
  describe('tokenize', () => {
    it('must yield a token created by the matching definition for each element', () => {
      const lexer = new DefinitionLexer([
        definitionFor('a'),
        definitionFor('b'),
      ]);

      const tokens = Array.from(lexer.tokenize(['a', 'b']));

      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toBeInstanceOf(TestToken);
      expect(tokens[0]?.type()).toBe('a');
      expect(tokens[1]?.type()).toBe('b');
    });

    it('must call test and create with the element being tokenized', () => {
      const test = vi.fn(() => true);
      const create = vi.fn(
        (element: string) => new TestToken('a', element, element)
      );
      const lexer = new DefinitionLexer([{ test, create }]);

      Array.from(lexer.tokenize(['a']));

      expect(test).toHaveBeenCalledWith('a');
      expect(create).toHaveBeenCalledWith('a');
    });

    it('must use the first definition that matches, ignoring later ones', () => {
      const first = definitionFor('first', () => true);
      const second = definitionFor('second', () => true);
      const lexer = new DefinitionLexer([first, second]);

      const tokens = Array.from(lexer.tokenize(['x']));

      expect(tokens[0]?.type()).toBe('first');
    });

    it('must throw an UnknownTokenDefinitionError when no definition matches', () => {
      const lexer = new DefinitionLexer([definitionFor('a')]);

      expect(() => Array.from(lexer.tokenize(['z']))).toThrow(
        UnknownTokenDefinitionError
      );
    });

    it('must include the unrecognized element on the thrown error', () => {
      const lexer = new DefinitionLexer([definitionFor('a')]);

      let thrown: unknown;

      try {
        Array.from(lexer.tokenize(['a', 'z']));
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(UnknownTokenDefinitionError);
      expect((thrown as UnknownTokenDefinitionError).element()).toBe('z');
    });

    it('must not throw until the unrecognized element is actually reached', () => {
      const lexer = new DefinitionLexer([definitionFor('a')]);
      const iterator = lexer.tokenize(['a', 'z'])[Symbol.iterator]();

      const first = iterator.next();
      const token = first.value as Token;

      expect(first.done).toBe(false);
      expect(token.type()).toBe('a');
      expect(() => iterator.next()).toThrow(UnknownTokenDefinitionError);
    });

    it('must work with a Source that is neither an array nor a string', () => {
      const lexer = new DefinitionLexer([
        definitionFor('a'),
        definitionFor('b'),
      ]);

      const tokens = Array.from(lexer.tokenize(new Set(['a', 'b'])));

      expect(tokens.map(token => token.type())).toEqual(['a', 'b']);
    });

    it('must iterate the source directly when it is a string', () => {
      const lexer = new DefinitionLexer([
        definitionFor('a'),
        definitionFor('b'),
      ]);

      const tokens = Array.from(lexer.tokenize('ab'));

      expect(tokens.map(token => token.type())).toEqual(['a', 'b']);
    });

    it('must return an empty iterable when the source yields no elements', () => {
      const lexer = new DefinitionLexer([definitionFor('a')]);

      expect(Array.from(lexer.tokenize(''))).toEqual([]);
    });
  });
});
