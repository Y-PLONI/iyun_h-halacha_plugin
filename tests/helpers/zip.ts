// קורא ZIP מינימלי לטסטים (Central Directory), לבדיקת פלטי makeZip / buildAnswerFormDocx.

export interface ReadEntry {
  name: string;
  method: number;
  crc: number;
  compSize: number;
  uncompSize: number;
  data: Uint8Array;
  /** טקסט — רק כשהרשומה אינה דחוסה (method 0) */
  text: string | null;
}

const u16 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u32 = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

export function crc32(d: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < d.length; i++) c = CRC_TABLE[(c ^ d[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function readZipEntries(buf: Uint8Array): ReadEntry[] {
  let p = buf.length - 22;
  while (p >= 0 && !(buf[p] === 0x50 && buf[p + 1] === 0x4b && buf[p + 2] === 0x05 && buf[p + 3] === 0x06)) p--;
  if (p < 0) throw new Error('EOCD not found');
  const total = u16(buf, p + 10);
  let o = u32(buf, p + 16);
  const decoder = new TextDecoder('utf-8');
  const out: ReadEntry[] = [];
  for (let i = 0; i < total; i++) {
    if (!(buf[o] === 0x50 && buf[o + 1] === 0x4b && buf[o + 2] === 0x01 && buf[o + 3] === 0x02)) {
      throw new Error('bad central directory record');
    }
    const method = u16(buf, o + 10);
    const crc = u32(buf, o + 16);
    const compSize = u32(buf, o + 20);
    const uncompSize = u32(buf, o + 24);
    const nameLen = u16(buf, o + 28);
    const extraLen = u16(buf, o + 30);
    const commentLen = u16(buf, o + 32);
    const localOff = u32(buf, o + 42);
    const name = decoder.decode(buf.subarray(o + 46, o + 46 + nameLen));
    if (!(buf[localOff] === 0x50 && buf[localOff + 1] === 0x4b && buf[localOff + 2] === 0x03 && buf[localOff + 3] === 0x04)) {
      throw new Error(`bad local header for ${name}`);
    }
    const lNameLen = u16(buf, localOff + 26);
    const lExtraLen = u16(buf, localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const data = buf.slice(dataStart, dataStart + compSize);
    out.push({
      name,
      method,
      crc,
      compSize,
      uncompSize,
      data,
      text: method === 0 ? decoder.decode(data) : null,
    });
    o += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

export async function readZipFromBlob(blob: Blob): Promise<ReadEntry[]> {
  return readZipEntries(new Uint8Array(await blob.arrayBuffer()));
}
