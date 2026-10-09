import { describe, expect, it, vi } from 'vitest';

import { FallibleMorphism, PartialIso } from '@fundamentry/category';
import { Failure, Success } from '@fundamentry/coproduct';
import { Range } from '@fundamentry/range';
import { CodePoint, Integer } from '@fundamentry/scalar';

import { Named } from '#project/expectation';
import {
  Alternation,
  Concatenation,
  type Expression,
  Label,
  Optional,
  Reference,
  Repetition as Repeated,
  Rule,
  Separated,
  Terminal,
} from '#project/expression';
import { Misprint } from '#project/misprint';
import {
  Choice,
  Character,
  type Node,
  Nonterminal,
  Option,
  Repetition,
  Sequence,
} from '#project/tree';

import { Printer } from './Printer.js';

const isDigit = (codePoint: CodePoint) => /\d/u.test(codePoint.toString());

const digit = new Terminal(
  PartialIso.of(
    FallibleMorphism.of((token: CodePoint) =>
      isDigit(token)
        ? new Success(new Character(token))
        : new Failure(`'${token.toString()}' is not a digit`)
    ),
    FallibleMorphism.of((value: Character) =>
      isDigit(value.codePoint())
        ? new Success(value.codePoint())
        : new Failure(`'${value.toString()}' is not a digit`)
    )
  ),
  new Named('a digit')
);

const character = (text: string) => new Character(CodePoint.of(text));

const characters = (text: string) => Array.from(text, character);

const print = (expression: Expression<CodePoint>, value: Node) =>
  new Printer(expression).print(value).map(rope => [...rope]);

const printed = (text: string) => new Success(Array.from(text, CodePoint.of));

const misprint = (message: string, ...path: readonly Misprint.Step[]) =>
  new Failure(new Misprint(path, message));

