import {AsyncSerialiser} from "components/persistence/serialiser";
import {Base64} from "js-base64";

/**
 * A serialiser that encodes any string into a compressed base64 string. Especially suitable for
 * longer strings (hundreds of characters).
 */
export function compressingEncoder(): AsyncSerialiser<string> {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  // TODO: Use Uint8Array.toBase64 when available: https://caniuse.com/mdn-javascript_builtins_uint8array_tobase64
  // TODO: Clean up the casts caused by typed array generic types.
  return {
    async serialise(value: string) {
      return Base64.fromUint8Array(
        await readAll(new Blob([enc.encode(value)]).stream().pipeThrough(new CompressionStream("deflate-raw"))),
        true,
      );
    },
    async deserialise(value: string) {
      return dec.decode(
        await readAll(
          new Blob([Base64.toUint8Array(value) as Uint8Array<ArrayBuffer>])
            .stream()
            .pipeThrough(new DecompressionStream("deflate-raw")),
        ),
      );
    },
    version: [1],
  };
}

export async function readAll(stream: ReadableStream<Uint8Array<ArrayBuffer>>) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return new Uint8Array(await new Blob(chunks).arrayBuffer());
}
