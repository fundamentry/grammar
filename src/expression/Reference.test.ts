import { describe, expect, it, vi } from 'vitest';

import { PartialIso } from '@fundamentry/category';

import { Named } from '#project/expectation';
import { type Literal } from '#project/tree';

import { type Expression } from './Expression.js';
import { Reference } from './Reference.js';
import { Terminal } from './Terminal.js';

describe('Reference', () => {
  describe('target', () => {
    const element = new Terminal(PartialIso.id<Literal>(), new Named('a'));

    it('must define its target once, however often it is asked for it', () => {
      const define = vi.fn(() => element);
      const reference = new Reference(define);

      expect(reference.target()).toBe(element);
      expect(reference.target()).toBe(element);
      expect(define).toHaveBeenCalledOnce();
    });
  });

  describe('accept', () => {
    const visitor = new Proxy(
      {} as Expression.Visitor<Literal, string, readonly unknown[]>,
      {
        get:
          (_, method) =>
          (...args: unknown[]) => [method, ...args],
      }
    );

    const resolving = new Proxy(
      {} as Expression.Visitor<Literal, string, readonly unknown[]>,
      {
        get:
          (_, method) => (target: () => Expression<Literal>, input: string) => [
            method,
            target(),
            input,
          ],
      }
    );

    const element = new Terminal(PartialIso.id<Literal>(), new Named('a'));

    it('must visit as a reference with a way to its target and the input', () => {
      const input = 'input';

      expect(new Reference(() => element).accept(resolving, input)).toEqual([
        'reference',
        element,
        input,
      ]);
    });

    it('must define its target once, however often it is resolved', () => {
      const define = vi.fn(() => element);
      const reference = new Reference(define);

      reference.accept(resolving, 'input');
      reference.accept(resolving, 'input');

      expect(define).toHaveBeenCalledOnce();
    });

    it('must not define its target before it is resolved', () => {
      const define = vi.fn(() => element);

      new Reference(define).accept(visitor, 'input');

      expect(define).not.toHaveBeenCalled();
    });
  });
});
