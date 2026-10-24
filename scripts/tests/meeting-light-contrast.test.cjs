const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

function renderButton(type, disabled = false) {
    const palette = { text01: '#182230', text03: '#637083', text04: '#182230', action01: '#2463C9',
        action02: '#E2E7EF', actionDanger: '#B92F40', ui08: '#E2E7EF' };
    const module = { exports: {} };
    const React = { createElement: (component, props, ...children) => ({ component, props: { ...props, children } }) };
    const source = ts.transpileModule(fs.readFileSync('react/features/base/ui/components/native/Button.tsx', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true }
    }).outputText;
    new Function('module', 'exports', 'require', source)(module, module.exports, name => {
        if (name === 'react') return React;
        if (name === 'react-i18next') return { useTranslation: () => ({ t: key => key }) };
        if (name === 'react-native-paper') return { Button: 'PaperButton', Text: 'PaperText' };
        if (name.includes('NativeThemeContext')) return {
            useNativeTheme: () => ({ palette }), useNativeStyles: styles => styles
        };
        if (name.includes('constants.native')) return {
            BUTTON_TYPES: { PRIMARY: 'primary', SECONDARY: 'secondary', DESTRUCTIVE: 'destructive', TERTIARY: 'tertiary' },
            BUTTON_MODES: { CONTAINED: 'contained', TEXT: 'text' }
        };
        if (name.includes('ThemedPrimitives')) return { TouchableHighlight: 'Touchable', NativeForegroundContext: { Provider: 'Foreground' } };
        if (name.includes('buttonStyles')) return { buttonLabelSecondary: { color: '#F3F5F9' }, buttonLabelDisabled: { color: '#3D3D3D' } };
        return {};
    });
    let element = module.exports.default({ type, disabled, labelKey: 'test' });
    while (element.component !== 'PaperButton') element = element.props.children[0];
    return element.props;
}

test('secondary button uses explicit semantic foreground rather than legacy background color conversion', () => {
    assert.equal(renderButton('secondary').textColor, '#182230');
});
test('filled primary and destructive buttons retain white text and icons', () => {
    for (const type of ['primary', 'destructive']) assert.equal(renderButton(type).textColor, '#FFFFFF');
});
test('disabled buttons use the current theme foreground', () => {
    const props = renderButton('secondary', true);
    assert.ok(props.labelStyle.some(style => style?.color === '#637083'));
});
test('participant names use theme-aware text rather than unadapted Paper text', () => {
    const source = fs.readFileSync('react/features/participants-pane/components/native/ParticipantItem.tsx', 'utf8');
    assert.ok(!/import \{ Text \} from 'react-native-paper'/.test(source));
    assert.match(source, /import \{ Text, TouchableOpacity, View \}.*ThemedPrimitives/);
});
test('participants more menu uses theme-aware text for legacy white labels', () => {
    const source = fs.readFileSync('react/features/participants-pane/components/native/ContextMenuMore.tsx', 'utf8');
    const imports = ts.createSourceFile('ContextMenuMore.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
        .statements.filter(ts.isImportDeclaration);
    const textImport = imports.find(statement => statement.importClause?.namedBindings
        && ts.isNamedImports(statement.importClause.namedBindings)
        && statement.importClause.namedBindings.elements.some(element => element.name.text === 'Text'));
    assert.ok(textImport, 'Menu text must have an explicit component import');
    assert.equal(textImport.moduleSpecifier.text, '../../../base/ui/components/native/ThemedPrimitives');
});
test('Android ongoing meeting notification includes Chinese title and actions', () => {
    const path = 'android/sdk/src/main/res/values-zh/strings.xml';
    assert.ok(fs.existsSync(path), 'Chinese native notification resources must exist');
    const source = fs.readFileSync(path, 'utf8');
    for (const text of ['会议进行中', '点击返回会议', '离开会议', '取消静音']) assert.ok(source.includes(text));
});
