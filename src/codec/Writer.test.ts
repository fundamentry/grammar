import { assert, describe, expect, it } from 'vitest';

import { Failure, Success } from '@fundamentry/coproduct';
import { CodePoint } from '@fundamentry/scalar';

import { Named } from '#project/expectation';
import { Mismatch } from '#project/mismatch';
import { Character, Focus, type Node, Sequence } from '#project/tree';

import { Writer } from './Writer.js';

const character = (text: string) => new Character(CodePoint.of(text));

const places = (text: string) =>
  Focus.of(
    new Sequence(Array.from(text, character)),
    (node): node is Node => node instanceof Character
  );

const digits = (update: (text: string) => string) =>
  new Writer(node => {
    const text = update(String(node));

    return /^[0-9]$/u.test(text)
      ? new Success(character(text))
      : new Failure(new Mismatch(0, [new Named('a digit')], `'${text}'`));
  });

describe('Writer', () => {
  describe('write', () => {
    it('must parse the new text of every place and put it there', () => {
      const written = digits(text => String(Number(text) + 1)).write(
        places('12')
      );

      assert(written.ok());
      expect(String(written.value())).toBe('23');
    });

    it('must report the first text that does not parse', () => {
      const written = digits(text => (text === '1' ? 'x' : 'y')).write(
        places('12')
      );

      assert(!written.ok());
      expect(String(written.error())).toBe("Expected a digit, got 'x'");
    });

    it('must hand the rewrite every place', () => {
      const seen: string[] = [];

      new Writer(node => {
        seen.push(String(node));

        return new Success(node);
      }).write(places('12'));

      expect(seen).toEqual(['1', '2']);
    });
  });
});
