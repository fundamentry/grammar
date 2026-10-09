import { assert, describe, expect, expectTypeOf, it } from 'vitest';

import { type Result } from '@fundamentry/coproduct';
import { CodePoint } from '@fundamentry/scalar';

import { members, write } from '#project/codec';
import { Character, Focus, type Node, type Nonterminal } from '#project/tree';

import { Rule } from './Rule.js';
import { Rules } from './Rules.js';
import { Selection } from './Selection.js';

const DIGIT = new Rule('DIGIT', codec => codec.character(['0', '9']));
const ALPHA = new Rule('ALPHA', codec => codec.character(['a', 'z']));

const WORD = new Rule('word', codec => codec.choice(DIGIT, ALPHA).many());

const parsed = (input: string) => {
  const result = WORD.parse(input);

  assert(result.ok());

  return result.value();
};

const removed = <T>(result: Result<T, readonly Node[]>) => {
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

  describe('optic', () => {
    it('must match the nodes of any of its rules', () => {
      const seven = new Character(CodePoint.of('7'));
      const digit = DIGIT.node(seven);
      const optic = new Rules([DIGIT]).optic();

      expect(optic.preview(digit).ok()).toBe(true);
      expect(optic.preview(ALPHA.node(seven)).ok()).toBe(false);
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
    it('must select the outermost nodes of any of its rules', () => {
      expect(new Rules([DIGIT]).in(parsed('a1b2'))).toBeInstanceOf(Selection);
      expect(
        new Rules([DIGIT]).in(parsed('a1b2')).map(String).values().toArray()
      ).toEqual(['1', '2']);
    });

    it('must edit the text of each node with its own rule', () => {
      const edited = new Rules([DIGIT, ALPHA])
        .in(parsed('a1'))
        .edit(text => (/\d/u.test(text) ? '9' : 'z'));

      assert(edited.ok());
      expect(String(edited.value())).toBe('z9');
    });
  });

  describe('write', () => {
    const place = <T extends Node>(rules: Rule.Any, tree: T) =>
      Focus.of(tree, (node): node is Node => rules.is(node));

    const letters = (text: string) => (/\d/u.test(text) ? text : 'z');

    it('must parse the text of each node with its own rule', () => {
      const written = Rule.any(DIGIT, ALPHA)[write](
        place(Rule.any(DIGIT, ALPHA), parsed('a1')),
        letters
      );

      assert(written.ok());
      expect(String(written.value())).toBe('z1');
    });

    it('must parse the text of a node with a rule of a union of unions', () => {
      const written = Rule.any(Rule.any(ALPHA), DIGIT)[write](
        place(Rule.any(ALPHA), parsed('a1')),
        letters
      );

      assert(written.ok());
      expect(String(written.value())).toBe('z1');
    });

    it('must report text the rule of a node does not accept', () => {
      const written = Rule.any(DIGIT, ALPHA)[write](
        place(Rule.any(DIGIT, ALPHA), parsed('a1')),
        () => 'b'
      );

      assert(!written.ok());
      expect(String(written.error())).toBe("Expected DIGIT, got 'b'");
    });

    it('must leave a node of none of its rules as it is', () => {
      const tree = parsed('a1');

      const written = Rule.any(DIGIT)[write](
        place(Rule.any(ALPHA), tree),
        letters
      );

      assert(written.ok());
      expect(written.value()).toEqual(tree);
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
    expect(String(removed(Rule.any(DIGIT).in(parsed('a1b2')).remove()))).toBe(
      'ab'
    );
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
