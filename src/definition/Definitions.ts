import { type Range } from '@fundamentry/range';
import { type CodePoint, type Integer } from '@fundamentry/scalar';

import { type Expectation, Quoted, Characters } from '#project/expectation';
import { type Expression } from '#project/expression';
import { type Nonterminal } from '#project/tree';

import { Definition } from './Definition.js';
import { Term } from './Term.js';

export namespace Definitions {
  export interface Rule {
    readonly identity: Nonterminal.Rule<string>;
    readonly body: Expression<CodePoint>;
  }
}

export class Definitions
  implements
    Expression.Visitor<CodePoint, undefined, Term>,
    Iterable<Definition>
{
  readonly #root: Expression<CodePoint>;

  readonly #rules = new Map<string, Definitions.Rule>();

  readonly #pending = new Set<Expression<CodePoint>>();

  constructor(root: Expression<CodePoint>) {
    this.#root = root;
  }

  *[Symbol.iterator](): Iterator<Definition> {
    const root = this.root();

    yield root;

    for (const [name, { body }] of this.#rules)
      if (name !== root.name()) yield this.#definition(body, name);
  }

  root(): Definition {
    const root = String(this.#term(this.#root));
    const rule = this.#rules.get(root);

    return rule ? this.#definition(rule.body, root) : new Definition(root);
  }

  terminal(_: unknown, expectation: Expectation): Term {
    const [first, ...others] = (
      expectation instanceof Characters ? expectation.elements() : []
    ).map(element => Term.element(element));

    return first
      ? Term.alternation(first, ...others)
      : Term.element(`<${String(expectation)}>`);
  }

  concatenation(elements: readonly Expression<CodePoint>[]): Term {
    return Term.concatenation(...elements.map(element => this.#term(element)));
  }

  alternation([first, ...others]: Expression.Alternatives<CodePoint>): Term {
    return Term.alternation(
      this.#term(first),
      ...others.map(other => this.#term(other))
    );
  }

  optional(element: Expression<CodePoint>): Term {
    return this.#term(element).optional();
  }

  repetition(element: Expression<CodePoint>, bounds: Range<Integer>): Term {
    return this.#term(element).repeated(bounds);
  }

  label(element: Expression<CodePoint>, expectation: Expectation): Term {
    return expectation instanceof Quoted
      ? Term.element(String(expectation))
      : this.#term(element);
  }

  rule(body: Expression<CodePoint>, identity: Nonterminal.Rule<string>): Term {
    const name = identity.name();
    const known = this.#rules.get(name) ?? { identity, body };

    if (known.identity !== identity)
      throw new Error(`Two different rules are named '${name}'`);

    this.#rules.set(name, known);

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

  #definition(body: Expression<CodePoint>, name: string): Definition {
    return new Definition(String(this.#term(body)), name);
  }

  #term(expression: Expression<CodePoint>): Term {
    return expression.accept(this, undefined);
  }
}
