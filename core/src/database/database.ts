import type { App } from '../app';
import { ACL, ACLPrivilege } from './acl';
import { Class } from './class';
import { encodeObjectData, EncodeOptions, LCDecode, LCEncode, LCObject } from './lcobject';
import * as operation from './operation';
import { Pipeline } from './pipeline';
import { Query, queryCommand, QueryDecoder } from './query';

export { operation };

export class Database {
  readonly cmd = queryCommand;
  readonly op = operation;

  constructor(public readonly app: App) {}

  class(name: string): Class {
    return new Class(this.app, name);
  }

  query(className: string): Query<LCObject>;
  query<T>(className: string, decoder: QueryDecoder<T>): Query<T>;
  query<T>(className: string, decoder?: QueryDecoder<T>): Query<T> | Query<LCObject> {
    if (decoder) {
      return new Query(this.app, className, decoder);
    }
    return new Query(this.app, className, LCObject.fromJSON);
  }

  ACL(data?: Record<string, ACLPrivilege>): ACL {
    if (data) {
      return ACL.fromJSON(data);
    }
    return new ACL();
  }

  pipeline(): Pipeline {
    return new Pipeline(this.app);
  }

  encode(data: any, options?: EncodeOptions): any {
    return LCEncode(data, options);
  }

  decode(data: any): any {
    return LCDecode(this.app, data);
  }

  encodeObjectData(data: Record<string, any>): Record<string, any> {
    return encodeObjectData(data);
  }

  decodeObject(data: Record<string, any>, className?: string): LCObject {
    return LCObject.fromJSON(this.app, data, className);
  }
}
