const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const test = require('node:test');
test('isolated native config parser supports browser query inspection without real browser globals', async () => {
    const path = 'react/features/base/lib-jitsi-meet/functions.native.ts';
    const module = { exports: {} };
    const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS }
    }).outputText;
    const req = id => {
        if (id.includes('worklets')) return { Worklets: { createContext: () => ({ createRunAsync: fn => fn }) } };
        if (id.includes('loadScript')) return { loadScript: async () => 'var config = { hosts: { domain: "meet.jitsi" } }; if (new URLSearchParams(window.location.search).get("jwt")) config.hostMenu = true;' };
        if (id.includes('js-utils')) return { safeJsonParse: JSON.parse };
        if (id === './logger') return { default: { info() {}, error() {} } };
        return {};
    };
    new Function('require', 'module', 'exports', source)(req, module, module.exports);
    const config = await module.exports.loadConfig('https://example.test/config.js?room=123');
    assert.equal(config.hosts.domain, 'meet.jitsi');
    assert.equal(config.hostMenu, undefined);
});
