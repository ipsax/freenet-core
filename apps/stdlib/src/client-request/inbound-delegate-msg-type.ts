// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import { ApplicationMessage, ApplicationMessageT } from '../client-request/application-message.js';
import { GetSecretRequest, GetSecretRequestT } from '../client-request/get-secret-request.js';
import { GetSecretResponse, GetSecretResponseT } from '../client-request/get-secret-response.js';
import { RandomBytes, RandomBytesT } from '../client-request/random-bytes.js';
import { UserInputResponse, UserInputResponseT } from '../client-request/user-input-response.js';


export enum InboundDelegateMsgType {
  NONE = 0,
  ApplicationMessage = 1,
  GetSecretResponse = 2,
  RandomBytes = 3,
  UserInputResponse = 4,
  GetSecretRequest = 5
}

export function unionToInboundDelegateMsgType(
  type: InboundDelegateMsgType,
  accessor: (obj:ApplicationMessage|GetSecretRequest|GetSecretResponse|RandomBytes|UserInputResponse) => ApplicationMessage|GetSecretRequest|GetSecretResponse|RandomBytes|UserInputResponse|null
): ApplicationMessage|GetSecretRequest|GetSecretResponse|RandomBytes|UserInputResponse|null {
  switch(InboundDelegateMsgType[type]) {
    case 'NONE': return null; 
    case 'ApplicationMessage': return accessor(new ApplicationMessage())! as ApplicationMessage;
    case 'GetSecretResponse': return accessor(new GetSecretResponse())! as GetSecretResponse;
    case 'RandomBytes': return accessor(new RandomBytes())! as RandomBytes;
    case 'UserInputResponse': return accessor(new UserInputResponse())! as UserInputResponse;
    case 'GetSecretRequest': return accessor(new GetSecretRequest())! as GetSecretRequest;
    default: return null;
  }
}

export function unionListToInboundDelegateMsgType(
  type: InboundDelegateMsgType, 
  accessor: (index: number, obj:ApplicationMessage|GetSecretRequest|GetSecretResponse|RandomBytes|UserInputResponse) => ApplicationMessage|GetSecretRequest|GetSecretResponse|RandomBytes|UserInputResponse|null, 
  index: number
): ApplicationMessage|GetSecretRequest|GetSecretResponse|RandomBytes|UserInputResponse|null {
  switch(InboundDelegateMsgType[type]) {
    case 'NONE': return null; 
    case 'ApplicationMessage': return accessor(index, new ApplicationMessage())! as ApplicationMessage;
    case 'GetSecretResponse': return accessor(index, new GetSecretResponse())! as GetSecretResponse;
    case 'RandomBytes': return accessor(index, new RandomBytes())! as RandomBytes;
    case 'UserInputResponse': return accessor(index, new UserInputResponse())! as UserInputResponse;
    case 'GetSecretRequest': return accessor(index, new GetSecretRequest())! as GetSecretRequest;
    default: return null;
  }
}