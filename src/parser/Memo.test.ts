import { assert, describe, expect, it } from 'vitest';

import { Point } from '@fundamentry/stream';

import { Named } from '#project/expectation';
import { Mismatch } from '#project/mismatch';
import { type Node, Option } from '#project/tree';

import { Context } from './Context.js';
import { Continuation } from './Continuation.js';
import { Memo } from './Memo.js';

const start = Point.of('ab');

const second = start.step()?.rest ?? start;

const collect = (found: Point.Step<string, Node>[]) =>
  Continuation.of((step: Point.Step<string, Node>) => found.push(step));

describe('Memo', () => {
  describe('attend', () => {
    it('must hand on matches to a caller that comes while filling, once filled', () => {
      const events: string[] = [];

      Context.run(start, (_, context) => {
        const memo = new Memo(context, start);

        memo.fill(continuation =>
          context.schedule(() => {
            events.push('filled');
            continuation.succeed({ value: new Option(), rest: second });
          })
        );
        memo.attend(Continuation.of(() => events.push('match')));
      });

      expect(events).toEqual(['filled', 'match']);
    });

    it('must hand on matches to a caller that comes once filled', () => {
      const found: Point.Step<string, Node>[] = [];
      const step = { value: new Option(), rest: second };

      Context.run(start, (_, context) => {
        const memo = new Memo(context, start);

        context.schedule(() => memo.attend(collect(found)));
        memo.fill(continuation => context.succeed(continuation, [step]));
      });

      expect(found).toEqual([step]);
    });

    const failure = (
      mismatches: readonly Mismatch<string>[],
      caller = Continuation.of<string>(() => undefined)
    ) => {
      const parsed = Context.run(start, (_, context) => {
        const memo = new Memo(context, start);

        memo.fill(() => mismatches.forEach(mismatch => context.fail(mismatch)));
        memo.attend(caller);
      });

      assert(!parsed.ok());

      return parsed.error();
    };

    it('must hand on what failed while filling', () => {
      expect(failure([Mismatch.expected(second, new Named('b'))])).toEqual(
        Mismatch.expected(second, new Named('b'))
      );
    });

    it('must hand on nothing where nothing failed', () => {
      expect(
        failure(
          [],
          Continuation.of<string>(() => undefined).labelled(
            start,
            new Named('a label')
          )
        )
      ).toEqual(Mismatch.empty(start));
    });

    it('must relabel a failure where the label of its caller starts', () => {
      expect(
        failure(
          [Mismatch.expected(start, new Named('a'))],
          Continuation.of<string>(() => undefined).labelled(
            start,
            new Named('a label')
          )
        )
      ).toEqual(Mismatch.expected(start, new Named('a label')));
    });
  });
});
