import { type Point } from '@fundamentry/stream';

import { type Node } from '#project/tree';

import { Spans } from './Spans.js';

export class Matches<in out Token> {
  readonly #spans: Spans<Token>;

  readonly #steps: Point.Step<Token, Node>[] = [];

  constructor(point: Point<Token>) {
    this.#spans = new Spans(point);
  }

  add(step: Point.Step<Token, Node>): boolean {
    const added = this.#spans.visit(step);

    if (added) this.#steps.push(step);

    return added;
  }

  steps(): readonly Point.Step<Token, Node>[] {
    return this.#steps;
  }
}
