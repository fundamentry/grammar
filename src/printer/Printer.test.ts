import { describe, expect, it, vi } from 'vitest';

import { FallibleMorphism, PartialIso } from '@fundamentry/category';
import { Failure, Left, Right, Success } from '@fundamentry/coproduct';
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
  Refinement,
  Repetition as Repeated,
  Rule,
  Terminal,
} from '#project/expression';
import { Misprint } from '#project/misprint';
import {
  Choice,
  Literal,
  type Node,
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
        ? new Success(new Literal(token))
        : new Failure(`'${token.toString()}' is not a digit`)
    ),
    FallibleMorphism.of((value: Literal) =>
      isDigit(value.codePoint())
        ? new Success(value.codePoint())
        : new Failure(`'${value.toString()}' is not a digit`)
    )
  ),
  new Named('a digit')
);

const literal = (text: string) => new Literal(CodePoint.of(text));

const literals = (text: string) => Array.from(text, literal);

const print = (expression: Expression<CodePoint>, value: Node) =>
  new Printer(expression).print(value).map(rope => [...rope]);

const printed = (text: string) => new Success(Array.from(text, CodePoint.of));

const misprint = (message: string, ...path: readonly Misprint.Step[]) =>
  new Failure(
    path.reduceRight(
      (nested, step) => nested.within(step),
      Misprint.of(message)
    )
  );

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

      printer.print(new Sequence(literals('12')));
      printer.print(new Sequence(literals('34')));

      expect(compilations).toHaveBeenCalledOnce();
    });
  });

  describe('terminal', () => {
    it('must print the token its value converts back to', () => {
      expect(print(digit, literal('1'))).toEqual(printed('1'));
    });

    it('must report why its value does not convert back', () => {
      expect(print(digit, literal('x'))).toEqual(
        misprint("'x' is not a digit")
      );
    });
  });

  describe('concatenation', () => {
    const pair = new Concatenation([digit, digit]);

    it('must print its elements in order', () => {
      expect(print(pair, new Sequence(literals('12')))).toEqual(printed('12'));
    });

    it('must place a misprint of an element under its index', () => {
      expect(print(pair, new Sequence(literals('1x')))).toEqual(
        misprint("'x' is not a digit", { node: 'sequence', index: 1 })
      );
    });

    it('must reject too few elements', () => {
      expect(print(pair, new Sequence(literals('1')))).toEqual(
        misprint('Expected a 2-tuple, got 1 items')
      );
    });

    it('must reject too many elements', () => {
      expect(print(pair, new Sequence(literals('123')))).toEqual(
        misprint('Expected a 2-tuple, got 3 items')
      );
    });

    it('must reject a value that is not a sequence', () => {
      expect(print(pair, literal('1'))).toEqual(
        misprint("Expected a sequence, got '1'")
      );
    });
  });

  describe('alternation', () => {
    const letter = new Terminal(
      PartialIso.of(
        FallibleMorphism.of(
          (token: CodePoint) => new Success(new Literal(token))
        ),
        FallibleMorphism.of((value: Literal) => new Success(value.codePoint()))
      ),
      new Named('a letter')
    );
    const either = new Alternation([digit, letter]);

    it('must print a left choice with the left alternative', () => {
      expect(print(either, new Choice(new Left(literal('1'))))).toEqual(
        printed('1')
      );
    });

    it('must print a right choice with the right alternative', () => {
      expect(print(either, new Choice(new Right(literal('x'))))).toEqual(
        printed('x')
      );
    });

    it('must place a misprint of the left alternative under the left side', () => {
      expect(print(either, new Choice(new Left(literal('x'))))).toEqual(
        misprint("'x' is not a digit", { node: 'left' })
      );
    });

    it('must place a misprint of the right alternative under the right side', () => {
      expect(
        print(
          new Alternation([letter, digit]),
          new Choice(new Right(literal('x')))
        )
      ).toEqual(misprint("'x' is not a digit", { node: 'right' }));
    });

    it('must reject a value that is not a choice', () => {
      expect(print(either, literal('x'))).toEqual(
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
      expect(print(maybe, new Option(literal('1')))).toEqual(printed('1'));
    });

    it('must place a misprint of its element under the option', () => {
      expect(print(maybe, new Option(literal('x')))).toEqual(
        misprint("'x' is not a digit", { node: 'option' })
      );
    });

    it('must reject a value that is not an option', () => {
      expect(print(maybe, literal('1'))).toEqual(
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
      expect(print(digits, new Repetition(literals('12')))).toEqual(
        printed('12')
      );
    });

    it('must place a misprint of a value under its index', () => {
      expect(print(digits, new Repetition(literals('1x')))).toEqual(
        misprint("'x' is not a digit", { node: 'repetition', index: 1 })
      );
    });

    it('must reject a count outside its bounds', () => {
      expect(print(digits, new Repetition(literals('123')))).toEqual(
        misprint('Expected a count in (0..3), got 3')
      );
    });

    it('must reject a value that is not a repetition', () => {
      expect(print(digits, literal('1'))).toEqual(
        misprint("Expected a repetition, got '1'")
      );
    });
  });

  describe('refinement', () => {
    const isOdd = (value: Literal) => value.codePoint().value() % 2 === 1;
    const odd = new Refinement(
      digit,
      PartialIso.of(
        FallibleMorphism.fromPredicate(
          isOdd,
          (value: Literal) => `'${value.toString()}' is even`
        ),
        FallibleMorphism.fromPredicate(
          isOdd,
          (value: Literal) => `'${value.toString()}' is even`
        )
      )
    );

    it('must print the value its refinement converts back to', () => {
      expect(print(odd, literal('1'))).toEqual(printed('1'));
    });

    it('must report why its value does not convert back', () => {
      expect(print(odd, literal('2'))).toEqual(misprint("'2' is even"));
    });

    it('must place a misprint of its element under the refinement', () => {
      expect(print(odd, literal('a'))).toEqual(
        misprint("'a' is not a digit", { node: 'refinement' })
      );
    });
  });

  describe('label', () => {
    const number = new Label(digit, new Named('a number'));

    it('must print through its element', () => {
      expect(print(number, literal('1'))).toEqual(printed('1'));
    });

    it('must place a misprint of its element under the label', () => {
      expect(print(number, literal('x'))).toEqual(
        misprint("'x' is not a digit", { node: 'label' })
      );
    });
  });

  describe('rule', () => {
    it('must print through its element', () => {
      expect(print(new Rule(digit, 'DIGIT'), literal('1'))).toEqual(
        printed('1')
      );
    });

    it('must place a misprint of its element under the rule, by name', () => {
      expect(print(new Rule(digit, 'DIGIT'), literal('x'))).toEqual(
        misprint("'x' is not a digit", { node: 'rule', name: 'DIGIT' })
      );
    });
  });

  describe('reference', () => {
    it('must print through the expression it refers to', () => {
      expect(print(new Reference(() => digit), literal('1'))).toEqual(
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
              literal('1'),
              new Option(new Sequence([literal('2'), new Option()])),
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
          new Sequence([literal('1'), new Repetition(literals('12x'))])
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
