const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');
test('home shortcuts use a single row with desktop bolt and plus icons', () => {
    const path = 'react/features/cloudmeet/MeetingShortcuts.native.tsx';
    assert.ok(fs.existsSync(path), 'shortcut component exists');
    const source = fs.readFileSync(path, 'utf8');
    assert.match(source, /flexDirection: 'row'/);
    assert.match(source, /M13.3 2/);
    assert.match(source, /M12 5v14/);
    assert.ok(source.indexOf("'cloudmeet.create'") < source.indexOf("'cloudmeet.join'"));
    assert.match(source, /accessibilityRole = 'button'/);
    assert.match(source, /stroke = '#FFFFFF'/);
});

test('home shortcuts use compact, consistent visuals without shrinking touch targets', () => {
    const module = { exports: {} };
    const React = { createElement: (component, props, ...children) => ({ component, props, children }) };
    const source = ts.transpileModule(fs.readFileSync('react/features/cloudmeet/MeetingShortcuts.native.tsx', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true }
    }).outputText;
    new Function('module', 'exports', 'require', source)(module, module.exports, name => {
        if (name === 'react') return React;
        if (name === 'react-i18next') return { useTranslation: () => ({ t: key => key }) };
        if (name === 'react-native') return { StyleSheet: { create: styles => styles } };
        if (name === 'react-native-svg') return { __esModule: true, default: 'Svg', Path: 'Path' };
        if (name.includes('BaseTheme')) return { palette: { action01: '#2463C9', text01: '#182230' },
            typography: { bodyShortRegular: { fontSize: 14, lineHeight: 20 } } };
        if (name.includes('ThemedPrimitives')) return { Text: 'Text', View: 'View', TouchableOpacity: 'Touchable' };
        throw new Error(`Unexpected import: ${name}`);
    });
    const calls = [];
    const tree = module.exports.default({ onCreate: () => calls.push('create'),
        onJoin: () => calls.push('join'), onSchedule: () => calls.push('schedule') });
    assert.equal(tree.props.style.paddingVertical, 16);
    for (const item of tree.children[0]) {
        const [ icon, label ] = item.children;
        assert.equal(item.props.style.gap, 8);
        assert.ok(item.props.style.minWidth >= 48);
        assert.ok(item.props.style.minHeight >= 48);
        assert.equal(icon.props.style.width, 60);
        assert.equal(icon.props.style.height, 60);
        assert.equal(icon.props.style.borderRadius, 16);
        assert.equal(label.props.style.fontSize, 14);
        assert.equal(label.props.style.fontWeight, '500');
        const svg = icon.children[0];
        assert.equal(svg.props.width, 30);
        assert.equal(svg.props.height, 30);
        assert.equal(svg.children[0].props.strokeWidth, 2);
        assert.equal(svg.children[0].props.fill, 'none');
        item.props.onPress();
    }
    assert.deepEqual(calls, ['create', 'join', 'schedule']);
});
