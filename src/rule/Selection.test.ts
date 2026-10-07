import { assert, describe, expect, it } from 'vitest';

import { type Codec } from '#project/codec';
import { Focus, type Node, Sequence } from '#project/tree';

import { Rule } from './Rule.js';

const DIGIT = new Rule('DIGIT', codec => codec.character(['0', '9']));

const PORT = new Rule('port', codec =>
  codec.sequence(
    codec.literal('h'),
    codec.sequence(codec.literal(':'), DIGIT.many()).optional()
  )
);

const SIGN = new Rule('sign', codec =>
  codec.choice(
    codec.literal('+'),
    codec.sequence(codec.literal('-'), DIGIT.many())
  )
);

const SIGNED = new Rule('signed', codec =>
  codec.choice(DIGIT, codec.sequence(codec.literal('#'), DIGIT))
);

const parsed = <T extends Node>(codec: Codec<T>, input: string) => {
  const result = codec.parse(input);

  assert(result.ok());

  return result.value();
};

describe('Selection', () => {
  describe('values, find, set and modify', () => {
    it('must act on the outermost nodes of the rule', () => {
      const tree = parsed(PORT, 'h:12');
      const selection = DIGIT.in(tree);

      expect(selection.values().map(String).toArray()).toEqual(['1', '2']);
      expect(String(selection.find())).toBe('1');
      expect(String(selection.set(parsed(DIGIT, '7')))).toBe('h:77');
      expect(String(selection.modify(() => parsed(DIGIT, '8')))).toBe('h:88');
    });
  });

  describe('set', () => {
    it('must parse text with the codec of the focus and set it', () => {
      const set = DIGIT.in(parsed(PORT, 'h:12')).set('7');

      assert(set.ok());
      expect(String(set.value())).toBe('h:77');
    });

    it('must report text the focus does not accept', () => {
      const set = DIGIT.in(parsed(PORT, 'h:12')).set('x');

      assert(!set.ok());
      expect(String(set.error())).toBe("Expected DIGIT, got 'x'");
    });

    it('must create a missing part from text', () => {
      const set = PORT.in(parsed(PORT, 'h'))
        .elements()
        .at(1)
        .value()
        .at(1)
        .set('80');

      assert(set.ok());
      expect(String(set.value())).toBe('h:80');
    });
  });

  describe('focus', () => {
    it('must narrow to a part with any optic, leaving the grammar behind', () => {
      const focus = PORT.in(parsed(PORT, 'h:1'))
        .elements()
        .focus(Sequence.at(0));

      expect(focus).toBeInstanceOf(Focus);
      expect(String(focus.find())).toBe('h');
    });
  });

  describe('elements', () => {
    it('must narrow to the elements of the rule', () => {
      expect(String(PORT.in(parsed(PORT, 'h:1')).elements().find())).toBe(
        'h:1'
      );
    });
  });

  describe('at', () => {
    it('must narrow to the element at the index', () => {
      expect(String(PORT.in(parsed(PORT, 'h:1')).elements().at(1).find())).toBe(
        ':1'
      );
    });
  });

  describe('value', () => {
    const port = (input: string) =>
      PORT.in(parsed(PORT, input)).elements().at(1).value();

    it('must narrow to the value of an option that is present', () => {
      expect(String(port('h:1').find())).toBe(':1');
    });

    it('must read an absent option as its default', () => {
      expect(String(port('h').find())).toBe(':');
    });

    it('must make an absent option present when set', () => {
      expect(String(port('h').at(1).set(parsed(DIGIT.many(), '80')))).toBe(
        'h:80'
      );
    });

    it('must leave an absent option absent when left as its default', () => {
      const tree = parsed(PORT, 'h');

      expect(
        PORT.in(tree)
          .elements()
          .at(1)
          .value()
          .modify(value => value)
      ).toEqual(tree);
    });

    it('must skip an absent option without a default', () => {
      const OPTIONAL = new Rule('optional', () => DIGIT.optional());
      const tree = parsed(OPTIONAL, '');

      expect(OPTIONAL.in(tree).elements().value().find()).toBeUndefined();
      expect(
        OPTIONAL.in(tree).elements().value().set(parsed(DIGIT, '1'))
      ).toEqual(tree);
    });
  });

  describe('alternative', () => {
    it('must narrow to the alternative taken', () => {
      expect(
        String(SIGN.in(parsed(SIGN, '-1')).elements().alternative(1).find())
      ).toBe('-1');
    });

    it('must take another alternative with a default when set', () => {
      expect(
        String(
          SIGN.in(parsed(SIGN, '+'))
            .elements()
            .alternative(1)
            .at(1)
            .set(parsed(DIGIT.many(), '5'))
        )
      ).toBe('-5');
    });

    it('must keep the alternative taken when left as the default', () => {
      const tree = parsed(SIGN, '+');

      expect(
        SIGN.in(tree)
          .elements()
          .alternative(1)
          .modify(value => value)
      ).toEqual(tree);
    });

    it('must skip another alternative without a default', () => {
      const tree = parsed(SIGNED, '#1');

      expect(SIGNED.in(tree).elements().alternative(0).find()).toBeUndefined();
      expect(
        SIGNED.in(tree).elements().alternative(0).set(parsed(DIGIT, '2'))
      ).toEqual(tree);
    });
  });
});
