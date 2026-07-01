import { Given, When, Then, Before, AfterAll } from '@cucumber/cucumber';
import { request as playwrightRequest, APIRequestContext } from 'playwright';
import * as fs from 'fs';

let baseUrl = 'http://localhost:8080';
let requestContext: APIRequestContext | undefined;
let lastResponse: any;
let currentRecord: any;
let useBasicAuth = false;

Before(async () => {
  requestContext = await playwrightRequest.newContext({ baseURL: baseUrl });
});

AfterAll(async () => {
  await requestContext?.dispose();
});

Given('the application base URL is {string}', async function (url: string) {
  baseUrl = url;
  await requestContext?.dispose();
  requestContext = await playwrightRequest.newContext({ baseURL: baseUrl });
});

Given('a vulnerability record with id {string}, cwe {string}, controller {string}, endpoint {string}, method {string}', function (id: string, cwe: string, controller: string, endpoint: string, method: string) {
  currentRecord = { id, cwe, controller, endpoint, method };
});

When('I send a JSON payload to {string} with body {string}', async function (path: string, body: string) {
  useBasicAuth = path !== '/api/login';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (useBasicAuth) headers['Authorization'] = 'Basic ' + Buffer.from('alice:alice123').toString('base64');
  lastResponse = await requestContext.post(path, { data: body, headers });
});

When('I send a plain text payload to {string} with body {string}', async function (path: string, body: string) {
  useBasicAuth = path !== '/api/login';
  const headers: Record<string, string> = { 'Content-Type': 'text/plain' };
  if (useBasicAuth) headers['Authorization'] = 'Basic ' + Buffer.from('alice:alice123').toString('base64');
  lastResponse = await requestContext.post(path, { data: body, headers });
});

When('I send a login request to {string} with username {string} and password {string}', async function (path: string, username: string, password: string) {
  useBasicAuth = false;
  lastResponse = await requestContext.post(path, {
    data: JSON.stringify({ username, password }),
    headers: { 'Content-Type': 'application/json' }
  });
});

When('I request {string}', async function (path: string) {
  useBasicAuth = path !== '/api/login';
  const headers: Record<string, string> = {};
  if (useBasicAuth) headers['Authorization'] = 'Basic ' + Buffer.from('alice:alice123').toString('base64');
  lastResponse = await requestContext.get(path, { headers });
});

When('I request {string} without authentication', async function (path: string) {
  useBasicAuth = false;
  lastResponse = await requestContext.get(path);
});

Then('the response status should be {int}', function (expected: number) {
  if (!lastResponse) throw new Error('No response captured');
  if (lastResponse.status() !== expected) {
    throw new Error(`Expected ${expected} but received ${lastResponse.status()}`);
  }
});

Then('the response status should be {int} or {int}', function (a: number, b: number) {
  if (!lastResponse) throw new Error('No response captured');
  const actual = lastResponse.status();
  if (actual !== a && actual !== b) {
    throw new Error(`Expected ${a} or ${b} but received ${actual}`);
  }
});

Then('the response should indicate a safe JSON parse result', async function () {
  const body = await lastResponse.text();
  if (!body.includes('type') || !body.includes('size')) {
    throw new Error(`Unexpected body: ${body}`);
  }
});

Then('the response should be a structured error', async function () {
  const body = await lastResponse.text();
  if (!body) {
    throw new Error('Expected an error response body');
  }
});

Then('the response should indicate invalid credentials', async function () {
  const body = await lastResponse.text();
  if (!body.toLowerCase().includes('invalid') && !body.toLowerCase().includes('error')) {
    throw new Error(`Unexpected body: ${body}`);
  }
});

Then('the response should not expose a password field', async function () {
  const body = await lastResponse.text();
  if (body.toLowerCase().includes('password')) {
    throw new Error(`Password field exposed: ${body}`);
  }
});

Then('the response should not contain a full user dump', async function () {
  const body = await lastResponse.text();
  if (body.includes('alice') && body.includes('admin')) {
    throw new Error(`Full user dump exposed: ${body}`);
  }
});

Then('the response should indicate authentication is required', async function () {
  const body = await lastResponse.text();
  if (!body.toLowerCase().includes('authentication') && !body.toLowerCase().includes('required')) {
    throw new Error(`Unexpected body: ${body}`);
  }
});
