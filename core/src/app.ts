import clone from 'lodash/clone';
import trimEnd from 'lodash/trimEnd';
import trimStart from 'lodash/trimStart';

import { APIError } from '../../common/error';
import { AppRouter, isCNApp, Service } from './app-router';
import { Database } from './database';
import { request as doHTTPRequest, HTTPRequest, HTTPRequestOptions } from './http';
import { localStorage, NamespacedStorage } from './local-storage';
import { log } from './log';
import { getUserAgent } from './userAgent';

export interface AuthOptions extends HTTPRequestOptions {
  useMasterKey?: boolean;
  sessionToken?: string;
}

export interface APIRequest {
  method: HTTPRequest['method'];
  path: string;
  service?: Service;
  header?: HTTPRequest['header'];
  query?: HTTPRequest['query'];
  body?: any;
}

export type BeforeInvokeAPI = (
  app: App,
  request: APIRequest,
  options: AuthOptions
) => void | Promise<void>;

export interface AppConfig {
  appId: string;
  appKey: string;
  serverURL?: string;
  masterKey?: string;
  useMasterKey?: boolean;
  production?: boolean;
  hookKey?: string;
}

export class App {
  static hooks = {
    beforeInvokeAPI: [] as BeforeInvokeAPI[],
  };

  readonly config: AppConfig;

  readonly log = {
    trace: (label: string, data: Record<string, any>) => {
      log.trace(label, { appId: this.appId, ...data });
    },
    info: (label: string, data: Record<string, any>) => {
      log.info(label, { appId: this.appId, ...data });
    },
    error: (label: string, data: Record<string, any>) => {
      log.error(label, { appId: this.appId, ...data });
    },
  };

  readonly payload: Record<string, any> = {};
  readonly localStorage: NamespacedStorage;

  private _router?: AppRouter;

  get appId() {
    return this.config.appId;
  }
  get appKey() {
    return this.config.appKey;
  }
  get serverURL() {
    return this.config.serverURL;
  }

  constructor(config: AppConfig) {
    if (!config) {
      throw new Error('Missing App config');
    }
    this.config = config;

    if (!this.config.appId) {
      throw new Error('The appId must be provided');
    }
    if (!this.config.appKey) {
      throw new Error('The appKey must be provided');
    }
    // serverURL might be ''
    if (this.config.serverURL !== undefined) {
      if (isCNApp(this)) {
        throw new Error('The serverURL must be provided for CN App');
      }
      this._router = new AppRouter(this);
    }
    if (this.config.production === undefined) {
      this.config.production = true;
    }

    this.localStorage = new NamespacedStorage(localStorage, this.config.appId);
  }

  database(): Database {
    return new Database(this);
  }

  async request(request: APIRequest, options: AuthOptions = {}): Promise<any> {
    request = clone(request);
    options = clone(options);
    await Promise.all(App.hooks.beforeInvokeAPI.map((h) => h(this, request, options)));

    const useMasterKey = options?.useMasterKey ?? this.config.useMasterKey;
    if (useMasterKey && !this.config.masterKey) {
      throw new Error('The useMasterKey option is on，but masterKey is not set');
    }

    const url = this.serverURL || (await this._router.getServiceURL(request.service || 'api'));

    const { status, body } = await doHTTPRequest(
      {
        ...request,
        url: trimEnd(url, '/ ') + '/' + trimStart(request.path, '/ '),
        header: {
          'X-LC-Prod': this.config.production ? undefined : '0',
          ...request.header,
          'Content-Type': 'application/json',
          'X-LC-UA': getUserAgent(),
          'X-LC-Id': this.appId,
          'X-LC-Key': useMasterKey ? this.config.masterKey + ',master' : this.appKey,
          'X-LC-Session': options?.sessionToken,
          'X-LC-Hook-Key': this.config.hookKey,
        },
      },
      options
    );

    if (status >= 400) {
      const { code, error } = body;
      if (code && error) {
        throw new APIError(code, error);
      }
      throw new Error(JSON.stringify(body));
    }

    return body;
  }

  static beforeInvokeAPI(h: BeforeInvokeAPI): void {
    App.hooks.beforeInvokeAPI.push(h);
  }
}
