import isUndefined from 'lodash/isUndefined';
import omitBy from 'lodash/omitBy';

import { HTTPMethod, RequestOptions } from '@leancloud/adapter-types';
import { mustGetAdapter } from './adapter';
import { runtime } from './runtime';

export interface HTTPRequest {
  method: HTTPMethod;
  url: string;
  header?: Record<string, string | undefined>;
  query?: Record<string, string | number | boolean | undefined>;
  body?: any;
}

export interface HTTPResponse {
  status: number;
  header?: Record<string, string>;
  body?: any;
}

export interface HTTPRequestOptions {
  onProgress?: RequestOptions['onprogress'];
  abortSignal?: RequestOptions['signal'];
}

export function encodeQuery(query: HTTPRequest['query']): string {
  let str = '';
  Object.entries(query).forEach(([key, value], index) => {
    if (value === undefined) {
      return;
    }

    if (index) {
      str += '&';
    }
    str += key + '=' + encodeURIComponent(value);
  });
  return str;
}

export function encodeURL(base: string, query?: HTTPRequest['query']): string {
  if (query) {
    const queryString = encodeQuery(query);
    if (queryString) {
      return base + '?' + queryString;
    }
  }
  return base;
}

export async function doHTTPRequest(
  request: HTTPRequest,
  options?: HTTPRequestOptions
): Promise<HTTPResponse> {
  const doRequest = mustGetAdapter('request');

  runtime.emit('log', { level: 'trace', label: 'http:send', data: request });

  const url = encodeURL(request.url, request.query);
  const res = await doRequest(url, {
    method: request.method,
    headers: omitBy(request.header, isUndefined),
    data: request.body,
    signal: options?.abortSignal,
    onprogress: options?.onProgress,
  });
  const httpRes: HTTPResponse = {
    status: res.status || 200,
    header: res.headers as HTTPResponse['header'],
    body: res.data,
  };

  runtime.emit('log', { level: 'trace', label: 'http:recv', data: httpRes });

  return httpRes;
}
