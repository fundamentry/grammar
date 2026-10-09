import { describe, expect, it } from 'vitest';

import { PartialIso } from '@fundamentry/category';
import { Range } from '@fundamentry/range';
import { Integer } from '@fundamentry/scalar';

import { Named } from '#project/expectation';
import { type Character } from '#project/tree';

import { Alternation } from './Alternation.js';
import { Concatenation } from './Concatenation.js';
import { type Expression } from './Expression.js';
import { Fallback } from './Fallback.js';
import { Label } from './Label.js';
import { Optional } from './Optional.js';
import { Reference } from './Reference.js';
import { Repetition } from './Repetition.js';
import { Rule } from './Rule.js';
import { Separated } from './Separated.js';
import { Terminal } from './Terminal.js';

type Visit = readonly unknown[];

const recording = (source: string) =>
  new Proxy({} as Expression.Visitor<Character, string, Visit>, {
    get:
      (_, method) =>
      (...args: unknown[]) => [
        source,
        method,
        ...args.map(arg => (arg instanceof Function ? Function : arg)),
      ],
  });

const declining = new Proxy(
  {} as Fallback.Preferred<Character, string, Visit>,
  {
    get:
      (_, method) =>
      (...args: unknown[]) =>
        method === 'terminal' ? ['preferred', method, ...args] : undefined,
  }
);

const lift = (visit: Visit): Visit => ['lifted', ...visit];

const composite = (kind: string): Expression<Character> => {
  const element = new Terminal(PartialIso.id<Character>(), new Named('a'));
  const rule = { name: () => 'RULE' };
  const composites: Readonly<Record<string, Expression<Character>>> = {
    concatenation: new Concatenation([element]),
    alternation: new Alternation([element]),
    optional: new Optional(element),
    repetition: new Repetition(element, Range.singleton(Integer.of(1))),
    separated: new Separated(element, element, Range.singleton(Integer.of(1))),
    label: new Label(element, new Named('a label')),
    rule: new Rule(element, () => rule),
    reference: new Reference(() => element),
  };

  return composites[kind] ?? element;
};

const kinds = [
  'concatenation',
  'alternation',
  'optional',
  'repetition',
  'separated',
  'label',
  'rule',
  'reference',
];

describe('Fallback', () => {
  describe('accept', () => {
    it('must lift what the preferred visitor makes of a terminal', () => {
      const terminal = new Terminal(PartialIso.id<Character>(), new Named('a'));

      expect(
        terminal.accept(
          new Fallback(declining, lift, recording('otherwise')),
          'input'
        )
      ).toEqual(lift(terminal.accept(recording('preferred'), 'input')));
    });

    it.each(kinds)(
      'must lift what the preferred visitor makes of a %s',
      kind => {
        const expression = composite(kind);

        expect(
          expression.accept(
            new Fallback(recording('preferred'), lift, recording('otherwise')),
            'input'
          )
        ).toEqual(lift(expression.accept(recording('preferred'), 'input')));
      }
    );

    it.each(kinds)(
      'must visit a %s with the other visitor when the preferred one makes nothing of it',
      kind => {
        const expression = composite(kind);

        expect(
          expression.accept(
            new Fallback(declining, lift, recording('otherwise')),
            'input'
          )
        ).toEqual(expression.accept(recording('otherwise'), 'input'));
      }
    );
  });
});
