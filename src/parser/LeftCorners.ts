import { type Range } from '@fundamentry/range';
import { Integer } from '@fundamentry/scalar';

import { type Expression } from '#project/expression';

export namespace LeftCorners {
  export interface Facts<in out Token> {
    readonly nullable: boolean;
    readonly corners: ReadonlySet<Expression<Token>>;
  }
}

export class LeftCorners<in out Token> implements Expression.Visitor<
  Token,
  undefined,
  LeftCorners.Facts<Token>
> {
  #previous = new Map<Expression<Token>, LeftCorners.Facts<Token>>();

  #current = new Map<Expression<Token>, LeftCorners.Facts<Token>>();

  constructor(root: Expression<Token>) {
    do {
      this.#previous = this.#current;
      this.#current = new Map();
      this.of(root);
    } while (this.#changed());
  }

  of(expression: Expression<Token>): LeftCorners.Facts<Token> {
    const known = this.#current.get(expression);

    if (known) return known;

    this.#current.set(
      expression,
      this.#previous.get(expression) ?? { nullable: false, corners: new Set() }
    );

    const facts = expression.accept(this, undefined);

    this.#current.set(expression, facts);

    return facts;
  }

  terminal(): LeftCorners.Facts<Token> {
    return { nullable: false, corners: new Set() };
  }

  concatenation(
    elements: readonly Expression<Token>[]
  ): LeftCorners.Facts<Token> {
    const facts = elements.map(element => this.of(element));
    const boundary = facts.findIndex(({ nullable }) => !nullable);
    const leading = boundary === -1 ? facts : facts.slice(0, boundary + 1);

    return {
      nullable: boundary === -1,
      corners: new Set(leading.flatMap(({ corners }) => [...corners])),
    };
  }

  alternation([left, right]: readonly [
    Expression<Token>,
    Expression<Token>,
  ]): LeftCorners.Facts<Token> {
    const first = this.of(left);
    const second = this.of(right);

    return {
      nullable: first.nullable || second.nullable,
      corners: new Set([...first.corners, ...second.corners]),
    };
  }

  optional(element: Expression<Token>): LeftCorners.Facts<Token> {
    return { nullable: true, corners: this.of(element).corners };
  }

  repetition(
    element: Expression<Token>,
    bounds: Range<Integer>
  ): LeftCorners.Facts<Token> {
    const { nullable, corners } = this.of(element);
    const iterates =
      !bounds.contains(Integer.of(0)) || bounds.contains(Integer.of(1));

    return {
      nullable: bounds.contains(Integer.of(0)) || nullable,
      corners: iterates ? corners : new Set(),
    };
  }

  refinement(element: Expression<Token>): LeftCorners.Facts<Token> {
    return this.of(element);
  }

  label(element: Expression<Token>): LeftCorners.Facts<Token> {
    return this.of(element);
  }

  rule(element: Expression<Token>): LeftCorners.Facts<Token> {
    return this.of(element);
  }

  reference(target: () => Expression<Token>): LeftCorners.Facts<Token> {
    const expression = target();
    const { nullable, corners } = this.of(expression);

    return { nullable, corners: new Set([expression, ...corners]) };
  }

  #changed(): boolean {
    return [...this.#current].some(([expression, facts]) => {
      const previous = this.#previous.get(expression);

      return (
        previous?.nullable !== facts.nullable ||
        previous.corners.size !== facts.corners.size
      );
    });
  }
}
