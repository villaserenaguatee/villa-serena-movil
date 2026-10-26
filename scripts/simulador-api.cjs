// Carga módulos de lib/ con un servidor y SecureStore simulados, sin credenciales ni red.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// routes(path, options) devuelve [status, body]; fakes reemplaza módulos por ruta ('lib/sesion') o paquete.
function setup(routes, fakes = {}) {
  const state = { session: null, cleared: 0, calls: [] };
  const clearedListeners = new Set();
  const sesion = {
    readSession: async () => state.session, saveSession: async value => { state.session = value; },
    clearSession: async () => { state.session = null; state.cleared++; clearedListeners.forEach(listener => listener()); },
    onSessionCleared: listener => { clearedListeners.add(listener); return () => clearedListeners.delete(listener); },
    tokensSchema: { parse: value => { assert.equal(value.tipoToken, 'Bearer'); return value; } },
  };
  const fetch = async (url, options = {}) => {
    const route = url.replace('http://api.test', '');
    state.calls.push({ path: route, method: options.method ?? 'GET', token: new Headers(options.headers).get('Authorization'), body: options.body && JSON.parse(options.body) });
    const [status, body] = await routes(route, options);
    return new Response(body === undefined ? null : JSON.stringify(body), { status });
  };
  const modules = { 'lib/sesion': sesion, ...fakes };
  function load(file) {
    if (modules[file]) return modules[file];
    const exports = modules[file] = {};
    const source = ts.transpileModule(fs.readFileSync(`${file}.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const resolve = name => (name.startsWith('.') ? path.posix.join(path.posix.dirname(file), name) : name);
    vm.runInNewContext(source, { exports, Headers, Response, URL, setTimeout, clearTimeout, console, process: { env: { EXPO_PUBLIC_API_URL: 'http://api.test/' } }, fetch, require: name => load(resolve(name)) });
    return exports;
  }
  return { state, load };
}
const tokens = { accessToken: 'jwt', refreshToken: 'refresh', tipoToken: 'Bearer', expiraEn: 900 };
const error = (codigo, mensaje) => ({ codigo, mensaje, detalles: [] });
const plain = value => JSON.parse(JSON.stringify(value));
module.exports = { setup, tokens, error, plain };
