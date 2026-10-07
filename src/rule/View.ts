export interface View<out A> extends Iterable<A> {
  values(): IteratorObject<A>;

  find(): A | undefined;

  map<B>(project: (value: A) => B): View<B>;
}
