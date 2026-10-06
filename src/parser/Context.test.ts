import { assert, describe, expect, it, vi } from 'vitest';

import { Success } from '@fundamentry/coproduct';
import { Point } from '@fundamentry/stream';

import { Named } from '#project/expectation';
import { Concatenation } from '#project/expression';
import { type Node, Option, Repetition } from '#project/tree';

import { type Column } from './Column.js';
import { Context } from './Context.js';
import { Continuation } from './Continuation.js';
import { Failures } from './Failures.js';
import { Frontier } from './Frontier.js';
import { type Parser } from './Parser.js';

const start = Point.of('ab');

const second = start.step()?.rest ?? start;

const end = second.step()?.rest ?? second;

const past: Parser.Parse<string> = (point, context, continuation) => {
  const step = point.step();

  if (step)
    context.succeed(continuation, [{ value: new Option(), rest: step.rest }]);
};

const rule = (
  parse: Parser.Parse<string>,
  grows = false
): Column.Rule<string> => {
  const expression = new Concatenation<string>([]);

  return {
    expression,
    parse,
    corners: grows ? new Set([expression]) : new Set(),
  };
};

describe('Context', () => {
  describe('run', () => {
    it('must yield the first parse that succeeds', () => {
      const whole: Parser.Parse<string> = (_, context, continuation) =>
        context.succeed(continuation, [{ value: new Option(), rest: end }]);

      expect(Context.run(start, whole)).toEqual(new Success(new Option()));
    });

    it('must keep the first of the parses that succeed at once', () => {
      const twice: Parser.Parse<string> = (_, context, continuation) =>
        context.schedule(() => {
          continuation.succeed({ value: new Option(), rest: end });
          continuation.succeed({ value: new Repetition([]), rest: end });
        });

      expect(Context.run(start, twice)).toEqual(new Success(new Option()));
    });

    it('must stop once a parse succeeds', () => {
      const tried: string[] = [];
      const parse: Parser.Parse<string> = (_, context, continuation) => {
        context.schedule(() => tried.push('later'));
        context.succeed(continuation, [{ value: new Option(), rest: end }]);
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
          Continuation.of(step => ends.push(step.rest.distanceFrom(start))),
          [
            { value: new Option(), rest: second },
            { value: new Option(), rest: end },
          ]
        )
      );

      expect(ends).toEqual([1, 2]);
    });

    it('must finish the work for a step before handing on the next', () => {
      const events: string[] = [];

      Context.run(start, (_, context) =>
        context.succeed(
          Continuation.of(step => {
            const at = String(step.rest.distanceFrom(start));

            events.push(`step ${at}`);
            context.schedule(() => events.push(`work for ${at}`));
          }),
          [
            { value: new Option(), rest: second },
            { value: new Option(), rest: end },
          ]
        )
      );

      expect(events).toEqual(['step 1', 'work for 1', 'step 2', 'work for 2']);
    });

    it('must hand on more steps than a call can take arguments', () => {
      const steps = Array.from({ length: 300_000 }, () => ({
        value: new Option(),
        rest: second,
      }));
      let count = 0;

      Context.run(start, (_, context) =>
        context.succeed(
          Continuation.of(() => {
            count += 1;
          }),
          steps
        )
      );

      expect(count).toBe(300_000);
    });
  });

  describe('fail', () => {
    it('must report the furthest failure', () => {
      const parsed = Context.run(start, (_, context) => {
        context.fail(Frontier.expected(second, new Named('b')));
        context.fail(Frontier.expected(start, new Named('a')));
      });

      assert(!parsed.ok());
      expect(parsed.error()).toEqual(
        Frontier.expected(second, new Named('b')).mismatch(start)
      );
    });
  });

  describe('after', () => {
    it('must resume once the action is done', () => {
      const ran: string[] = [];

      Context.run(start, (_, context) =>
        context.after(
          () => context.schedule(() => ran.push('work')),
          () => ran.push('then')
        )
      );

      expect(ran).toEqual(['work', 'then']);
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

  describe('within', () => {
    it('must send what fails within to the given failures only', () => {
      const failures = new Failures(start);
      const parsed = Context.run(start, (_, context) =>
        context.within(failures, () =>
          context.fail(Frontier.expected(second, new Named('a')))
        )
      );

      assert(!parsed.ok());
      expect(failures.frontier()).toEqual(
        Frontier.expected(second, new Named('a'))
      );
      expect(parsed.error()).toEqual(Frontier.empty(start).mismatch(start));
    });
  });

  describe('recall', () => {
    const ends = (recalled: Column.Rule<string>, point = start) => {
      const found: number[] = [];

      Context.run(start, (_, context) =>
        context.recall(
          recalled,
          point,
          Continuation.of((step: Point.Step<string, Node>) =>
            found.push(step.rest.distanceFrom(start))
          )
        )
      );

      return found;
    };

    it('must parse a rule separately at each point', () => {
      expect(ends(rule(past), second)).toEqual([2]);
    });

    it('must grow a rule that refers back to itself where it started, longest first', () => {
      const letters: Column.Rule<string> = rule(
        (point, context, continuation) => {
          past(point, context, continuation);
          context.recall(
            letters,
            point,
            continuation.with(({ rest }) => past(rest, context, continuation))
          );
        },
        true
      );

      expect(ends(letters)).toEqual([2, 1]);
    });

    it('must grow a rule only once at the same point', () => {
      const calls = (times: number) => {
        const parse = vi.fn(past);
        const grown = rule(parse, true);

        Context.run(start, (_, context) =>
          Array.from({ length: times }).forEach(() =>
            context.recall(
              grown,
              start,
              Continuation.of<string>(() => undefined)
            )
          )
        );

        return parse.mock.calls.length;
      };

      expect(calls(2)).toBe(calls(1));
    });

    it('must parse afresh a rule that can start with a rule growing there', () => {
      const parse = vi.fn(past);
      const growing: Column.Rule<string> = rule(
        (point, context, continuation) =>
          context.recall(
            { ...rule(parse), corners: new Set([growing.expression]) },
            point,
            continuation
          ),
        true
      );

      Context.run(start, (_, context) =>
        context.recall(
          growing,
          start,
          Continuation.of<string>(() => undefined)
        )
      );

      expect(parse).toHaveBeenCalledTimes(2);
    });

    it('must relabel what a rule failed with for each caller', () => {
      const parsed = Context.run(start, (_, context) =>
        context.recall(
          rule((point, inner) =>
            inner.fail(Frontier.expected(point, new Named('a')))
          ),
          start,
          Continuation.of<string>(() => undefined).labelled(
            start,
            new Named('a label')
          )
        )
      );

      assert(!parsed.ok());
      expect(parsed.error()).toEqual(
        Frontier.expected(start, new Named('a label')).mismatch(start)
      );
    });

    it('must hand on what a rule failed with to a caller that comes after it finished', () => {
      const recall = rule((point, inner) =>
        inner.fail(Frontier.expected(point, new Named('a')))
      );
      const parsed = Context.run(start, (_, context) => {
        context.schedule(() =>
          context.recall(
            recall,
            start,
            Continuation.of<string>(() => undefined).labelled(
              start,
              new Named('another label')
            )
          )
        );
        context.recall(
          recall,
          start,
          Continuation.of<string>(() => undefined).labelled(
            start,
            new Named('a label')
          )
        );
      });

      assert(!parsed.ok());
      expect(parsed.error()).toEqual(
        Frontier.expected(
          start,
          new Named('a label'),
          new Named('another label')
        ).mismatch(start)
      );
    });

    it('must not hand on what fails after a rule to its callers', () => {
      const parsed = Context.run(start, (_, context) => {
        context.recall(
          rule(past),
          start,
          Continuation.of<string>(() => undefined).labelled(
            start,
            new Named('a label')
          )
        );
        context.schedule(() =>
          context.fail(Frontier.expected(start, new Named('b')))
        );
      });

      assert(!parsed.ok());
      expect(parsed.error()).toEqual(
        Frontier.expected(start, new Named('b')).mismatch(start)
      );
    });

    it('must not relabel what a rule failed with away from where the label starts', () => {
      const parsed = Context.run(start, (_, context) =>
        context.recall(
          rule((_point, inner) =>
            inner.fail(Frontier.expected(second, new Named('a')))
          ),
          start,
          Continuation.of<string>(() => undefined).labelled(
            start,
            new Named('a label')
          )
        )
      );

      assert(!parsed.ok());
      expect(parsed.error()).toEqual(
        Frontier.expected(second, new Named('a')).mismatch(start)
      );
    });
  });
});
