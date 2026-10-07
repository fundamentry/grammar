import { assert, describe, expect, expectTypeOf, it } from 'vitest';

import { CodePoint } from '@fundamentry/scalar';

import { Character } from './Character.js';
import { type Node } from './Node.js';
import { Option } from './Option.js';
import { Sequence } from './Sequence.js';

const A = new Character(CodePoint.of('a'));
const B = new Character(CodePoint.of('b'));

class SpecificOption extends Option<Character> {}

describe('Option', () => {
  describe('instanceof', () => {
    it('must recognise an instance of its own class', () => {
      expect(new Option(A)).toBeInstanceOf(Option);
      expect(new SpecificOption(A)).toBeInstanceOf(Option);
    });

    it('must not recognise an instance of the base class as a subclass', () => {
      expect(new Option(A)).not.toBeInstanceOf(SpecificOption);
    });

    it('must not recognise other values', () => {
      expect(new Sequence([A])).not.toBeInstanceOf(Option);
      expect(undefined).not.toBeInstanceOf(Option);
    });
  });

  describe('value', () => {
    it('must return the value passed to the constructor', () => {
      expect(new Option(A).value()).toBe(A);
    });

    it('must return undefined when absent', () => {
      expect(new Option().value()).toBeUndefined();
    });

    it('must fit an option of any node when absent', () => {
      expectTypeOf(new Option()).toExtend<
        Option<Sequence<readonly [Character]>>
      >();
    });
  });

  describe('map', () => {
    it('must transform the value when present', () => {
      function toB<N extends Node>(node: N): N;

      function toB(node: Node): Node {
        return node instanceof Character ? B : node;
      }

      expect(new Option(A).map(toB)).toEqual(new Option(B));
    });

    it('must stay absent without rewriting anything', () => {
      const rewritten: Node[] = [];
      const record: Node.Transform = node => {
        rewritten.push(node);

        return node;
      };

      expect(new Option<Character>().map(record)).toEqual(new Option());
      expect(rewritten).toEqual([]);
    });
  });

  describe('value prism', () => {
    it('must preview the value when present', () => {
      const previewed = Option.value<Character>().preview(new Option(A));

      assert(previewed.ok());
      expect(previewed.value()).toBe(A);
    });

    it('must not preview an absent value', () => {
      expect(Option.value<Character>().preview(new Option()).ok()).toBe(false);
    });

    it('must review a value as a present option', () => {
      expect(Option.value<Character>().review(A)).toEqual(new Option(A));
    });
  });

  describe('valueFrom', () => {
    it('must preview the value when present', () => {
      const previewed = Option.valueFrom(B).preview(new Option(A));

      assert(previewed.ok());
      expect(previewed.value()).toBe(A);
    });

    it('must not preview an absent value', () => {
      expect(Option.valueFrom(B).preview(new Option<Character>()).ok()).toBe(
        false
      );
    });

    it('must create an absent option from the initial value when set', () => {
      expect(Option.valueFrom(B).set(new Option<Character>(), A)).toEqual(
        new Option(A)
      );
    });

    it('must leave an absent option absent when set to the initial value', () => {
      const absent = new Option<Character>();

      expect(Option.valueFrom(B).set(absent, B)).toBe(absent);
    });

    it('must keep a present option present when set to the initial value', () => {
      expect(Option.valueFrom(B).set(new Option(A), B)).toEqual(new Option(B));
    });
  });

  describe('elements', () => {
    it('must return its value as the only element when present', () => {
      expect(new Option(A).elements()).toEqual([A]);
    });

    it('must return no elements when absent', () => {
      expect(new Option().elements()).toEqual([]);
    });
  });

  describe('children', () => {
    it('must have its value as its only child when present', () => {
      expect(new Option(A).children()).toEqual([A]);
    });

    it('must have no children when absent', () => {
      expect(new Option().children()).toEqual([]);
    });
  });

  describe('equals', () => {
    it('must equal an option of an equal value', () => {
      expect(new Option(A).equals(new Option(A))).toBe(true);
    });

    it('must not equal an option of a different value', () => {
      expect(new Option(A).equals(new Option(B))).toBe(false);
    });

    it('must equal another absent option', () => {
      expect(new Option().equals(new Option())).toBe(true);
    });

    it('must not equal an absent option when present, and vice versa', () => {
      expect(new Option(A).equals(new Option())).toBe(false);
      expect(new Option().equals(new Option(A))).toBe(false);
    });

    it('must not equal a different kind of node', () => {
      expect(
        new Option(A).equals(new Sequence([A]) as unknown as Option<Character>)
      ).toBe(false);
    });
  });

  describe('toString', () => {
    it('must print its value when present', () => {
      expect(new Option(A).toString()).toBe('a');
    });

    it('must print nothing when absent', () => {
      expect(new Option().toString()).toBe('');
    });
  });
});
