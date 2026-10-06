import { assert, describe, expect, it, vi } from 'vitest';

import { CodePoint } from '@fundamentry/scalar';
import { Point } from '@fundamentry/stream';

import { Named } from '#project/expectation';
import { Choice, Character, type Node } from '#project/tree';

import { Alternatives } from './Alternatives.js';
import { Context } from './Context.js';
import { Continuation } from './Continuation.js';
import { Frontier } from './Frontier.js';
import { type Parser } from './Parser.js';

const input = (text: string) => Point.of(Array.from(text, CodePoint.of));

const explore = (
  alternatives: Alternatives<CodePoint>,
  point: Point<CodePoint>
) => {
  const steps: Point.Step<CodePoint, Node>[] = [];
  const parsed = Context.run(point, (start, context) =>
    alternatives.from(
      start,
      context,
      Continuation.of(step => steps.push(step))
    )
  );

  assert(!parsed.ok());

  return { steps, mismatch: parsed.error() };
};

const terminal = (text: string): Parser.Compiled<CodePoint> => {
  const expected = new Named(`'${text}'`);

  return {
    parse: (point, context, continuation) => {
      const step = point.step();

      if (step?.value.equals(CodePoint.of(text)))
        context.succeed(continuation, [
          {
            value: new Character(step.value),
            rest: step.rest,
          },
        ]);
      else
        context.fail(continuation.relabel(Frontier.expected(point, expected)));
    },
    starts: token => token?.equals(CodePoint.of(text)) ?? false,
    nullable: false,
    expected: [expected],
  };
};

const empty: Parser.Compiled<CodePoint> = {
  parse: (point, context, continuation) =>
    context.succeed(continuation, [
      {
        value: new Character(CodePoint.of('_')),
        rest: point,
      },
    ]),
  starts: () => false,
  nullable: true,
  expected: [],
};

const character = (text: string) => new Character(CodePoint.of(text));

describe('Alternatives', () => {
  describe('of', () => {
    it('must wrap a value in a choice of the alternative it came from', () => {
      const alternatives = Alternatives.of([
        terminal('a'),
        terminal('b'),
        terminal('c'),
      ]);

      const a = input('a');
      const c = input('c');

      expect(explore(alternatives, a).steps).toEqual([
        { value: new Choice(0, character('a')), rest: a.step()?.rest },
      ]);
      expect(explore(alternatives, c).steps).toEqual([
        { value: new Choice(2, character('c')), rest: c.step()?.rest },
      ]);
    });

    it('must flatten a nested alternation, keeping the nesting of its values', () => {
      const inner = Alternatives.of([terminal('a'), terminal('b')]);
      const outer = Alternatives.of([
        { ...terminal('a'), alternatives: inner },
        terminal('c'),
      ]);

      const point = input('b');

      expect(explore(outer, point).steps).toEqual([
        {
          value: new Choice(0, new Choice(1, character('b'))),
          rest: point.step()?.rest,
        },
      ]);
    });
  });

  describe('starts', () => {
    it('must start with a token any alternative starts with', () => {
      const alternatives = Alternatives.of([terminal('a'), terminal('b')]);

      expect(alternatives.starts(CodePoint.of('b'))).toBe(true);
      expect(alternatives.starts(CodePoint.of('c'))).toBe(false);
      expect(alternatives.starts(undefined)).toBe(false);
    });
  });

  describe('expected', () => {
    it('must expect what every alternative expects, in order', () => {
      expect(
        Alternatives.of([terminal('a'), terminal('b')]).expected()
      ).toEqual([new Named("'a'"), new Named("'b'")]);
    });
  });

  describe('from', () => {
    it('must report consecutive alternatives that cannot start with the token as one failure, in order', () => {
      const alternatives = Alternatives.of([
        {
          ...terminal('a'),
          alternatives: Alternatives.of([terminal('a'), terminal('b')]),
        },
        terminal('c'),
      ]);

      const point = input('c');
      const { steps, mismatch } = explore(alternatives, point);

      expect(steps).toEqual([
        {
          value: new Choice(1, character('c')),
          rest: point.step()?.rest,
        },
      ]);
      expect(mismatch).toEqual(
        Frontier.expected(point, new Named("'a'"), new Named("'b'")).mismatch(
          point
        )
      );
    });

    it('must not parse an alternative that cannot start with the token', () => {
      const parse = vi.fn(terminal('a').parse);

      explore(
        Alternatives.of([{ ...terminal('a'), parse }, terminal('b')]),
        input('b')
      );

      expect(parse).not.toHaveBeenCalled();
    });

    it('must parse an alternative that can match empty input whatever the token', () => {
      expect(
        explore(Alternatives.of([terminal('a'), empty]), input('z')).steps
      ).toHaveLength(1);
    });

    it('must finish with an alternative before looking at the next one', () => {
      const events: string[] = [];
      const starts = vi.fn((token?: CodePoint) => {
        events.push('looked at b');

        return terminal('b').starts(token);
      });
      const point = input('a');
      const alternatives = Alternatives.of([
        terminal('a'),
        { ...terminal('b'), starts },
      ]);

      Context.run(point, (start, context) =>
        alternatives.from(
          start,
          context,
          Continuation.of(() => events.push('parsed a'))
        )
      );

      expect(events).toEqual(['parsed a', 'looked at b']);
    });
  });
});
