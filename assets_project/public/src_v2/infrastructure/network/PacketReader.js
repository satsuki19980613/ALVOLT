/**
 * バイナリデータ読み込み用ユーティリティ
 */
export class PacketReader {
  constructor(arrayBuffer) {
    this.view = new DataView(arrayBuffer);
    this.offset = 0;
    this.decoder = new TextDecoder("utf-8");
  }

  check(bytes) {
    return this.offset + bytes <= this.view.byteLength;
  }

  u8() {
    if (!this.check(1)) return 0;
    const val = this.view.getUint8(this.offset);
    this.offset += 1;
    return val;
  }

  u16() {
    if (!this.check(2)) return 0;
    const val = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return val;
  }

  u32() {
    if (!this.check(4)) return 0;
    const val = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return val;
  }

  f32() {
    if (!this.check(4)) return 0;
    const val = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return val;
  }

  string() {
    if (!this.check(1)) return "";
    const len = this.view.getUint8(this.offset);
    this.offset += 1;
    if (!this.check(len)) return "";
    const bytes = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, len);
    this.offset += len;
    return this.decoder.decode(bytes);
  }
}