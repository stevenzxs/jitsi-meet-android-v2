const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(require('node:path').join(__dirname,
    '../react/features/base/lib-jitsi-meet/functions.native.ts'), 'utf8');

test('native config uses actual HTTPS origin without exposing query secrets', async () => {
    const configText = `var config = { websocket: (window.location.protocol === 'https:' ? 'wss://' : 'ws://')
        + window.location.host + '/xmpp-websocket', search: window.location.search };`;
    const exports = {};
    const requireMock = name => {
        if (name === '@jitsi/js-utils/json') return { safeJsonParse: JSON.parse };
        if (name === 'react-native-worklets-core') return { Worklets: { createContext: () => ({ createRunAsync: fn => fn }) } };
        if (name.includes('loadScript')) return { loadScript: async () => configText };
        if (name === './logger') return { default: { info() {}, error() {} } };
        if (name === './functions.any') return {};
        throw Error(name);
    };
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
        module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020
    } }).outputText, { exports, require: requireMock, URL });
    const result = await exports.loadConfig('https://47.96.221.94:8443/config.js?room=123456789&jwt=secret');
    assert.equal(result.websocket, 'wss://47.96.221.94:8443/xmpp-websocket');
    assert.equal(result.search, '');
});
