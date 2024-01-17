// automatically generated by the FlatBuffers compiler, do not modify

import * as flatbuffers from "flatbuffers";

export class Ok implements flatbuffers.IUnpackableObject<OkT> {
  bb: flatbuffers.ByteBuffer | null = null;
  bb_pos = 0;
  __init(i: number, bb: flatbuffers.ByteBuffer): Ok {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }

  static getRootAsOk(bb: flatbuffers.ByteBuffer, obj?: Ok): Ok {
    return (obj || new Ok()).__init(
      bb.readInt32(bb.position()) + bb.position(),
      bb
    );
  }

  static getSizePrefixedRootAsOk(bb: flatbuffers.ByteBuffer, obj?: Ok): Ok {
    bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
    return (obj || new Ok()).__init(
      bb.readInt32(bb.position()) + bb.position(),
      bb
    );
  }

  message(): string | null;
  message(optionalEncoding: flatbuffers.Encoding): string | Uint8Array | null;
  message(optionalEncoding?: any): string | Uint8Array | null {
    const offset = this.bb!.__offset(this.bb_pos, 4);
    return offset
      ? this.bb!.__string(this.bb_pos + offset, optionalEncoding)
      : null;
  }

  static startOk(builder: flatbuffers.Builder) {
    builder.startObject(1);
  }

  static addMessage(
    builder: flatbuffers.Builder,
    messageOffset: flatbuffers.Offset
  ) {
    builder.addFieldOffset(0, messageOffset, 0);
  }

  static endOk(builder: flatbuffers.Builder): flatbuffers.Offset {
    const offset = builder.endObject();
    return offset;
  }

  static createOk(
    builder: flatbuffers.Builder,
    messageOffset: flatbuffers.Offset
  ): flatbuffers.Offset {
    Ok.startOk(builder);
    Ok.addMessage(builder, messageOffset);
    return Ok.endOk(builder);
  }

  unpack(): OkT {
    return new OkT(this.message());
  }

  unpackTo(_o: OkT): void {
    _o.message = this.message();
  }
}

export class OkT implements flatbuffers.IGeneratedObject {
  constructor(public message: string | Uint8Array | null = null) {}

  pack(builder: flatbuffers.Builder): flatbuffers.Offset {
    const message =
      this.message !== null ? builder.createString(this.message!) : 0;

    return Ok.createOk(builder, message);
  }
}