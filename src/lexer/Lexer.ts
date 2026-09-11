import { type Token } from '#project/token';

export interface Lexer<Source = string> {
  tokenize(source: Source): Iterable<Token>;
}
