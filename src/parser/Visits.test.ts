import { describe, expect, it } from 'vitest';

import { Visits } from './Visits.js';

describe('Visits', () => {
  describe('visit', () => {
    it('must report the first visit of a key', () => {
      expect(new Visits<string>().visit('a')).toBe(true);
    });

    it('must not report a repeated visit of a key as the first', () => {
      const visits = new Visits<string>();

      visits.visit('a');

      expect(visits.visit('a')).toBe(false);
    });

    it('must track keys independently', () => {
      const visits = new Visits<string>();

      visits.visit('a');

      expect(visits.visit('b')).toBe(true);
    });
  });
});
