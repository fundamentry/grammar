import { describe, expect, it, vi } from 'vitest';

import { Matched } from './Matched.js';
import { type Recognition } from './Recognition.js';

describe('Matched', () => {
  const value = Symbol('value');

  describe('match', () => {
    it('must return true', () => {
      expect(new Matched(value).match()).toBe(true);
    });
  });

  describe('value', () => {
    it('must return the value passed to the constructor', () => {
      expect(new Matched(value).value()).toBe(value);
    });
  });

  describe('map', () => {
    it('must call the mapper with the value and wrap the result in a new Matched', () => {
      const mapped = Symbol('mapped');
      const mapper = vi.fn(() => mapped);
      const matched = new Matched(value);

      const result = matched.map(mapper);

      expect(mapper).toHaveBeenCalledOnce();
      expect(mapper).toHaveBeenCalledWith(value);
      expect(result).toBeInstanceOf(Matched);
      expect(result.value()).toBe(mapped);
    });
  });

  describe('orElse', () => {
    it('must return itself unchanged', () => {
      const matched = new Matched(value);

      expect(matched.orElse()).toBe(matched);
    });

    it('must not call a fallback passed through the wider Recognition contract', () => {
      const matched = new Matched(value);
      const recognition: Recognition = matched;
      const fallback = vi.fn();

      const result = recognition.orElse(fallback);

      expect(fallback).not.toHaveBeenCalled();
      expect(result).toBe(matched);
    });
  });
});
