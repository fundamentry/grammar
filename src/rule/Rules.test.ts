import { assert, describe, expect, expectTypeOf, it } from 'vitest';

import { CodePoint } from '@fundamentry/scalar';

import { Character, Focus, type Node, type Nonterminal } from '#project/tree';

import { Rule } from './Rule.js';
import { Rules } from './Rules.js';

const DIGIT = new Rule('DIGIT', codec => codec.character(['0', '9']));
const ALPHA = new Rule('ALPHA', codec => codec.character(['a', 'z']));

const WORD = new Rule('word', codec => codec.choice(DIGIT, ALPHA).many());

const parsed = (input: string) => {
  const result = WORD.parse(input);

  assert(result.ok());

  return result.value();
};

describe('Rules', () => {
  const isDigit = (node: Node) => DIGIT.is(node);

  describe('is', () => {
    it('must hold for the nodes its predicate holds for', () => {
      const seven = new Character(CodePoint.of('7'));

      expect(new Rules(isDigit).is(DIGIT.node(seven))).toBe(true);
      expect(new Rules(isDigit).is(ALPHA.node(seven))).toBe(false);
    });
  });

  describe('in', () => {
    it('must focus on the outermost nodes its predicate holds for', () => {
      expect(new Rules(isDigit).in(parsed('a1b2'))).toBeInstanceOf(Focus);
      expect(
        new Rules(isDigit).in(parsed('a1b2')).map(String).values().toArray()
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
