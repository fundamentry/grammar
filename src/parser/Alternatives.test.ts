import { assert, describe, expect, it, vi } from 'vitest';

import { Left, Right } from '@fundamentry/coproduct';
import { CodePoint } from '@fundamentry/scalar';
import { Point } from '@fundamentry/stream';

import { Named } from '#project/expectation';
import { Mismatch } from '#project/mismatch';
import { Choice, Literal, type Node } from '#project/tree';

import { Alternatives } from './Alternatives.js';
import { Context } from './Context.js';
import { type Parser } from './Parser.js';

const input = (text: string) => Point.of(Array.from(text, CodePoint.of));

const explore = (
  alternatives: Alternatives<CodePoint>,
  point: Point<CodePoint>
) => {
  const steps: Point.Step<CodePoint, Node>[] = [];
  const parsed = Context.run(point, (start, context) =>
    alternatives.from(start, context, {
      succeed: step => steps.push(step),
    })
  );

  assert(!parsed.ok());

  return { steps, mismatch: parsed.error() };
};

const character = (text: string): Parser.Compiled<CodePoint> => {
  const expected = new Named(`'${text}'`);

  return {
    parse: (point, context, continuation) => {
      const step = point.step();

      if (step?.value.equals(CodePoint.of(text)))
        context.succeed(continuation, {
          value: new Literal(step.value),
          rest: step.rest,
        });
      else context.fail(Mismatch.expected(point, expected), continuation.label);
    },
    starts: token => token?.equals(CodePoint.of(text)) ?? false,
    nullable: false,
    expected: [expected],
  };
};

const empty: Parser.Compiled<CodePoint> = {
  parse: (point, context, continuation) =>
    context.succeed(continuation, {
      value: new Literal(CodePoint.of('_')),
      rest: point,
    }),
  starts: () => false,
  nullable: true,
  expected: [],
};

const literal = (text: string) => new Literal(CodePoint.of(text));

describe('Alternatives', () => {
  describe('of', () => {
    it('must wrap a value from the left in a left choice and from the right in a right choice', () => {
      const alternatives = Alternatives.of(character('a'), character('b'));

      const a = input('a');
      const b = input('b');

      expect(explore(alternatives, a).steps).toEqual([
        { value: new Choice(new Left(literal('a'))), rest: a.step()?.rest },
      ]);
      expect(explore(alternatives, b).steps).toEqual([
        { value: new Choice(new Right(literal('b'))), rest: b.step()?.rest },
      ]);
    });

    it('must flatten a nested alternation, keeping the nesting of its values', () => {
      const inner = Alternatives.of(character('a'), character('b'));
      const outer = Alternatives.of(
        { ...character('a'), alternatives: inner },
        character('c')
      );

      const point = input('b');

      expect(explore(outer, point).steps).toEqual([
        {
          value: new Choice(new Left(new Choice(new Right(literal('b'))))),
          rest: point.step()?.rest,
        },
      ]);
    });
  });

  describe('starts', () => {
    it('must start with a token any alternative starts with', () => {
      const alternatives = Alternatives.of(character('a'), character('b'));

      expect(alternatives.starts(CodePoint.of('b'))).toBe(true);
      expect(alternatives.starts(CodePoint.of('c'))).toBe(false);
      expect(alternatives.starts(undefined)).toBe(false);
    });
  });

  describe('expected', () => {
    it('must expect what every alternative expects, in order', () => {
      expect(
        Alternatives.of(character('a'), character('b')).expected()
      ).toEqual([new Named("'a'"), new Named("'b'")]);
    });
  });

  describe('from', () => {
    it('must report consecutive alternatives that cannot start with the token as one failure, in order', () => {
      const alternatives = Alternatives.of(
        {
          ...character('a'),
          alternatives: Alternatives.of(character('a'), character('b')),
        },
        character('c')
      );

      const point = input('c');
      const { steps, mismatch } = explore(alternatives, point);

      expect(steps).toEqual([
        {
          value: new Choice(new Right(literal('c'))),
          rest: point.step()?.rest,
        },
      ]);
      expect(mismatch).toEqual(
        Mismatch.expected(point, new Named("'a'"), new Named("'b'"))
      );
    });

    it('must not parse an alternative that cannot start with the token', () => {
      const parse = vi.fn(character('a').parse);

      explore(
        Alternatives.of({ ...character('a'), parse }, character('b')),
        input('b')
      );

      expect(parse).not.toHaveBeenCalled();
    });

    it('must parse an alternative that can match empty input whatever the token', () => {
      expect(
        explore(Alternatives.of(character('a'), empty), input('z')).steps
      ).toHaveLength(1);
    });

    it('must finish with an alternative before looking at the next one', () => {
      const events: string[] = [];
      const starts = vi.fn((token?: CodePoint) => {
        events.push('looked at b');

        return character('b').starts(token);
      });
      const point = input('a');
      const alternatives = Alternatives.of(character('a'), {
        ...character('b'),
        starts,
      });

      Context.run(point, (start, context) =>
        alternatives.from(start, context, {
          succeed: () => events.push('parsed a'),
        })
      );

      expect(events).toEqual(['parsed a', 'looked at b']);
    });
  });
});
