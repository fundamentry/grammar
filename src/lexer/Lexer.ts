export interface Lexer<Source, Token> {
  tokenize(source: Source): Iterable<Token>;
}
