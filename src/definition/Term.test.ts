import { describe, expect, it } from 'vitest';

import { Range } from '@fundamentry/range';
import { Integer } from '@fundamentry/scalar';

import { Term } from './Term.js';

describe('Term', () => {
  describe('element', () => {
    it('must render its text', () => {
      expect(String(Term.element('DIGIT'))).toBe('DIGIT');
    });
  });

  describe('concatenation', () => {
    it('must render nothing as an empty string', () => {
      expect(String(Term.concatenation())).toBe('""');
    });

    it('must render a single term as itself', () => {
      const term = Term.alternation(Term.element('a'), Term.element('b'));

      expect(Term.concatenation(term)).toBe(term);
    });

    it('must separate terms with spaces, grouping alternations', () => {
      expect(
        String(
          Term.concatenation(
            Term.element('a'),
            Term.alternation(Term.element('b'), Term.element('c'))
          )
        )
      ).toBe('a (b / c)');
    });
  });

  describe('alternation', () => {
    it('must render a single term as itself', () => {
      const term = Term.element('a');

      expect(Term.alternation(term)).toBe(term);
    });

    it('must separate terms with slashes, without grouping concatenations', () => {
      expect(
        String(
          Term.alternation(
            Term.concatenation(Term.element('a'), Term.element('b')),
            Term.element('c')
          )
        )
      ).toBe('a b / c');
    });
  });

  describe('optional', () => {
    it('must bracket the term without grouping it', () => {
      expect(
        String(
          Term.alternation(Term.element('a'), Term.element('b')).optional()
        )
      ).toBe('[a / b]');
    });
  });

  describe('repeated', () => {
    it.each([
      ['*a', Range.atLeast(Integer.of(0))],
      ['1*a', Range.atLeast(Integer.of(1))],
      ['*3a', Range.atMost(Integer.of(3))],
      ['2*3a', Range.closed(Integer.of(2), Integer.of(3))],
      ['3a', Range.singleton(Integer.of(3))],
      ['0a', Range.singleton(Integer.of(0))],
      ['2*4a', Range.open(Integer.of(1), Integer.of(5))],
    ])('must prefix the repetition with %s for %s', (rendered, bounds) => {
      expect(String(Term.element('a').repeated(bounds))).toBe(rendered);
    });

    it('must group a term that is not an element', () => {
      expect(
        String(
          Term.concatenation(Term.element('a'), Term.element('b')).repeated(
            Range.atLeast(Integer.of(0))
          )
        )
      ).toBe('*(a b)');
    });
  });

  describe('within', () => {
    it('must not group a term that binds at least as tightly', () => {
      expect(
        Term.concatenation(Term.element('a'), Term.element('b')).within(
          'alternation'
        )
      ).toBe('a b');
    });

    it('must group a term that binds more loosely', () => {
      expect(
        Term.alternation(Term.element('a'), Term.element('b')).within(
          'concatenation'
        )
      ).toBe('(a / b)');
    });
  });

  describe('equals', () => {
    it('must equal a term with the same text and precedence', () => {
      expect(Term.element('a').equals(Term.element('a'))).toBe(true);
    });

    it('must not equal a term with other text', () => {
      expect(Term.element('a').equals(Term.element('b'))).toBe(false);
    });

    it('must not equal a term with the same text but another precedence', () => {
      expect(
        Term.element('a b').equals(
          Term.concatenation(Term.element('a'), Term.element('b'))
        )
      ).toBe(false);
    });

    it('must not equal a value that is not a term', () => {
      expect(Term.element('a').equals('a')).toBe(false);
    });
  });
});
