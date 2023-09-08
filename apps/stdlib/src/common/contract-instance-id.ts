// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import * as flatbuffers from 'flatbuffers';



export class ContractInstanceId implements flatbuffers.IUnpackableObject<ContractInstanceIdT> {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):ContractInstanceId {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsContractInstanceId(bb:flatbuffers.ByteBuffer, obj?:ContractInstanceId):ContractInstanceId {
  return (obj || new ContractInstanceId()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsContractInstanceId(bb:flatbuffers.ByteBuffer, obj?:ContractInstanceId):ContractInstanceId {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new ContractInstanceId()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

data(index: number):number|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.readUint8(this.bb!.__vector(this.bb_pos + offset) + index) : 0;
}

dataLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

dataArray():Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? new Uint8Array(this.bb!.bytes().buffer, this.bb!.bytes().byteOffset + this.bb!.__vector(this.bb_pos + offset), this.bb!.__vector_len(this.bb_pos + offset)) : null;
}

static startContractInstanceId(builder:flatbuffers.Builder) {
  builder.startObject(1);
}

static addData(builder:flatbuffers.Builder, dataOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, dataOffset, 0);
}

static createDataVector(builder:flatbuffers.Builder, data:number[]|Uint8Array):flatbuffers.Offset {
  builder.startVector(1, data.length, 1);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addInt8(data[i]!);
  }
  return builder.endVector();
}

static startDataVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(1, numElems, 1);
}

static endContractInstanceId(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  builder.requiredField(offset, 4) // data
  return offset;
}

static createContractInstanceId(builder:flatbuffers.Builder, dataOffset:flatbuffers.Offset):flatbuffers.Offset {
  ContractInstanceId.startContractInstanceId(builder);
  ContractInstanceId.addData(builder, dataOffset);
  return ContractInstanceId.endContractInstanceId(builder);
}

unpack(): ContractInstanceIdT {
  return new ContractInstanceIdT(
    this.bb!.createScalarList<number>(this.data.bind(this), this.dataLength())
  );
}


unpackTo(_o: ContractInstanceIdT): void {
  _o.data = this.bb!.createScalarList<number>(this.data.bind(this), this.dataLength());
}
}

export class ContractInstanceIdT implements flatbuffers.IGeneratedObject {
constructor(
  public data: (number)[] = []
){}


pack(builder:flatbuffers.Builder): flatbuffers.Offset {
  const data = ContractInstanceId.createDataVector(builder, this.data);

  return ContractInstanceId.createContractInstanceId(builder,
    data
  );
}
}