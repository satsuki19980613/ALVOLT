export class PacketWriter {
  constructor(size = 16384) {
    this.buffer = Buffer.alloc(size);
    this.offset = 0;
  }

  reset() {
    this.offset = 0;
  }

  u8(val) {
    this.buffer.writeUInt8(val, this.offset);
    this.offset += 1;
  }

  u16(val) {
    this.buffer.writeUInt16LE(val, this.offset);
    this.offset += 2;
  }

  u32(val) {
    this.buffer.writeUInt32LE(val, this.offset);
    this.offset += 4;
  }

  f32(val) {
    this.buffer.writeFloatLE(val, this.offset);
    this.offset += 4;
  }

  string(str) {
    const len = Buffer.byteLength(str);
    this.u8(len);
    this.buffer.write(str, this.offset, len, "utf8");
    this.offset += len;
  }

  getData() {
    return this.buffer.subarray(0, this.offset);
  }
}