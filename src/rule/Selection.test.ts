import { assert, describe, expect, expectTypeOf, it, vi } from 'vitest';

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

  describe('map', () => {
    it('must project each value that exists', () => {
      expect(
        DIGIT.in(parsed(PORT, 'h:12'))
          .map(String)
          .map(Number)
          .values()
          .toArray()
      ).toEqual([1, 2]);
    });

    it('must project nothing where the part is missing', () => {
      expect(
        PORT.in(parsed(PORT, 'h')).elements().at(1).value().map(String).find()
      ).toBeUndefined();
    });

    it('must build a nested value only where its part exists', () => {
      const address = (input: string) =>
        PORT.in(parsed(PORT, input))
          .elements()
          .at(1)
          .value()
          .map(port => ({
            digits: DIGIT.in(port).map(String).values().toArray(),
          }))
          .find();

      expect(address('h:12')).toEqual({ digits: ['1', '2'] });
      expect(address('h')).toBeUndefined();
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

    it('must find nothing where the place is missing', () => {
      expect(
        ADDRESS.in(parsed(ADDRESS, 'h')).to(NUMBER).find()
      ).toBeUndefined();
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

    it('must not take another alternative to create a missing place', () => {
      const AMOUNT = new Rule('amount', codec =>
        codec.choice(
          codec.literal('+'),
          codec.sequence(codec.literal('-'), NUMBER)
        )
      );

      const tree = parsed(AMOUNT, '+');
      const result = AMOUNT.in(tree).to(NUMBER).set('5');

      assert(result.ok());
      expect(result.value()).toBe(tree);
    });

    describe('on routes that cannot meet in one tree', () => {
      const PATH = new Rule('path', codec =>
        codec.sequence(codec.literal('/'), NUMBER.optional())
      );

      const LOCATION = new Rule('location', codec =>
        codec.choice(
          codec.sequence(codec.literal('h'), codec.literal(':'), PATH),
          PATH
        )
      );

      const number = (input: string) =>
        LOCATION.in(parsed(LOCATION, input)).to(NUMBER);

      const set = (input: string, text: string) => {
        const result = number(input).set(text);

        assert(result.ok());

        return String(result.value());
      };

      it('must narrow to the place on whichever route the tree takes', () => {
        expect(String(number('h:/12').find())).toBe('12');
        expect(String(number('/34').find())).toBe('34');
      });

      it('must set the place on whichever route the tree takes', () => {
        expect(set('h:/12', '7')).toBe('h:/7');
        expect(set('/34', '7')).toBe('/7');
      });

      it('must create a missing place on the route the tree takes', () => {
        expect(set('h:/', '7')).toBe('h:/7');
        expect(set('/', '7')).toBe('/7');
      });

      it('must step into the place on whichever route the tree takes', () => {
        const result = number('/34').elements().element(-1).set('5');

        assert(result.ok());
        expect(String(result.value())).toBe('/35');
      });
    });

    it('must refuse a rule found in more than one place', () => {
      const RANGE = new Rule('range', codec =>
        codec.sequence(NUMBER, codec.literal('-'), NUMBER)
      );

      expect(() => RANGE.in(parsed(RANGE, '1-2')).to(NUMBER)).toThrow(
        new RangeError(
          'Routes /range/sequence[0]/number and /range/sequence[2]/number can meet in one tree'
        )
      );
    });

    it('must refuse a rule found only within a repetition', () => {
      expect(() => NUMBER.in(parsed(NUMBER, '12')).to(DIGIT)).toThrow(
        new RangeError('0 routes lead to DIGIT')
      );
    });
  });

  describe('to several rules', () => {
    const ALPHA = new Rule('ALPHA', codec => codec.character(['a', 'z']));

    const ABEMPTY = new Rule('abempty', codec =>
      codec.sequence(codec.literal('/'), ALPHA).many()
    );

    const ABSOLUTE = new Rule('absolute', codec =>
      codec.sequence(codec.literal('/'), ALPHA.many())
    );

    const ROOTLESS = new Rule('rootless', codec =>
      codec.sequence(ALPHA, ALPHA.many())
    );

    const EMPTY = new Rule('empty', codec => codec.literal(''));

    const IRI = new Rule('iri', codec =>
      codec.sequence(
        ALPHA,
        codec.literal(':'),
        codec.choice(
          codec.sequence(codec.literal('//'), ALPHA.many(), ABEMPTY),
          ABSOLUTE,
          ROOTLESS,
          EMPTY
        )
      )
    );

    const PATH = Rule.any(ABEMPTY, ABSOLUTE, ROOTLESS, EMPTY);

    const path = (input: string) => IRI.in(parsed(IRI, input)).to(PATH);

    const set = (input: string, text: string) => {
      const result = path(input).set(text);

      assert(result.ok());

      return result.value();
    };

    it('must narrow to whichever of the rules the tree has', () => {
      expect(String(path('s:/a').find())).toBe('/a');
      expect(String(path('s://h/a').find())).toBe('/a');
      expect(String(path('s:ab').find())).toBe('ab');
    });

    it('must keep the rule the tree has when it accepts the text', () => {
      const tree = set('s:/a', '/b');

      expect(String(tree)).toBe('s:/b');
      expect(IRI.in(tree).to(ABSOLUTE).find()).toBeDefined();
    });

    it('must take another alternative whose rule accepts the text', () => {
      const tree = set('s:', 'ab');

      expect(String(tree)).toBe('s:ab');
      expect(IRI.in(tree).to(ROOTLESS).find()).toBeDefined();
    });

    it('must take another alternative even for the text it has by default', () => {
      const tree = set('s:ab', '');

      expect(String(tree)).toBe('s:');
      expect(IRI.in(tree).to(EMPTY).find()).toBeDefined();
    });

    it('must take the alternative of a node of another of the rules', () => {
      const tree = path('s:/a').set(parsed(ROOTLESS, 'ab'));

      expect(String(tree)).toBe('s:ab');
      expect(IRI.in(tree).to(ROOTLESS).find()).toBeDefined();
    });

    it('must refuse a node of a rule that cannot take the place', () => {
      expect(() => path('s:/a').set(parsed(ABEMPTY, '/b'))).toThrow(
        new RangeError(
          "'/b' cannot take the place of /iri/sequence[2]/choice[1]/absolute"
        )
      );
    });

    it('must rewrite the text the tree has', () => {
      const edited = path('s:/a').edit(text => `${text}b`);

      assert(edited.ok());
      expect(String(edited.value())).toBe('s:/ab');
    });

    it('must refuse text the rule cannot take without changing the parts around it', () => {
      expect(path('s://h/a').set('b').ok()).toBe(false);
    });

    it('must report why the rule the tree has refuses the text', () => {
      const result = path('s:ab').set('1');
      const refused = ROOTLESS.parse('1');

      assert(!result.ok());
      assert(!refused.ok());
      expect(result.error()).toEqual(refused.error());
    });

    it('must prefer the rule the tree has over an earlier alternative', () => {
      const WORD = new Rule('word', () => ALPHA.many());

      const NAME = new Rule('name', codec => codec.choice(ALPHA, DIGIT).many());

      const TAG = new Rule('tag', codec => codec.choice(WORD, NAME));

      const result = TAG.in(parsed(TAG, '1')).to(Rule.any(WORD, NAME)).set('a');

      assert(result.ok());
      expect(TAG.in(result.value()).to(NAME).find()).toBeDefined();
    });

    it('must create a missing place on the way to it', () => {
      const NUMBER = new Rule('number', () => DIGIT.many());

      const ADDRESS = new Rule('address', codec =>
        codec.sequence(
          codec.literal('h'),
          codec.sequence(codec.literal(':'), NUMBER).optional()
        )
      );

      const result = ADDRESS.in(parsed(ADDRESS, 'h'))
        .to(Rule.any(NUMBER))
        .set('80');

      assert(result.ok());
      expect(String(result.value())).toBe('h:80');
    });

    it('must not take another alternative to create a missing place', () => {
      const NUMBER = new Rule('number', () => DIGIT.many());

      const AMOUNT = new Rule('amount', codec =>
        codec.choice(
          codec.literal('+'),
          codec.sequence(codec.literal('-'), NUMBER)
        )
      );

      const tree = parsed(AMOUNT, '+');
      const result = AMOUNT.in(tree).to(Rule.any(NUMBER)).set('5');

      assert(result.ok());
      expect(result.value()).toBe(tree);
    });

    it('must remove whichever of the rules the tree has', () => {
      const NUMBER = new Rule('number', () => DIGIT.many());

      const ADDRESS = new Rule('address', codec =>
        codec.sequence(
          codec.literal('h'),
          codec.sequence(codec.literal(':'), NUMBER).optional()
        )
      );

      expect(
        String(
          ADDRESS.in(parsed(ADDRESS, 'h:12')).to(Rule.any(NUMBER)).remove()
        )
      ).toBe('h');
    });

    it('must refuse rules that can meet in one tree', () => {
      const RANGE = new Rule('range', codec =>
        codec.sequence(ALPHA, codec.literal('-'), DIGIT)
      );

      expect(() =>
        RANGE.in(parsed(RANGE, 'a-1')).to(Rule.any(ALPHA, DIGIT))
      ).toThrow(
        new RangeError(
          'Routes /range/sequence[0]/ALPHA and /range/sequence[2]/DIGIT can meet in one tree'
        )
      );
    });

    it('must type the selection as the nodes of any of the rules', () => {
      expectTypeOf(path('s:').find()).toEqualTypeOf<
        | Rule.Value<typeof ABEMPTY>
        | Rule.Value<typeof ABSOLUTE>
        | Rule.Value<typeof ROOTLESS>
        | Rule.Value<typeof EMPTY>
        | undefined
      >();
    });

    it('must not step into the parts of the rules', () => {
      // @ts-expect-error the rules have no parts in common
      expect(() => path('s:').elements()).toThrow();
    });

    it('must select the nodes of a rule within whichever of the rules the tree has', () => {
      expect(
        path('s://h/a/b').within(ALPHA).values().map(String).toArray()
      ).toEqual(['a', 'b']);
    });
  });

  describe('within', () => {
    const PAIR = new Rule('pair', codec =>
      codec.sequence(PORT, codec.literal(','), PORT)
    );

    const second = (input: string) =>
      PAIR.in(parsed(PAIR, input)).elements().at(2);

    it('must select the outermost nodes of the rule within each value', () => {
      expect(
        second('h:12,h:34').within(DIGIT).values().map(String).toArray()
      ).toEqual(['3', '4']);
    });

    it('must select nothing within a value without the rule', () => {
      expect(second('h:12,h').within(DIGIT).find()).toBeUndefined();
    });

    it('must set text only within the values', () => {
      const set = second('h:12,h:34').within(DIGIT).set('7');

      assert(set.ok());
      expect(String(set.value())).toBe('h:12,h:77');
    });

    it('must edit text only within the values', () => {
      const edited = second('h:12,h:34')
        .within(DIGIT)
        .edit(digit => String(Number(digit) + 1));

      assert(edited.ok());
      expect(String(edited.value())).toBe('h:12,h:45');
    });

    it('must remove only within the values', () => {
      expect(String(second('h:12,h:34').within(DIGIT).remove())).toBe(
        'h:12,h:'
      );
    });

    it('must navigate from the nodes it selects', () => {
      const set = PAIR.in(parsed(PAIR, 'h:1,h:2'))
        .within(PORT)
        .elements()
        .at(1)
        .set(':5');

      assert(set.ok());
      expect(String(set.value())).toBe('h:5,h:5');
    });

    it('must type the selection as the nodes of the rule', () => {
      expectTypeOf(second('h,h').within(DIGIT).find()).toEqualTypeOf<
        Rule.Value<typeof DIGIT> | undefined
      >();
    });

    describe('several rules', () => {
      const ALPHA = new Rule('ALPHA', codec => codec.character(['a', 'z']));

      const WORD = new Rule('word', codec => codec.choice(DIGIT, ALPHA).many());

      const LABEL = new Rule('label', codec =>
        codec.sequence(WORD, codec.literal(':'), WORD)
      );

      const CHARACTERS = Rule.any(DIGIT, ALPHA);

      const right = (input: string) =>
        LABEL.in(parsed(LABEL, input)).elements().at(2);

      it('must select the nodes of any of the rules within each value', () => {
        expect(
          right('a1:b2').within(CHARACTERS).values().map(String).toArray()
        ).toEqual(['b', '2']);
      });

      it('must parse the text of each node with its own rule', () => {
        const edited = right('a1:b2')
          .within(CHARACTERS)
          .edit(text => (/\d/u.test(text) ? '9' : 'z'));

        assert(edited.ok());
        expect(String(edited.value())).toBe('a1:z9');
      });

      it('must refuse text the rule of a node does not accept', () => {
        const set = right('a1:b2').within(CHARACTERS).set('c');

        assert(!set.ok());
        expect(String(set.error())).toBe("Expected DIGIT, got 'c'");
      });

      it('must remove the nodes of any of the rules', () => {
        expect(String(right('a1:b2').within(CHARACTERS).remove())).toBe('a1:');
      });

      it('must type the selection as the nodes of any of the rules', () => {
        expectTypeOf(right('a:b').within(CHARACTERS).find()).toEqualTypeOf<
          Rule.Value<typeof DIGIT> | Rule.Value<typeof ALPHA> | undefined
        >();
      });

      it('must not step into the parts of the rules', () => {
        // @ts-expect-error the rules have no parts in common
        expect(() => right('a:b').within(CHARACTERS).elements()).toThrow();
      });
    });
  });

  describe('edit', () => {
    it('must rewrite each selected part from its own text', () => {
      const edited = DIGIT.in(parsed(PORT, 'h:12')).edit(digit =>
        String(Number(digit) + 1)
      );

      assert(edited.ok());
      expect(String(edited.value())).toBe('h:23');
    });

    it('must refuse the whole edit when any text does not parse', () => {
      const edited = DIGIT.in(parsed(PORT, 'h:19')).edit(digit =>
        String(Number(digit) + 1)
      );

      assert(!edited.ok());
      expect(String(edited.error())).toBe("Expected end of input, got '0'");
    });

    it('must read the text of each selected part once', () => {
      const update = vi.fn((digit: string) => digit);

      DIGIT.in(parsed(PORT, 'h:12')).edit(update);

      expect(update.mock.calls).toEqual([['1'], ['2']]);
    });

    it('must create a missing part when its default text changes', () => {
      const edited = PORT.in(parsed(PORT, 'h'))
        .elements()
        .at(1)
        .value()
        .at(1)
        .edit(digits => digits || '80');

      assert(edited.ok());
      expect(String(edited.value())).toBe('h:80');
    });

    it('must refuse text a missing part does not accept', () => {
      const edited = PORT.in(parsed(PORT, 'h'))
        .elements()
        .at(1)
        .value()
        .at(1)
        .edit(() => 'x');

      assert(!edited.ok());
      expect(String(edited.error())).toBe(
        "Expected DIGIT or end of input, got 'x'"
      );
    });

    it('must leave a missing part missing when its default text stays', () => {
      const tree = parsed(PORT, 'h');
      const edited = PORT.in(tree)
        .elements()
        .at(1)
        .value()
        .at(1)
        .edit(digits => digits);

      assert(edited.ok());
      expect(edited.value()).toEqual(tree);
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

    it('must find nothing where the option is absent', () => {
      expect(port('h').find()).toBeUndefined();
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
