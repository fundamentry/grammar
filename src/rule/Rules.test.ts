import { assert, describe, expect, expectTypeOf, it } from 'vitest';

import { CodePoint } from '@fundamentry/scalar';

import { Character, Focus, type Nonterminal } from '#project/tree';

import { Rule } from './Rule.js';
import { members, Rules } from './Rules.js';

const DIGIT = new Rule('DIGIT', codec => codec.character(['0', '9']));
const ALPHA = new Rule('ALPHA', codec => codec.character(['a', 'z']));

const WORD = new Rule('word', codec => codec.choice(DIGIT, ALPHA).many());

const parsed = (input: string) => {
  const result = WORD.parse(input);

  assert(result.ok());

  return result.value();
};

describe('Rules', () => {
  describe('is', () => {
    it('must hold for the nodes of any of its rules', () => {
      const seven = new Character(CodePoint.of('7'));

      expect(new Rules([DIGIT]).is(DIGIT.node(seven))).toBe(true);
      expect(new Rules([DIGIT]).is(ALPHA.node(seven))).toBe(false);
    });
  });

  describe('prism', () => {
    it('must match the nodes of any of its rules', () => {
      const seven = new Character(CodePoint.of('7'));
      const digit = DIGIT.node(seven);
      const prism = new Rules([DIGIT]).prism();

      expect(prism.preview(digit).ok()).toBe(true);
      expect(prism.preview(ALPHA.node(seven)).ok()).toBe(false);
    });
  });

  describe('members', () => {
    it('must list the rules of its unions among its own', () => {
      expect(new Rules([new Rules([DIGIT]), ALPHA])[members]()).toEqual([
        DIGIT,
        ALPHA,
      ]);
    });
  });

  describe('in', () => {
    it('must focus on the outermost nodes of any of its rules', () => {
      expect(new Rules([DIGIT]).in(parsed('a1b2'))).toBeInstanceOf(Focus);
      expect(
        new Rules([DIGIT]).in(parsed('a1b2')).map(String).values().toArray()
      ).toEqual(['1', '2']);
    });
  });
});

describe('Rule.any', () => {
  it('must select the nodes of any of the rules in document order', () => {
    expect(
      Rule.any(DIGIT, ALPHA).in(parsed('a1b')).map(String).values().toArray()
    ).toEqual(['a', '1', 'b']);
  });

  it('must find the first node of any of the rules', () => {
    expect(String(Rule.any(DIGIT, ALPHA).in(parsed('1a')).find())).toBe('1');
  });

  it('must find nothing where none of the rules occur', () => {
    expect(Rule.any(DIGIT).in(parsed('ab')).find()).toBeUndefined();
  });

  it('must select the nodes of a union of unions', () => {
    expect(
      Rule.any(Rule.any(DIGIT), ALPHA)
        .in(parsed('a1'))
        .map(String)
        .values()
        .toArray()
    ).toEqual(['a', '1']);
  });

  it('must remove the nodes of any of the rules', () => {
    expect(String(Rule.any(DIGIT).in(parsed('a1b2')).remove())).toBe('ab');
  });

  it('must type the selection as the union of the nodes of the rules', () => {
    expectTypeOf(Rule.any(DIGIT, ALPHA).in(parsed('a')).find()).toEqualTypeOf<
      | Nonterminal<'DIGIT', Character>
      | Nonterminal<'ALPHA', Character>
      | undefined
    >();
  });

  it('must fit wherever any rule fits', () => {
    expectTypeOf(Rule.any(DIGIT, ALPHA)).toExtend<Rule.Any>();
  });
});
