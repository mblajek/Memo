import {createHmac} from "node:crypto";

const STEP_SECS = 30;
const DIGITS = 6;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(text: string) {
  let bits = "";
  for (const char of text.replace(/=+$/, "").toUpperCase()) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value < 0) {
      throw new Error(`Not a base32 character: ${char}`);
    }
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes = bits.match(/.{8}/g) || [];
  return Buffer.from(bytes.map((byte) => Number.parseInt(byte, 2)));
}

/**
 * A generator of time-based one-time passwords (RFC 6238, SHA-1, 6 digits, steps of 30 seconds)
 * of a secret.
 *
 * A verifier typically accepts the codes of the steps next to the current one, but refuses a
 * code of a step not later than the last one it accepted. `next` follows that: the codes it
 * returns can be used one after another with no waiting, as long as they stay within the
 * verifier's window (with a window of one step that is two codes in a row, or three if the
 * first one is used at the end of its step).
 */
export class Totp {
  private lastStep: number | undefined;

  constructor(private readonly base32Secret: string) {}

  static currentStep() {
    return Math.floor(Date.now() / 1000 / STEP_SECS);
  }

  /** Returns the code of the earliest step that is not before now and later than the previous one. */
  next() {
    this.lastStep = Math.max(Totp.currentStep(), (this.lastStep ?? -1) + 1);
    return this.codeOfStep(this.lastStep);
  }

  /** Returns again the code that `next` returned last. */
  last() {
    if (this.lastStep === undefined) {
      throw new Error("No code generated yet");
    }
    return this.codeOfStep(this.lastStep);
  }

  /** Returns a code that is not the code of the current step nor of the two steps on either side. */
  wrong() {
    const now = Totp.currentStep();
    const validCodes = [-2, -1, 0, 1, 2].map((offset) => this.codeOfStep(now + offset));
    return ["000000", "111111", "222222", "333333", "444444", "555555"].find((code) => !validCodes.includes(code))!;
  }

  codeOfStep(step: number) {
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(step));
    const hmac = createHmac("sha1", base32Decode(this.base32Secret)).update(counter).digest();
    const offset = hmac.at(-1)! & 0xf;
    const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS;
    return code.toString().padStart(DIGITS, "0");
  }
}
