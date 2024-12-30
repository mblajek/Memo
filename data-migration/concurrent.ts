export async function* runConcurrent<T, R>({
  iterable,
  concurrency,
  func,
}: {
  iterable: Iterable<T>;
  concurrency: number;
  func: (item: T, {allPrevious}: {allPrevious: () => Promise<void>}) => R | Promise<R>;
}) {
  type P = Promise<[P, R]>;
  const executing: P[] = [];
  async function consume() {
    const [promise, value] = await Promise.race(executing);
    executing.splice(executing.indexOf(promise), 1);
    return value;
  }
  async function allPrevious() {
    const previous = [...executing];
    for (const p of previous) {
      await p;
    }
  }
  for (const item of iterable) {
    const promise: P = (async () => await func(item, {allPrevious}))().then((value) => [promise, value]);
    executing.push(promise);
    if (executing.length >= concurrency) {
      yield await consume();
    }
  }
  while (executing.length) {
    yield await consume();
  }
}

// Based on https://github.com/rxaviers/async-pool
