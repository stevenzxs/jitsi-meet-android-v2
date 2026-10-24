const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

test('history refresh list compiles with the React Native Babel configuration', () => {
    const babel = require('@babel/core');

    assert.doesNotThrow(() => babel.transformFileSync('react/features/base/react/components/native/SectionList.tsx'));
});

test('history list refresh indicator matches scheduled meeting theme colors', () => {
    const source = fs.readFileSync('react/features/base/react/components/native/SectionList.tsx', 'utf8');

    assert.match(source, /static contextType = NativeThemeContext/);
    assert.match(source, /<RefreshControl/);
    assert.match(source, /colors = \{ \[ theme.palette.action01 \] \}/);
    assert.match(source, /progressBackgroundColor = \{ theme.palette.ui01 \}/);
    assert.match(source, /tintColor = \{ theme.palette.action01 \}/);
    assert.match(source, /onRefresh = \{ this.props.onRefresh \}/);
    assert.match(source, /refreshing = \{ Boolean\(this.props.refreshing\) \}/);
});
