import { type Range } from '@fundamentry/range';
import { type CodePoint, type Integer } from '@fundamentry/scalar';

import { type Expectation, Text, Within } from '#project/expectation';
import { type Expression } from '#project/expression';

import { Definition } from './Definition.js';
import { Term } from './Term.js';

export class Definitions
  implements
    Expression.Visitor<CodePoint, undefined, Term>,
    Iterable<Definition>
{
  readonly #root: Expression<CodePoint>;

  readonly #rules = new Map<string, Expression<CodePoint>>();

  readonly #pending = new Set<Expression<CodePoint>>();

  constructor(root: Expression<CodePoint>) {
    this.#root = root;
  }

  *[Symbol.iterator](): Iterator<Definition> {
    const root = this.root();

    yield root;

    for (const [name, element] of this.#rules)
      if (name !== root.name()) yield this.#definition(element, name);
  }

  root(): Definition {
    const root = String(this.#term(this.#root));
    const rule = this.#rules.get(root);

    return rule ? this.#definition(rule, root) : new Definition(root);
  }

  terminal(_: unknown, expectation: Expectation): Term {
    const ranges =
      expectation instanceof Within ? expectation.ranges().asRanges() : [];
    const terms = ranges.flatMap(range => Term.codePoints(range) ?? []);
    const [first, ...others] = terms;

    return first && terms.length === ranges.length
      ? Term.alternation(first, ...others)
      : Term.element(`<${String(expectation)}>`);
  }

  concatenation(elements: readonly Expression<CodePoint>[]): Term {
    return Term.concatenation(...elements.map(element => this.#term(element)));
  }

  alternation([left, right]: readonly [
    Expression<CodePoint>,
    Expression<CodePoint>,
  ]): Term {
    return Term.alternation(this.#term(left), this.#term(right));
  }

  optional(element: Expression<CodePoint>): Term {
    return this.#term(element).optional();
  }

  repetition(element: Expression<CodePoint>, bounds: Range<Integer>): Term {
    return this.#term(element).repeated(bounds);
  }

  refinement(element: Expression<CodePoint>): Term {
    return this.#term(element);
  }

  label(element: Expression<CodePoint>, expectation: Expectation): Term {
    const text =
      expectation instanceof Text
        ? Term.text(expectation.text(), expectation.isCaseSensitive())
        : undefined;

    return text ?? this.#term(element);
  }

  rule(element: Expression<CodePoint>, name: string): Term {
    if (!this.#rules.has(name)) this.#rules.set(name, element);

    return Term.element(name);
  }

  reference(target: () => Expression<CodePoint>): Term {
    const expression = target();

    if (this.#pending.has(expression))
      throw new Error('A recursive production must recur through a rule');

    this.#pending.add(expression);

    const term = this.#term(expression);

    this.#pending.delete(expression);

    return term;
  }

  #definition(element: Expression<CodePoint>, name: string): Definition {
    return new Definition(String(this.#term(element)), name);
  }

  #term(expression: Expression<CodePoint>): Term {
    return expression.accept(this, undefined);
  }
}
