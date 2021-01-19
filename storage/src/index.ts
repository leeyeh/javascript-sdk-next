import type { Runtime } from '../../core';
import { Storage } from './storage';
import { providers } from './provider';
import { LCFile } from './file';
import { setSDKRuntime } from './runtime';

declare module '../../core' {
  interface App {
    storage(): Storage;
  }
}

export const name = 'storage';

export const components = {
  providers,
  Storage,
  LCFile,
};

export function onLoad(runtime: Runtime): void {
  setSDKRuntime(runtime);
  const { App } = runtime.modules.core.components;
  App.prototype.storage = function () {
    return new Storage(this);
  };
}

export * from './storage';
export * from './provider';
