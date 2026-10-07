import { assert, describe, expect, expectTypeOf, it } from 'vitest';

import { CodePoint } from '@fundamentry/scalar';

import {
  Choice,
  Character,
  type Nonterminal,
  type Option,
  Repetition,
  type Selection,
  Sequence,
  type Literal,
} from '#project/tree';

import { Rule } from './Rule.js';

const character = (char: string) => new Character(CodePoint.of(char));

const literal = (value: string) => new Sequence(Array.from(value, character));

const DIGIT = new Rule('DIGIT', codec => codec.character(['0', '9']));

const NUMBER = new Rule('number', codec =>
  DIGIT.oneOrMore().or(codec.literal('-'))
);

type List = Nonterminal<
  'list',
  Choice<
    [
      Sequence<readonly [List, Literal, Rule.Value<typeof DIGIT>]>,
      Rule.Value<typeof DIGIT>,
    ]
  >
>;

const LIST: Rule.Of<List> = new Rule('list', codec =>
  codec.choice(codec.sequence(LIST, codec.literal(','), DIGIT), DIGIT)
);

const seven = new Character(CodePoint.of('7'));

describe('Rule', () => {
  describe('name', () => {
    it('must return the name it was made with', () => {
      expect(DIGIT.name()).toBe('DIGIT');
    });
  });

  describe('parse', () => {
    it('must parse into a nonterminal of the rule', () => {
      const parsed = DIGIT.parse('7');

      assert(parsed.ok());
      expect(parsed.value()).toEqual(DIGIT.node(seven));
    });

    it('must parse a rule that refers to itself', () => {
      const parsed = LIST.parse('1,2,3');

      assert(parsed.ok());
      expect(String(parsed.value())).toBe('1,2,3');
    });
  });

  describe('print', () => {
    it('must print a node of the rule', () => {
      const printed = DIGIT.print(DIGIT.node(seven));

      assert(printed.ok());
      expect(printed.value()).toBe('7');
    });

    it('must refuse a node whose elements the rule does not produce', () => {
      expect(DIGIT.print(DIGIT.node(character('x'))).ok()).toBe(false);
    });

    it('must refuse a node of another rule of the same name', () => {
      const other = new Rule('DIGIT', codec => codec.character(['0', '9']));
      const printed = DIGIT.print(other.node(seven));

      assert(!printed.ok());
      expect(String(printed.error())).toBe("at /DIGIT: '7' is not DIGIT");
    });
  });

  describe('definitions', () => {
    it('must define every rule it reaches by name', () => {
      expect(Array.from(NUMBER.definitions(), String)).toEqual([
        'number = 1*DIGIT / "-"',
        'DIGIT = %x30-39',
      ]);
    });

    it('must reject two different rules of the same name', () => {
      const other = new Rule('DIGIT', codec => codec.character('x'));
      const BOTH = new Rule('both', codec => codec.sequence(DIGIT, other));

      expect(() => Array.from(BOTH.definitions())).toThrow(
        "Two different rules are named 'DIGIT'"
      );
    });
  });

  describe('caseless', () => {
    it('must leave the rules it refers to as they are', () => {
      const X = new Rule('x', codec => codec.literal('x'));
      const BOTH = new Rule('both', codec =>
        codec.sequence(codec.literal('a'), X).caseless()
      );

      expect(BOTH.parse('Ax').ok()).toBe(true);
      expect(BOTH.parse('AX').ok()).toBe(false);
    });
  });

  describe('node', () => {
    it('must make a nonterminal of the rule', () => {
      const node = DIGIT.node(seven);

      expect(node.elements()).toBe(seven);
      expect(node.rule()).toBe(DIGIT);
    });

    it('must parse into a nonterminal that refers to the rule itself', () => {
      const parsed = DIGIT.parse('7');

      assert(parsed.ok());
      expect(parsed.value().rule()).toBe(DIGIT);
    });
  });

  describe('is', () => {
    it('must hold for a node of the rule', () => {
      expect(DIGIT.is(DIGIT.node(seven))).toBe(true);
    });

    it('must not hold for a node of another rule of the same name', () => {
      const other = new Rule('DIGIT', codec => codec.character(['0', '9']));

      expect(DIGIT.is(other.node(seven))).toBe(false);
    });

    it('must not hold for a node that is not a nonterminal', () => {
      expect(DIGIT.is(seven)).toBe(false);
    });
  });

  describe('in', () => {
    it('must select every outermost node of the rule', () => {
      const parsed = LIST.parse('1,2,3');

      assert(parsed.ok());

      const changed = DIGIT.in(parsed.value()).set(DIGIT.node(seven));

      expect(String(changed)).toBe('7,7,7');
    });

    it('must hand only the outermost node of a nested rule to the update', () => {
      const parsed = LIST.parse('1,2,3');

      assert(parsed.ok());

      const updated: string[] = [];

      LIST.in(parsed.value()).modify(list => {
        updated.push(String(list));

        return list;
      });

      expect(updated).toEqual(['1,2,3']);
    });

    it('must type the selection by the rule and the tree', () => {
      const tree = new Sequence([DIGIT.node(seven), seven] as const);

      expectTypeOf(DIGIT.in(tree)).toEqualTypeOf<
        Selection<
          Sequence<readonly [Nonterminal<'DIGIT', Character>, Character]>,
          Nonterminal<'DIGIT', Character>
        >
      >();
    });
  });

  describe('Value', () => {
    it('must be the nonterminal the rule produces', () => {
      expectTypeOf<Rule.Value<typeof DIGIT>>().toEqualTypeOf<
        Nonterminal<'DIGIT', Character>
      >();
    });
  });

  describe('grouping', () => {
    const SIGN = new Rule('sign', codec =>
      codec.choice(codec.literal('+'), codec.literal('-'))
    );
    const SIGNED = new Rule('signed', codec => codec.choice(SIGN, DIGIT));

    it('must keep an alternation behind a rule as one alternative', () => {
      expectTypeOf<Rule.Value<typeof SIGNED>>().toEqualTypeOf<
        Nonterminal<
          'signed',
          Choice<[Rule.Value<typeof SIGN>, Rule.Value<typeof DIGIT>]>
        >
      >();

      const parsed = SIGNED.parse('-');

      assert(parsed.ok());
      expect(parsed.value()).toEqual(
        SIGNED.node(new Choice(0, SIGN.node(new Choice(1, literal('-')))))
      );
    });
  });

  describe('recursion', () => {
    type Nested = Nonterminal<
      'nested',
      Sequence<
        readonly [
          Literal,
          Repetition<Choice<[Rule.Value<typeof DIGIT>, Nested]>>,
          Literal,
        ]
      >
    >;

    const NESTED: Rule.Of<Nested> = new Rule('nested', codec =>
      codec.sequence(
        codec.literal('('),
        codec.choice(DIGIT, NESTED).many(),
        codec.literal(')')
      )
    );

    const printed = (rule: typeof NESTED, input: string) => {
      const parsed = rule.parse(input);

      assert(parsed.ok());

      const output = rule.print(parsed.value());

      assert(output.ok());

      return output.value();
    };

    it('must parse a rule that refers to itself', () => {
      const parsed = NESTED.parse('(())');

      assert(parsed.ok());
      expect(parsed.value()).toEqual(
        NESTED.node(
          new Sequence([
            literal('('),
            new Repetition([
              new Choice(
                1,
                NESTED.node(
                  new Sequence([
                    literal('('),
                    new Repetition([]),
                    literal(')'),
                  ] as const)
                )
              ),
            ]),
            literal(')'),
          ] as const)
        )
      );
    });

    it('must print what it parses', () => {
      expect(printed(NESTED, '(1(2)3)')).toBe('(1(2)3)');
    });

    it('must be stack-safe and linear on deeply nested input', () => {
      const depth = 10_000;
      const start = performance.now();

      expect(
        NESTED.parse(`${'('.repeat(depth)}${')'.repeat(depth)}`).ok()
      ).toBe(true);
      expect(performance.now() - start).toBeLessThan(5_000);
    });

    it('must parse rules that refer to each other', () => {
      type Odd = Nonterminal<
        'odd',
        Sequence<readonly [Rule.Value<typeof DIGIT>, Option<Even>]>
      >;
      type Even = Nonterminal<
        'even',
        Sequence<readonly [Character, Option<Odd>]>
      >;

      const ODD: Rule.Of<Odd> = new Rule('odd', codec =>
        codec.sequence(DIGIT, EVEN.optional())
      );
      const EVEN: Rule.Of<Even> = new Rule('even', codec =>
        codec.sequence(codec.character(['a', 'z']), ODD.optional())
      );

      expect(ODD.parse('1a2').ok()).toBe(true);
      expect(ODD.parse('1a').ok()).toBe(true);
      expect(ODD.parse('12').ok()).toBe(false);
    });

    it('must report a rule that fails where it starts by its name', () => {
      const START = new Rule('start', codec =>
        codec.choice(codec.character(['a', 'z']), NESTED)
      );
      const parsed = START.parse('1');

      assert(!parsed.ok());
      expect(String(parsed.error())).toBe("Expected start, got '1'");
    });

    it('must report the rules it refers to by their names where it stops short', () => {
      const parsed = NESTED.parse('((1)');

      assert(!parsed.ok());
      expect(String(parsed.error())).toBe(
        'Expected DIGIT, nested, or ")", got end of input'
      );
    });

    it('must report what a rule expects once it has started', () => {
      const parsed = NESTED.parse('(x');

      assert(!parsed.ok());
      expect(String(parsed.error())).toBe(
        'Expected DIGIT, nested, or ")", got \'x\''
      );
    });

    it('must resolve its body once, however often it parses and prints', () => {
      const resolved: string[] = [];
      const ONCE = new Rule('once', codec => {
        resolved.push('once');

        return codec.character(['0', '9']);
      });

      ONCE.parse('1');
      ONCE.parse('2');
      ONCE.print(ONCE.node(character('3')));

      expect(resolved).toEqual(['once']);
    });

    describe('left recursion', () => {
      type Sum = Nonterminal<
        'sum',
        Choice<
          [
            Sequence<readonly [Sum, Literal, Rule.Value<typeof DIGIT>]>,
            Rule.Value<typeof DIGIT>,
          ]
        >
      >;

      const SUM: Rule.Of<Sum> = new Rule('sum', codec =>
        codec.choice(codec.sequence(SUM, codec.literal('+'), DIGIT), DIGIT)
      );

      const digit = (char: string) => DIGIT.node(character(char));

      it('must parse a rule that starts with itself, associating to the left', () => {
        const parsed = SUM.parse('1+2+3');

        assert(parsed.ok());
        expect(parsed.value()).toEqual(
          SUM.node(
            new Choice(
              0,
              new Sequence([
                SUM.node(
                  new Choice(
                    0,
                    new Sequence([
                      SUM.node(new Choice(1, digit('1'))),
                      literal('+'),
                      digit('2'),
                    ] as const)
                  )
                ),
                literal('+'),
                digit('3'),
              ] as const)
            )
          )
        );
      });

      it('must parse the base case of a rule that starts with itself', () => {
        const parsed = SUM.parse('1');

        assert(parsed.ok());
        expect(parsed.value()).toEqual(SUM.node(new Choice(1, digit('1'))));
      });

      it('must print what it parses', () => {
        const parsed = SUM.parse('1+2+3');

        assert(parsed.ok());

        const output = SUM.print(parsed.value());

        assert(output.ok());
        expect(output.value()).toBe('1+2+3');
      });

      it('must report how far a rule that starts with itself got', () => {
        const parsed = SUM.parse('1+2+x');

        assert(!parsed.ok());
        expect(String(parsed.error())).toBe("Expected DIGIT, got 'x'");
        expect(parsed.error().offset()).toBe(4);
      });

      it('must parse rules that start with each other', () => {
        type Term = Nonterminal<
          'term',
          Choice<
            [Sequence<readonly [Factor, Character]>, Rule.Value<typeof DIGIT>]
          >
        >;
        type Factor = Nonterminal<
          'factor',
          Choice<[Sequence<readonly [Term, Literal]>, Character]>
        >;

        const TERM: Rule.Of<Term> = new Rule('term', codec =>
          codec.choice(
            codec.sequence(FACTOR, codec.character(['a', 'z'])),
            DIGIT
          )
        );
        const FACTOR: Rule.Of<Factor> = new Rule('factor', codec =>
          codec.choice(
            codec.sequence(TERM, codec.literal('+')),
            codec.character(['a', 'z'])
          )
        );

        expect(TERM.parse('1+a+b').ok()).toBe(true);
        expect(TERM.parse('ab').ok()).toBe(true);
        expect(TERM.parse('1+').ok()).toBe(false);
      });

      it('must parse a rule that starts with itself within another one', () => {
        type Sums = Nonterminal<
          'sums',
          Choice<[Sequence<readonly [Sums, Literal, Sum]>, Sum]>
        >;

        const SUMS: Rule.Of<Sums> = new Rule('sums', codec =>
          codec.choice(codec.sequence(SUMS, codec.literal(','), SUM), SUM)
        );
        const parsed = SUMS.parse('1+2,3,4+5');

        assert(parsed.ok());
        expect(String(parsed.value())).toBe('1+2,3,4+5');
      });

      it('must be stack-safe and fast on a long rule that starts with itself', () => {
        const input = Array.from({ length: 5_000 }, () => '1').join('+');
        const start = performance.now();

        expect(SUM.parse(input).ok()).toBe(true);
        expect(performance.now() - start).toBeLessThan(5_000);
      });
    });
  });
});
