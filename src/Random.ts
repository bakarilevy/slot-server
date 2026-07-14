/**
 * Deterministic or non-deterministic RNG wrapper.
 * For production, you can use a cryptographically secure generator.
 */
export class Random {
  private seed?: number;

  constructor(seed?: number) {
    this.seed = seed;
  }

  next(): number {
    if (this.seed !== undefined) {
      // Seeded: simple LCG
      this.seed = (this.seed * 9301 + 49297) % 233280;
      return this.seed / 233280;
    }
    return Math.random();
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  pick<T>(arr: T[]): T {
    return arr[this.nextInt(0, arr.length)]!;
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
    return arr;
  }
}