export abstract class Recognition {
  abstract match(): boolean;

  abstract map(mapper: (value: unknown) => unknown): Recognition;

  abstract orElse(fallback: () => unknown): Recognition;

  static attempt<Attempted extends Recognition, Context>(
    production: () => Attempted,
    context: Context,
    cleanup?: (context: Context) => void
  ): Attempted {
    let matched = false;

    try {
      const recognition = production();

      matched = recognition.match();

      return recognition;
    } finally {
      if (!matched) cleanup?.(context);
    }
  }
}
