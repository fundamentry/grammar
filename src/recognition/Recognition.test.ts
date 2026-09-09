import { describe, expect, it, vi } from 'vitest';

import { Matched } from './Matched.js';
import { Recognition } from './Recognition.js';
import { Unmatched } from './Unmatched.js';

describe('Recognition', () => {
  describe('attempt', () => {
    const context = Symbol('context');

    it('must call production once and return its result without calling cleanup when matched', () => {
      const matched = new Matched(Symbol('value'));
      const production = vi.fn(() => matched);
      const cleanup = vi.fn();

      const recognition = Recognition.attempt(production, context, cleanup);

      expect(production).toHaveBeenCalledOnce();
      expect(recognition).toBe(matched);
      expect(cleanup).not.toHaveBeenCalled();
    });

    it('must call production once, call cleanup with the context exactly once, and return the result when unmatched', () => {
      const unmatched = new Unmatched();
      const production = vi.fn(() => unmatched);
      const cleanup = vi.fn();

      const recognition = Recognition.attempt(production, context, cleanup);

      expect(production).toHaveBeenCalledOnce();
      expect(cleanup).toHaveBeenCalledOnce();
      expect(cleanup).toHaveBeenCalledWith(context);
      expect(recognition).toBe(unmatched);
    });

    it('must call cleanup with the context exactly once and rethrow the exact error when production throws', () => {
      const error = new Error('boom');
      const production = vi.fn(() => {
        throw error;
      });
      const cleanup = vi.fn();
      let thrown: unknown;

      try {
        Recognition.attempt(production, context, cleanup);
      } catch (caught) {
        thrown = caught;
      }

      expect(production).toHaveBeenCalledOnce();
      expect(thrown).toBe(error);
      expect(cleanup).toHaveBeenCalledOnce();
      expect(cleanup).toHaveBeenCalledWith(context);
    });

    it('must return the result without a cleanup callback when unmatched', () => {
      const unmatched = new Unmatched();

      const recognition = Recognition.attempt(() => unmatched, 'context');

      expect(recognition).toBe(unmatched);
    });

    it('must rethrow the exact error without a cleanup callback when production throws', () => {
      const error = new Error('boom');
      let thrown: unknown;

      try {
        Recognition.attempt(() => {
          throw error;
        }, 'context');
      } catch (caught) {
        thrown = caught;
      }

      expect(thrown).toBe(error);
    });
  });
});
