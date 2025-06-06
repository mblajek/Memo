/** A simple seedable not necessarily cryptographically safe random number generator. */
export class Random {
  static readonly RANDOM = new Random(Math.random() * (2 ^ 32));

  private state: number;

  constructor(seed: number) {
    this.state = seed | 0;
  }

  static fromString(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return new Random(hash);
  }

  clone() {
    return new Random(this.state);
  }

  private mulberryInt32() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  nextFloat(): number;
  nextFloat(min: number, max: number): number;
  nextFloat(min = 0, max = 1) {
    return min + (this.mulberryInt32() / 0x100000000) * (max - min);
  }

  nextInt(): number;
  nextInt(limit: number): number;
  nextInt(min: number, max: number): number;
  nextInt(...params: [] | [number] | [number, number]) {
    if (!params.length) {
      return this.mulberryInt32();
    }
    const [min, limit] = params.length === 1 ? [0, params[0]] : [params[0], params[1] + 1];
    return Math.floor(this.nextFloat(min, limit));
  }

  nextBool(): boolean;
  nextBool(probability: number): boolean;
  nextBool(probability?: number) {
    return probability === undefined
      ? this.mulberryInt32() % 2 === 0
      : this.mulberryInt32() < 0x100000000 * probability;
  }
}
