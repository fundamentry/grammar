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

const digits = new Writer(text =>
  /^[0-9]$/u.test(text)
    ? new Success(character(text))
    : new Failure(new Mismatch(0, [new Named('a digit')], `'${text}'`))
);

describe('Writer', () => {
  describe('write', () => {
    it('must parse the new text of every place and put it there', () => {
      const written = digits.write(places('12'), text =>
        String(Number(text) + 1)
      );

      assert(written.ok());
      expect(String(written.value())).toBe('23');
    });

    it('must report the first text that does not parse', () => {
      const written = digits.write(places('12'), text =>
        text === '1' ? 'x' : 'y'
      );

      assert(!written.ok());
      expect(String(written.error())).toBe("Expected a digit, got 'x'");
    });

    it('must hand the update the text of every place', () => {
      const seen: string[] = [];

      digits.write(places('12'), text => {
        seen.push(text);

        return text;
      });

      expect(seen).toEqual(['1', '2']);
    });
  });
});
