import { describe, expect, expectTypeOf, it } from 'vitest';

import { CodePoint } from '@fundamentry/scalar';

import { Character } from './Character.js';
import { Nonterminal } from './Nonterminal.js';
import { Option } from './Option.js';

const DIGIT = { name: (): 'DIGIT' => 'DIGIT' };
const ALPHA = { name: (): 'ALPHA' => 'ALPHA' };

const seven = new Character(CodePoint.of('7'));

describe('Nonterminal', () => {
  describe('instanceof', () => {
    it('must recognise a nonterminal', () => {
      expect(new Nonterminal(DIGIT, seven)).toBeInstanceOf(Nonterminal);
    });

    it('must not recognise other values', () => {
      expect(new Option(seven)).not.toBeInstanceOf(Nonterminal);
      expect(undefined).not.toBeInstanceOf(Nonterminal);
    });
  });

  describe('rule', () => {
    it('must return the rule it was made with', () => {
      expect(new Nonterminal(DIGIT, seven).rule()).toBe(DIGIT);
    });
  });

  describe('elements', () => {
    it('must return the elements it was made with', () => {
      expect(new Nonterminal(DIGIT, seven).elements()).toBe(seven);
    });
  });

  describe('children', () => {
    it('must have its elements as its only child', () => {
      expect(new Nonterminal(DIGIT, seven).children()).toEqual([seven]);
    });
  });

  describe('type', () => {
    it('must not let a nonterminal of one rule pass for another', () => {
      expectTypeOf(new Nonterminal(DIGIT, seven)).not.toExtend<
        Nonterminal<'ALPHA', Character>
      >();
    });
  });

  describe('equals', () => {
    it('must equal a nonterminal of the same rule with equal elements', () => {
      expect(
        new Nonterminal(DIGIT, seven).equals(
          new Nonterminal(DIGIT, new Character(CodePoint.of('7')))
        )
      ).toBe(true);
    });

    it('must not equal a nonterminal of another rule of the same name', () => {
      expect(
        new Nonterminal(DIGIT, seven).equals(
          new Nonterminal({ name: (): 'DIGIT' => 'DIGIT' }, seven)
        )
      ).toBe(false);
    });

    it('must not equal a nonterminal of another rule', () => {
      expect(
        new Nonterminal(DIGIT, seven).equals(new Nonterminal(ALPHA, seven))
      ).toBe(false);
    });

    it('must not equal a nonterminal with other elements', () => {
      expect(
        new Nonterminal(DIGIT, seven).equals(
          new Nonterminal(DIGIT, new Character(CodePoint.of('8')))
        )
      ).toBe(false);
    });

    it('must not equal anything that is not a nonterminal', () => {
      expect(new Nonterminal(DIGIT, seven).equals(seven)).toBe(false);
    });
  });

  describe('toString', () => {
    it('must be the text of its elements', () => {
      expect(String(new Nonterminal(DIGIT, seven))).toBe('7');
    });
  });
});