describe('Printer', () => {
  describe('constructor', () => {
    it('must compile a subexpression shared by several nodes once, however often it prints', () => {
      const compilations = vi.fn();
      const shared: Expression<CodePoint> = {
        accept: (visitor, input) => {
          compilations();

          return digit.accept(visitor, input);
        },
      };

      const printer = new Printer(new Concatenation([shared, shared]));

      printer.print(new Sequence(characters('12')));
      printer.print(new Sequence(characters('34')));

      expect(compilations).toHaveBeenCalledOnce();
    });
  });

  describe('terminal', () => {
    it('must print the token its value converts back to', () => {
      expect(print(digit, character('1'))).toEqual(printed('1'));
    });

    it('must report why its value does not convert back', () => {
      expect(print(digit, character('x'))).toEqual(
        misprint("'x' is not a digit")
      );
    });
  });

  describe('concatenation', () => {
    const pair = new Concatenation([digit, digit]);

    it('must print its elements in order', () => {
      expect(print(pair, new Sequence(characters('12')))).toEqual(
        printed('12')
      );
    });

    it('must place a misprint of an element under its index', () => {
      expect(print(pair, new Sequence(characters('1x')))).toEqual(
        misprint("'x' is not a digit", { node: 'sequence', index: 1 })
      );
    });

    it('must reject too few elements', () => {
      expect(print(pair, new Sequence(characters('1')))).toEqual(
        misprint('Expected a 2-tuple, got 1 items')
      );
    });

    it('must reject too many elements', () => {
      expect(print(pair, new Sequence(characters('123')))).toEqual(
        misprint('Expected a 2-tuple, got 3 items')
      );
    });

    it('must reject a value that is not a sequence', () => {
      expect(print(pair, character('1'))).toEqual(
        misprint("Expected a sequence, got '1'")
      );
    });
  });

  describe('alternation', () => {
    const letter = new Terminal(
      PartialIso.of(
        FallibleMorphism.of(
          (token: CodePoint) => new Success(new Character(token))
        ),
        FallibleMorphism.of(
          (value: Character) => new Success(value.codePoint())
        )
      ),
      new Named('a letter')
    );
    const either = new Alternation([digit, letter]);

    it.each([
      [0, '1'],
      [1, 'x'],
    ])('must print the alternative a choice took at %d', (index, text) => {
      expect(print(either, new Choice(index, character(text)))).toEqual(
        printed(text)
      );
    });

    it('must place a misprint of an alternative under its index', () => {
      expect(
        print(
          new Alternation([letter, letter, digit]),
          new Choice(2, character('x'))
        )
      ).toEqual(misprint("'x' is not a digit", { node: 'choice', index: 2 }));
    });

    it('must throw for a choice of an alternative it does not have', () => {
      expect(() => print(either, new Choice(2, character('x')))).toThrow(
        new RangeError('No case for alternative 2 of 2')
      );
    });

    it('must reject a value that is not a choice', () => {
      expect(print(either, character('x'))).toEqual(
        misprint("Expected a choice, got 'x'")
      );
    });
  });

  describe('optional', () => {
    const maybe = new Optional(digit);

    it('must print nothing for an absent value', () => {
      expect(print(maybe, new Option())).toEqual(printed(''));
    });

    it('must print a present value with its element', () => {
      expect(print(maybe, new Option(character('1')))).toEqual(printed('1'));
    });

    it('must place a misprint of its element under the option', () => {
      expect(print(maybe, new Option(character('x')))).toEqual(
        misprint("'x' is not a digit", { node: 'option' })
      );
    });

    it('must reject a value that is not an option', () => {
      expect(print(maybe, character('1'))).toEqual(
        misprint("Expected an option, got '1'")
      );
    });
  });

  describe('repetition', () => {
    const digits = new Repeated(
      digit,
      Range.open(Integer.of(0), Integer.of(3))
    );

    it('must print each of its values in order', () => {
      expect(print(digits, new Repetition(characters('12')))).toEqual(
        printed('12')
      );
    });

    it('must place a misprint of a value under its index', () => {
      expect(print(digits, new Repetition(characters('1x')))).toEqual(
        misprint("'x' is not a digit", { node: 'repetition', index: 1 })
      );
    });

    it('must reject a count outside its bounds', () => {
      expect(print(digits, new Repetition(characters('123')))).toEqual(
        misprint('Expected a count in (0..3), got 3')
      );
    });

    it('must reject a value that is not a repetition', () => {
      expect(print(digits, character('1'))).toEqual(
        misprint("Expected a repetition, got '1'")
      );
    });
  });

  describe('separated', () => {
    const digits = new Separated(digit, digit, Range.atLeast(Integer.of(1)));

    it('must print its elements with the separators between them', () => {
      expect(
        print(digits, new Repetition(characters('13'), [character('2')]))
      ).toEqual(printed('123'));
    });

    it('must reject a count outside its bounds', () => {
      expect(print(digits, new Repetition([], []))).toEqual(
        misprint('Expected a count in [1..+∞), got 0')
      );
    });

    it('must reject a list without one separator between each element', () => {
      expect(print(digits, new Repetition(characters('13'), []))).toEqual(
        misprint('Expected 1 separators, got 0')
      );
    });

    it('must reject a value that is not a repetition', () => {
      expect(print(digits, character('1'))).toEqual(
        misprint("Expected a repetition, got '1'")
      );
    });
  });

  describe('label', () => {
    const number = new Label(digit, new Named('a number'));

    it('must print through its element', () => {
      expect(print(number, character('1'))).toEqual(printed('1'));
    });

    it('must place a misprint of its element under the label', () => {
      expect(print(number, character('x'))).toEqual(
        misprint("'x' is not a digit", { node: 'label' })
      );
    });
  });

  describe('rule', () => {
    const rule = { name: () => 'DIGIT' };
    const DIGIT = new Rule(digit, () => rule);

    it('must print the elements of a nonterminal of the rule', () => {
      expect(print(DIGIT, new Nonterminal(rule, character('1')))).toEqual(
        printed('1')
      );
    });

    it('must refuse a nonterminal of another rule of the same name', () => {
      const other = { name: () => 'DIGIT' };

      expect(print(DIGIT, new Nonterminal(other, character('1')))).toEqual(
        misprint("'1' is not DIGIT", { node: 'rule', name: 'DIGIT' })
      );
    });

    it('must refuse a value that is not a nonterminal', () => {
      expect(print(DIGIT, character('1'))).toEqual(
        misprint("'1' is not DIGIT", { node: 'rule', name: 'DIGIT' })
      );
    });

    it('must place a misprint of its elements under the rule, by name', () => {
      expect(print(DIGIT, new Nonterminal(rule, character('x')))).toEqual(
        misprint("'x' is not a digit", { node: 'rule', name: 'DIGIT' })
      );
    });
  });

  describe('reference', () => {
    it('must print through the expression it refers to', () => {
      expect(print(new Reference(() => digit), character('1'))).toEqual(
        printed('1')
      );
    });

    it('must print an expression that refers to itself', () => {
      const digits: Expression<CodePoint> = new Optional(
        new Concatenation([digit, new Reference(() => digits)])
      );

      expect(
        print(
          digits,
          new Option(
            new Sequence([
              character('1'),
              new Option(new Sequence([character('2'), new Option()])),
            ])
          )
        )
      ).toEqual(printed('12'));
    });
  });

  describe('print', () => {
    it('must place a nested misprint under every enclosing node, outermost first', () => {
      const expression = new Concatenation([
        digit,
        new Repeated(digit, Range.atLeast(Integer.of(0))),
      ]);

      expect(
        print(
          expression,
          new Sequence([character('1'), new Repetition(characters('12x'))])
        )
      ).toEqual(
        misprint(
          "'x' is not a digit",
          { node: 'sequence', index: 1 },
          { node: 'repetition', index: 2 }
        )
      );
    });
  });
});
