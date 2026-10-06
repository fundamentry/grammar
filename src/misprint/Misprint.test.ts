import { describe, expect, it } from 'vitest';

import { Misprint } from './Misprint.js';

describe('Misprint', () => {
  describe('path', () => {
    it('must return the steps to where it occurred, outermost first', () => {
      const path = [
        { node: 'choice', index: 0 },
        { node: 'repetition', index: 2 },
      ] as const;

      expect(new Misprint(path, 'odd').path()).toEqual(path);
    });
  });

  describe('message', () => {
    it('must return what went wrong', () => {
      expect(new Misprint([], 'odd').message()).toBe('odd');
    });
  });

  describe('equals', () => {
    it('must equal a misprint with the same path and message', () => {
      expect(
        new Misprint([{ node: 'sequence', index: 1 }], 'odd').equals(
          new Misprint([{ node: 'sequence', index: 1 }], 'odd')
        )
      ).toBe(true);
    });

    it('must not equal a misprint at another index', () => {
      expect(
        new Misprint([{ node: 'sequence', index: 1 }], 'odd').equals(
          new Misprint([{ node: 'sequence', index: 2 }], 'odd')
        )
      ).toBe(false);
    });

    it('must not equal a misprint under another node', () => {
      expect(
        new Misprint([{ node: 'choice', index: 0 }], 'odd').equals(
          new Misprint([{ node: 'choice', index: 1 }], 'odd')
        )
      ).toBe(false);
    });

    it('must not equal a misprint with another message', () => {
      expect(new Misprint([], 'odd').equals(new Misprint([], 'even'))).toBe(
        false
      );
    });

    it('must not equal a value that is not a misprint', () => {
      expect(new Misprint([], 'odd').equals('odd')).toBe(false);
    });
  });

  describe('toString', () => {
    it('must render a misprint at the root as its message', () => {
      expect(String(new Misprint([], 'odd'))).toBe('odd');
    });

    it('must prefix a nested misprint with its path', () => {
      expect(
        String(
          new Misprint(
            [
              { node: 'sequence', index: 0 },
              { node: 'repetition', index: 2 },
              { node: 'option' },
            ],
            'odd'
          )
        )
      ).toBe('at /sequence[0]/repetition[2]/option: odd');
    });

    it('must render a rule in the path by its name', () => {
      expect(
        String(
          new Misprint(
            [{ node: 'rule', name: 'CRLF' }, { node: 'label' }],
            'odd'
          )
        )
      ).toBe('at /CRLF/label: odd');
    });
  });
});
