export class SymbolMismatchError extends Error {
  constructor(message: string) {
    super(message);

    this.name = 'SymbolMismatchError';
  }
}
