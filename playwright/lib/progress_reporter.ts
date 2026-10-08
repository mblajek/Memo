import type {FullConfig, Reporter, Suite, TestCase} from "@playwright/test/reporter";

function formatMinutes(millis: number) {
  if (millis < 60_000) {
    return `${Math.round(millis / 1000)}s`;
  }
  const minutes = Math.round(millis / 60_000);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
}

/**
 * Prints after each test how many of the tests are done, and the time elapsed.
 *
 * A line is written only between two tests. A reporter that rewrites the line of the running
 * test in a terminal stays correct then, as long as the tests run one at a time.
 */
export default class ProgressReporter implements Reporter {
  private total = 0;
  private startMillis = 0;
  private readonly finished = new Set<TestCase>();

  onBegin(_config: FullConfig, suite: Suite) {
    this.total = suite.allTests().length;
    this.startMillis = Date.now();
  }

  onTestEnd(test: TestCase) {
    this.finished.add(test);
    const done = this.finished.size;
    const elapsed = Date.now() - this.startMillis;
    const percent = Math.floor((done / this.total) * 100);
    console.log(`Progress: ${done} / ${this.total} (${percent}%), ${formatMinutes(elapsed)} elapsed`);
  }

  printsToStdio() {
    return true;
  }
}
