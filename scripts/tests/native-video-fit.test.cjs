const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');
const vm = require('node:vm');

const read = path => fs.readFileSync(`react/features/${path}`, 'utf8');

test('native participant requests full frame only on the main stage', () => {
    const source = read('base/participants/components/ParticipantView.native.tsx');
    assert.match(source, /objectFit = \{ this.props.zoomEnabled \? 'contain' : undefined \}/);
});

test('video track propagates fit without enabling camera zoom', () => {
    const source = read('base/media/components/AbstractVideoTrack.tsx');
    assert.match(source, /objectFit = \{ this.props.objectFit \}/);
    assert.match(source, /videoTrack.videoType === 'desktop'/);
});

test('native renderer honors full-frame preference while keeping legacy defaults', () => {
    const exports = {};
    const React = {
        Component: class {},
        createElement: (type, props, ...children) => ({ type, props: { ...props, children } })
    };
    const code = ts.transpileModule(read('base/media/components/native/Video.tsx'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 }
    }).outputText;
    vm.runInNewContext(code, {
        exports,
        require: name => name === 'react' ? { ...React, default: React }
            : name === 'react-native-webrtc' ? { RTCView: 'RTCView' }
                : name.includes('NativeThemeContext') ? { NativeThemeContext: {} }
                    : { default: 'Wrapper' }
    });
    const render = (zoomEnabled, objectFit) => {
        const video = new exports.default();
        video.props = { stream: { toURL: () => 'test-stream' }, zoomEnabled, objectFit };
        video.context = { palette: { largeVideoBackground: '#000' } };

        return video.render().props.children[0].props.objectFit;
    };
    assert.equal(render(false, 'contain'), 'contain', 'camera main stage must not crop');
    assert.equal(render(false, undefined), 'cover', 'thumbnail default must remain cover');
    assert.equal(render(true, undefined), 'contain', 'screenshare default must remain contain');
});
