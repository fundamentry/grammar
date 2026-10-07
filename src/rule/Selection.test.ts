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

  describe('iterator', () => {
    it('must iterate over the values', () => {
      expect([...DIGIT.in(parsed(PORT, 'h:12'))].map(String)).toEqual([
        '1',
        '2',
      ]);
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

  describe('to', () => {
    const NUMBER = new Rule('number', () => DIGIT.many());

    const ADDRESS = new Rule('address', codec =>
      codec.sequence(
        codec.literal('h'),
        codec.sequence(codec.literal(':'), NUMBER).optional()
      )
    );

    it('must narrow to the one place of a rule within another', () => {
      expect(
        String(ADDRESS.in(parsed(ADDRESS, 'h:12')).to(NUMBER).find())
      ).toBe('12');
    });

    it('must read a missing place as its default', () => {
      expect(String(ADDRESS.in(parsed(ADDRESS, 'h')).to(NUMBER).find())).toBe(
        ''
      );
    });

    it('must create the parts around a missing place when set', () => {
      const set = ADDRESS.in(parsed(ADDRESS, 'h')).to(NUMBER).set('80');

      assert(set.ok());
      expect(String(set.value())).toBe('h:80');
    });

    it('must leave a missing place missing when nothing changes', () => {
      const tree = parsed(ADDRESS, 'h');

      expect(
        ADDRESS.in(tree)
          .to(NUMBER)
          .modify(number => number)
      ).toEqual(tree);
    });

    it('must continue from the steps taken before it', () => {
      const set = ADDRESS.in(parsed(ADDRESS, 'h'))
        .elements()
        .at(1)
        .to(NUMBER)
        .set('80');

      assert(set.ok());
      expect(String(set.value())).toBe('h:80');
    });

    it('must refuse a rule found in more than one place', () => {
      const RANGE = new Rule('range', codec =>
        codec.sequence(NUMBER, codec.literal('-'), NUMBER)
      );

      expect(() => RANGE.in(parsed(RANGE, '1-2')).to(NUMBER)).toThrow(
        new RangeError('2 routes lead to number')
      );
    });

    it('must refuse a rule found only within a repetition', () => {
      expect(() => NUMBER.in(parsed(NUMBER, '12')).to(DIGIT)).toThrow(
        new RangeError('0 routes lead to DIGIT')
      );
    });
  });

  describe('remove', () => {
    it('must remove the elements of a repetition it selects', () => {
      expect(String(DIGIT.in(parsed(PORT, 'h:12')).remove())).toBe('h:');
    });

    it('must remove a part reached by its rule, with what surrounds it', () => {
      const NUMBER = new Rule('number', () => DIGIT.many());
      const ADDRESS = new Rule('address', codec =>
        codec.sequence(
          codec.literal('h'),
          codec.sequence(codec.literal(':'), NUMBER).optional()
        )
      );

      expect(
        String(ADDRESS.in(parsed(ADDRESS, 'h:80')).to(NUMBER).remove())
      ).toBe('h');
    });

    it('must leave a missing part missing', () => {
      const tree = parsed(PORT, 'h');

      expect(PORT.in(tree).elements().at(1).value().remove()).toEqual(tree);
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

  describe('element, first and last', () => {
    const digits = (input: string) =>
      PORT.in(parsed(PORT, input)).elements().at(1).value().at(1);

    it('must narrow to the element of a repetition at the index', () => {
      expect(String(digits('h:123').element(1).find())).toBe('2');
      expect(String(digits('h:123').first().find())).toBe('1');
      expect(String(digits('h:123').last().find())).toBe('3');
    });

    it('must set the element from text', () => {
      const set = digits('h:123').last().set('9');

      assert(set.ok());
      expect(String(set.value())).toBe('h:129');
    });

    it('must remove the element', () => {
      expect(String(digits('h:123').first().remove())).toBe('h:23');
    });

    it('must select nothing past the last element', () => {
      const tree = parsed(PORT, 'h:1');

      expect(
        PORT.in(tree).elements().at(1).value().at(1).element(1).find()
      ).toBeUndefined();
      expect(
        PORT.in(tree).elements().at(1).value().at(1).element(1).remove()
      ).toEqual(tree);
    });
  });

  describe('insert, append and prepend', () => {
    const digits = (input: string) =>
      PORT.in(parsed(PORT, input)).elements().at(1).value().at(1);

    it('must insert an element at the index', () => {
      expect(String(digits('h:13').insert(1, parsed(DIGIT, '2')))).toBe(
        'h:123'
      );
    });

    it('must count a negative index from the end', () => {
      expect(String(digits('h:13').insert(-1, parsed(DIGIT, '2')))).toBe(
        'h:123'
      );
    });

    it('must insert an element from text', () => {
      const inserted = digits('h:13').insert(1, '2');

      assert(inserted.ok());
      expect(String(inserted.value())).toBe('h:123');
    });

    it('must refuse text the element does not accept', () => {
      expect(digits('h:13').insert(1, 'x').ok()).toBe(false);
    });

    it('must append and prepend an element', () => {
      expect(String(digits('h:2').append(parsed(DIGIT, '3')))).toBe('h:23');
      expect(String(digits('h:2').prepend(parsed(DIGIT, '1')))).toBe('h:12');
    });

    it('must append and prepend an element from text', () => {
      const appended = digits('h:2').append('3');
      const prepended = digits('h:2').prepend('1');

      assert(appended.ok() && prepended.ok());
      expect(String(appended.value())).toBe('h:23');
      expect(String(prepended.value())).toBe('h:12');
    });

    it('must create the parts around a missing repetition', () => {
      const appended = digits('h').append('8');

      assert(appended.ok());
      expect(String(appended.value())).toBe('h:8');
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
