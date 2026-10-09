import { describe, expect, it } from 'vitest';

import { CodePoint } from '@fundamentry/scalar';

import { Character } from '#project/tree';

import { Slots } from './Slots.js';

describe('Slots', () => {
  describe('edit', () => {
    it('must keep a slot whose created value equals its initial one', () => {
      const a = new Character(CodePoint.of('a'));

      expect(Slots.edit.keeps(a, new Character(CodePoint.of('a')))).toBe(true);
    });

    it('must not keep a slot whose created value differs', () => {
      expect(
        Slots.edit.keeps(
          new Character(CodePoint.of('b')),
          new Character(CodePoint.of('a'))
        )
      ).toBe(false);
    });
  });

  describe('fill', () => {
    it('must not keep a slot, even when its created value equals its initial one', () => {
      const a = new Character(CodePoint.of('a'));

      expect(Slots.fill.keeps(a, a)).toBe(false);
    });
  });
});
