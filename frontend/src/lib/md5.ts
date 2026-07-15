// Minimal MD5 implementation (RFC 1321) for computing Gravatar hashes client-side.
// Not for cryptographic/security use — only for deriving a public Gravatar avatar URL.

function rotl(x: number, c: number) {
  return (x << c) | (x >>> (32 - c));
}

function toUtf8Bytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.codePointAt(i)!;
    if (code > 0xffff) i++;
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return bytes;
}

const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4,
  11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);

/**
 * Implementação de MD5 (RFC 1321) feita do zero, usada apenas para derivar o hash de e-mail exigido pela URL de avatar do Gravatar — não deve ser usada para fins criptográficos/segurança.
 * @param input - string de entrada (tipicamente o e-mail já normalizado)
 * @returns hash MD5 em hexadecimal (32 caracteres)
 */
export function md5(input: string): string {
  const bytes = toUtf8Bytes(input);
  const bitLength = bytes.length * 8;

  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);

  for (let i = 0; i < 8; i++) {
    bytes.push((bitLength / 2 ** (8 * i)) & 0xff);
  }

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let chunkStart = 0; chunkStart < bytes.length; chunkStart += 64) {
    const M: number[] = [];
    for (let j = 0; j < 16; j++) {
      const offset = chunkStart + j * 4;
      M[j] = bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
    }

    let [a, b, c, d] = [a0, b0, c0, d0];

    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }

      f = (f + a + K[i] + M[g]) >>> 0;
      a = d;
      d = c;
      c = b;
      b = (b + rotl(f, S[i])) >>> 0;
    }

    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  const toHex = (n: number) =>
    [0, 8, 16, 24]
      .map((shift) => ((n >>> shift) & 0xff).toString(16).padStart(2, '0'))
      .join('');

  return toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0);
}
