export class PrintMismatchError extends Error {
  constructor(message: string) {
    super(message);

    this.name = 'PrintMismatchError';
  }
}
