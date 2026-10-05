import { describe, expect, it } from 'vitest';

import { Misprint } from './Misprint.js';

describe('Misprint', () => {
  describe('of', () => {
    it('must say its message at the root of the value', () => {
      const misprint = Misprint.of('odd');

      expect(misprint.path()).toEqual([]);
      expect(misprint.message()).toBe('odd');
    });
  });

  describe('within', () => {
    it('must place the misprint under each enclosing step, outermost first', () => {
      const misprint = Misprint.of('odd')
        .within({ node: 'repetition', index: 2 })
        .within({ node: 'left' });

      expect(misprint.path()).toEqual([
        { node: 'left' },
        { node: 'repetition', index: 2 },
      ]);
      expect(misprint.message()).toBe('odd');
    });
  });

  describe('equals', () => {
    it('must equal a misprint with the same path and message', () => {
      expect(
        Misprint.of('odd')
          .within({ node: 'sequence', index: 1 })
          .equals(Misprint.of('odd').within({ node: 'sequence', index: 1 }))
      ).toBe(true);
    });

    it('must not equal a misprint at another index', () => {
      expect(
        Misprint.of('odd')
          .within({ node: 'sequence', index: 1 })
          .equals(Misprint.of('odd').within({ node: 'sequence', index: 2 }))
      ).toBe(false);
    });

    it('must not equal a misprint under another node', () => {
      expect(
        Misprint.of('odd')
          .within({ node: 'left' })
          .equals(Misprint.of('odd').within({ node: 'right' }))
      ).toBe(false);
    });

    it('must not equal a misprint with another message', () => {
      expect(Misprint.of('odd').equals(Misprint.of('even'))).toBe(false);
    });

    it('must not equal a value that is not a misprint', () => {
      expect(Misprint.of('odd').equals('odd')).toBe(false);
    });
  });

  describe('toString', () => {
    it('must render a misprint at the root as its message', () => {
      expect(String(Misprint.of('odd'))).toBe('odd');
    });

    it('must prefix a nested misprint with its path', () => {
      expect(
        String(
          Misprint.of('odd')
            .within({ node: 'option' })
            .within({ node: 'repetition', index: 2 })
            .within({ node: 'sequence', index: 0 })
        )
      ).toBe('at /sequence[0]/repetition[2]/option: odd');
    });

    it('must render a rule in the path by its name', () => {
      expect(
        String(
          Misprint.of('odd')
            .within({ node: 'refinement' })
            .within({ node: 'rule', name: 'CRLF' })
        )
      ).toBe('at /CRLF/refinement: odd');
    });
  });
});
