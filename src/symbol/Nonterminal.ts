import { Symbol } from './Symbol.js';

export abstract class Nonterminal<
  out Elements extends Symbol.Element,
> extends Symbol<Elements> {}
