import { describe, expect, it } from 'vitest';

import { PartialIso } from '@fundamentry/category';
import { Range } from '@fundamentry/range';
import { CodePoint, Integer } from '@fundamentry/scalar';

import { Named } from '#project/expectation';
import { Character, Option, Repetition, Sequence } from '#project/tree';

import { Concatenation } from './Concatenation.js';
import { type Expression } from './Expression.js';
import { Optional } from './Optional.js';
import { Repetition as Repeated } from './Repetition.js';
import { Separated } from './Separated.js';
import { Terminal } from './Terminal.js';

const element = new Terminal(
  PartialIso.id<Character>(),
  new Named('an element')
);
const separator = new Terminal(
  PartialIso.id<Character>(),
  new Named('a separator')
);

const A = new Character(CodePoint.of('a'));
const B = new Character(CodePoint.of('b'));
const COMMA = new Character(CodePoint.of(','));

const visitor = new Proxy(
  {} as Expression.Visitor<Character, string, readonly unknown[]>,
  {
    get:
      (_, method) =>
      (...args: unknown[]) => [method, ...args],
  }
);

const shape = (expression: Expression<Character>): unknown =>
  expression.accept(visitor, '');

describe('Separated', () => {
  describe('constructor', () => {
    it.each([
      Range.open(Integer.of(1), Integer.of(2)),
      Range.atMost(Integer.of(-1)),
      Range.singleton(Integer.of(0)),
    ])("must reject bounds '%s' that allow no element", bounds => {
      expect(() => new Separated(element, separator, bounds)).toThrow(
        new RangeError(`Invalid list bounds: ${String(bounds)}`)
      );
    });
  });

  describe('accept', () => {
    it('must visit as a list with its element, separator, bounds, expansion and the input', () => {
      const bounds = Range.atLeast(Integer.of(1));
      const [method, ...args] = new Separated(
        element,
        separator,
        bounds
      ).accept(visitor, 'input');

      expect(method).toBe('separated');
      expect(args[0]).toBe(element);
      expect(args[1]).toBe(separator);
      expect(args[2]).toBe(bounds);
      expect(args[3]).toBeInstanceOf(Concatenation);
      expect(args[4]).toBe('input');
    });

    it('must hand every visit the same expansion', () => {
      const list = new Separated(
        element,
        separator,
        Range.atLeast(Integer.of(0))
      );

      expect(list.accept(visitor, '')[4]).toBe(list.accept(visitor, '')[4]);
    });
  });

  describe('expand', () => {
    it('must expand a list that may be empty to an optional first element and separated rest', () => {
      expect(
        shape(
          Separated.expand(element, separator, Range.atLeast(Integer.of(0)))
        )
      ).toEqual(
        shape(
          new Optional(
            new Concatenation([
              element,
              new Repeated(
                new Concatenation([separator, element]),
                Range.atLeast(Integer.of(0))
              ),
            ])
          )
        )
      );
    });

    it('must expand a list of at least one element without the option', () => {
      expect(
        shape(
          Separated.expand(
            element,
            separator,
            Range.closed(Integer.of(2), Integer.of(3))
          )
        )
      ).toEqual(
        shape(
          new Concatenation([
            element,
            new Repeated(
              new Concatenation([separator, element]),
              Range.closedOpen(Integer.of(1), Integer.of(3))
            ),
          ])
        )
      );
    });
  });

  describe('collect', () => {
    it('must collect the elements and separators of an expanded list', () => {
      expect(
        Separated.collect(
          new Option(
            new Sequence([A, new Repetition([new Sequence([COMMA, B])])])
          )
        )
      ).toEqual(new Repetition([A, B], [COMMA]));
    });

    it('must collect nothing from an absent list', () => {
      expect(Separated.collect(new Option())).toEqual(new Repetition([], []));
    });

    it('must collect a list without the option', () => {
      expect(Separated.collect(new Sequence([A, new Repetition([])]))).toEqual(
        new Repetition([A], [])
      );
    });
  });

  describe('spread', () => {
    const many = Range.atLeast(Integer.of(0));
    const some = Range.atLeast(Integer.of(1));

    it('must spread a list into its expanded shape', () => {
      expect(Separated.spread(new Repetition([A, B], [COMMA]), many)).toEqual(
        new Option(
          new Sequence([A, new Repetition([new Sequence([COMMA, B])])])
        )
      );
    });

    it('must spread an empty list into an absent option', () => {
      expect(Separated.spread(new Repetition([], []), many)).toEqual(
        new Option()
      );
    });

    it('must spread a list of at least one element without the option', () => {
      expect(Separated.spread(new Repetition([A], []), some)).toEqual(
        new Sequence([A, new Repetition([])])
      );
    });
  });
});
