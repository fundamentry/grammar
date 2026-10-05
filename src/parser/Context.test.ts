import { assert, describe, expect, it } from 'vitest';

import { Success } from '@fundamentry/coproduct';
import { Point } from '@fundamentry/stream';

import { EndOfInput, Named } from '#project/expectation';
import { Mismatch } from '#project/mismatch';
import { type Node, Option } from '#project/tree';

import { Context } from './Context.js';
import { type Parser } from './Parser.js';

const start = Point.of('ab');

const second = start.step()?.rest ?? start;

const end = second.step()?.rest ?? second;

const past: Parser.Parse<string> = (point, context, continuation) => {
  const step = point.step();

  if (step)
    context.succeed(continuation, { value: new Option(), rest: step.rest });
};

describe('Context', () => {
  describe('run', () => {
    it('must yield the first parse that reaches the end of the input', () => {
      const whole: Parser.Parse<string> = (_, context, continuation) =>
        context.succeed(continuation, { value: new Option(), rest: end });

      expect(Context.run(start, whole)).toEqual(new Success(new Option()));
    });

    it('must expect the end of the input where a parse stops short of it', () => {
      const parsed = Context.run(start, past);

      assert(!parsed.ok());
      expect(parsed.error()).toEqual(
        Mismatch.expected(second, new EndOfInput())
      );
    });

    it('must stop once a parse reaches the end of the input', () => {
      const tried: string[] = [];
      const parse: Parser.Parse<string> = (_, context, continuation) => {
        context.schedule(() => tried.push('later'));
        context.succeed(continuation, { value: new Option(), rest: end });
      };

      Context.run(start, parse);

      expect(tried).toEqual([]);
    });
  });

  describe('succeed', () => {
    it('must hand steps to the continuation in order', () => {
      const ends: number[] = [];

      Context.run(start, (_, context) =>
        context.succeed(
          {
            succeed: step => ends.push(step.rest.distanceFrom(start)),
          },
          { value: new Option(), rest: second },
          { value: new Option(), rest: end }
        )
      );

      expect(ends).toEqual([1, 2]);
    });
  });

  describe('fail', () => {
    const failure = (
      mismatch: Mismatch<string>,
      label?: Parser.Label<string>
    ) => {
      const parsed = Context.run(start, (_, context) =>
        context.fail(mismatch, label)
      );

      assert(!parsed.ok());

      return parsed.error();
    };

    it('must report the furthest failure', () => {
      const parsed = Context.run(start, (_, context) => {
        context.fail(Mismatch.expected(second, new Named('b')));
        context.fail(Mismatch.expected(start, new Named('a')));
      });

      assert(!parsed.ok());
      expect(parsed.error()).toEqual(Mismatch.expected(second, new Named('b')));
    });

    it('must relabel a failure where its label starts', () => {
      expect(
        failure(Mismatch.expected(second, new Named('b')), {
          start: second,
          expectation: new Named('a label'),
        })
      ).toEqual(Mismatch.expected(second, new Named('a label')));
    });

    it('must not relabel a failure past where its label starts', () => {
      expect(
        failure(Mismatch.expected(second, new Named('b')), {
          start,
          expectation: new Named('a label'),
        })
      ).toEqual(Mismatch.expected(second, new Named('b')));
    });
  });

  describe('each', () => {
    it('must visit each item only after the work for the previous one is done', () => {
      const events: string[] = [];

      Context.run(start, (_, context) =>
        context.each(['a', 'b'].values(), item => {
          events.push(`visit ${item}`);
          context.schedule(() => events.push(`work for ${item}`));
        })
      );

      expect(events).toEqual([
        'visit a',
        'work for a',
        'visit b',
        'work for b',
      ]);
    });
  });

  describe('grow', () => {
    const steps = (parse: Parser.Parse<string>, point = start) => {
      const ends: number[] = [];

      Context.run(start, (_, context) =>
        context.grow(parse, point, {
          succeed: (step: Point.Step<string, Node>) =>
            ends.push(step.rest.distanceFrom(start)),
        })
      );

      return ends;
    };

    it('must hand on what a rule that does not refer back to itself parses', () => {
      expect(steps(past)).toEqual([1]);
    });

    it('must grow a rule that refers back to itself where it started, longest first', () => {
      const letters: Parser.Parse<string> = (point, context, continuation) => {
        past(point, context, continuation);
        context.grow(letters, point, {
          label: continuation.label,
          succeed: ({ rest }) => past(rest, context, continuation),
        });
      };

      expect(steps(letters)).toEqual([2, 1]);
    });

    it('must grow a rule separately at each point it starts from', () => {
      expect(steps(past, second)).toEqual([2]);
    });
  });
});
