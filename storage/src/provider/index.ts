import { App, HTTPResponse } from '../../../core';
import { FileTokens, UploadOptions } from '../storage';
import { Qiniu } from './qiniu';

export interface Provider {
  upload(
    name: string,
    data: any,
    tokens: FileTokens,
    options?: UploadOptions
  ): Promise<HTTPResponse>;
}

export const providers: Record<string, { new (app: App): Provider }> = {
  qiniu: Qiniu,
};
