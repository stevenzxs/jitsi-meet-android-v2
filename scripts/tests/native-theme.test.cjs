const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

// Load the platform-independent theme model without loading React Native.
function loadModel() {
    const filename = path.resolve('react/features/base/ui/nativeTheme.ts');

    assert.ok(fs.existsSync(filename), 'native theme model must exist');
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true }
    }).outputText;
    const module = { exports: {} };

    new Function('require', 'module', 'exports', source)(require, module, module.exports);

    return module.exports;
}

test('theme selection defaults to dark and rejects unsupported stored values', () => {
    const { normalizeThemeMode } = loadModel();

    for (const value of [ undefined, null, '', 'system', {}, 1 ]) {
        assert.equal(normalizeThemeMode(value), 'dark');
    }
    assert.equal(normalizeThemeMode('light'), 'light');
    assert.equal(normalizeThemeMode('dark'), 'dark');
});

test('light theme surfaces and text have accessible contrast', () => {
    const { LIGHT_PALETTE, contrastRatio } = loadModel();

    for (const surface of [ 'uiBackground', 'ui01', 'ui02' ]) {
        assert.ok(contrastRatio(LIGHT_PALETTE.text01, LIGHT_PALETTE[surface]) >= 7);
        assert.ok(contrastRatio(LIGHT_PALETTE.text02, LIGHT_PALETTE[surface]) >= 4.5);
    }
    assert.ok(contrastRatio('#FFFFFF', LIGHT_PALETTE.action01) >= 4.5);
});

test('theme resolver changes surfaces without mutating source or media overlays', () => {
    const { resolveNativeStyles } = loadModel();
    const source = {
        container: { backgroundColor: '#040404', color: '#FFFFFF', padding: 16 },
        videoOverlay: { backgroundColor: 'rgba(0, 0, 0, 0.7)', color: '#FFFFFF' },
        buttonLabelPrimary: { color: '#FFFFFF' },
        buttonLabelDestructive: { color: '#FFFFFF' },
        danger: { color: '#D83848' }
    };
    const light = resolveNativeStyles(source, 'light');

    assert.equal(light.container.backgroundColor, '#F3F5F9');
    assert.equal(light.container.color, '#182230');
    assert.equal(light.container.padding, 16);
    assert.deepEqual(light.videoOverlay, source.videoOverlay);
    assert.deepEqual(light.buttonLabelPrimary, source.buttonLabelPrimary);
    assert.deepEqual(light.buttonLabelDestructive, source.buttonLabelDestructive);
    assert.deepEqual(light.danger, source.danger);
    assert.equal(source.container.backgroundColor, '#040404');
    assert.equal(resolveNativeStyles(source, 'dark'), source);
    assert.equal(resolveNativeStyles(source, 'light'), light, 'cache stable themed styles');
});

test('nested style arrays, nulls and callbacks are preserved', () => {
    const { resolveNativeStyles } = loadModel();
    const callback = () => {};
    const result = resolveNativeStyles([ null, false, { color: '#FFFFFF' }, callback ], 'light');

    assert.deepEqual(result.slice(0, 3), [ null, false, { color: '#182230' } ]);
    assert.equal(result[3], callback);
});

test('filled surfaces and video overlays retain readable foregrounds', () => {
    const { getNativeForeground } = loadModel();

    assert.equal(getNativeForeground({ backgroundColor: 'rgba(0, 0, 0, .5)' }, 'light'), '#FFFFFF');
    assert.equal(getNativeForeground({ backgroundColor: '#2463C9' }, 'light'), '#FFFFFF');
    assert.equal(getNativeForeground({ backgroundColor: '#D83848' }, 'light'), '#FFFFFF');
    assert.equal(getNativeForeground({ backgroundColor: '#FFFFFF' }, 'light'), '#182230');
    assert.equal(getNativeForeground({}, 'light'), undefined);
});

test('theme-aware video classes compile with the actual React Native Babel configuration', () => {
    const babel = require('@babel/core');

    for (const filename of [
        'react/features/base/participants/components/ParticipantView.native.tsx',
        'react/features/base/media/components/native/Video.tsx'
    ]) {
        assert.doesNotThrow(() => babel.transformFileSync(filename));
    }
});
