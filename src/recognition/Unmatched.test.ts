import { describe, expect, it, vi } from 'vitest';

import { Matched } from './Matched.js';
import { type Recognition } from './Recognition.js';
import { Unmatched } from './Unmatched.js';

describe('Unmatched', () => {
  describe('match', () => {
    it('must return false', () => {
      expect(new Unmatched().match()).toBe(false);
    });
  });

  describe('map', () => {
    it('must return itself unchanged', () => {
      const unmatched = new Unmatched();

      expect(unmatched.map()).toBe(unmatched);
    });

    it('must not call a mapper passed through the wider Recognition contract', () => {
      const unmatched = new Unmatched();
      const recognition: Recognition = unmatched;
      const mapper = vi.fn();

      const result = recognition.map(mapper);

      expect(mapper).not.toHaveBeenCalled();
      expect(result).toBe(unmatched);
    });
  });

  describe('orElse', () => {
    it('must call the fallback and wrap the result in a new Matched', () => {
      const value = Symbol('fallback');
      const fallback = vi.fn(() => value);
      const unmatched = new Unmatched();

      const result = unmatched.orElse(fallback);

      expect(fallback).toHaveBeenCalledOnce();
      expect(result).toBeInstanceOf(Matched);
      expect(result.value()).toBe(value);
    });
  });
});
