const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
test('conference controls resolve safe area backgrounds through theme adapter', () => {
    const adapter = fs.readFileSync('react/features/base/ui/components/native/ThemedPrimitives.tsx', 'utf8');
    assert.match(adapter, /export const SafeAreaView = themedPrimitive/);
    for (const path of ['conference/components/native/Conference.tsx', 'toolbox/components/native/Toolbox.tsx']) {
        const source = fs.readFileSync(`react/features/${path}`, 'utf8');
        assert.match(source, /import \{[^}]*SafeAreaView[^}]*\} from '[^']*ThemedPrimitives'/);
        assert.doesNotMatch(source, /import \{[^}]*\bSafeAreaView\b[^}]*\} from 'react-native-safe-area-context'/);
    }
});
test('host hangup menu uses destructive styling instead of primary blue', () => {
    const source = fs.readFileSync('react/features/toolbox/components/native/HangupMenuButton.tsx', 'utf8');
    assert.match(source, /BUTTON_TYPES.DESTRUCTIVE/);
    const button = fs.readFileSync('react/features/base/ui/components/native/IconButton.tsx', 'utf8');
    assert.match(button, /type === DESTRUCTIVE/);
    assert.match(button, /theme.palette.actionDanger/);
});
test('room chip, notifications and bottom sheet use theme surfaces', () => {
    const styles = fs.readFileSync('react/features/conference/components/native/styles.ts', 'utf8');
    assert.match(styles, /roomNameView: \{\s*backgroundColor: BaseTheme.palette.ui02/);
    const notice = fs.readFileSync('react/features/notifications/components/native/styles.ts', 'utf8');
    assert.doesNotMatch(notice, /palette.text04|palette.ui10/);
    const sheet = fs.readFileSync('react/features/base/dialog/components/native/BottomSheet.tsx', 'utf8');
    assert.match(sheet, /import \{ SafeAreaView, ScrollView, View \} from '[^']*ThemedPrimitives'/);
});
test('dialog sibling tree receives persisted theme instead of default dark context', () => {
    const app = fs.readFileSync('react/features/app/components/App.native.tsx', 'utf8');
    assert.match(app, /<JitsiThemePaperProvider contextOnly = \{ true \}>\s*<BottomSheetContainer \/>\s*<DialogContainer \/>\s*<\/JitsiThemePaperProvider>/);
    const provider = fs.readFileSync('react/features/base/ui/components/JitsiThemeProvider.native.tsx', 'utf8');
    assert.match(provider, /if \(props.contextOnly\) \{\s*return \(\s*<NativeThemeContext.Provider value = \{ theme \}>\s*\{ props.children \}\s*<\/NativeThemeContext.Provider>/);
});
test('animated notification surfaces and dismiss icons follow the active theme', () => {
    const source = fs.readFileSync('react/features/notifications/components/native/Notification.tsx', 'utf8');
    assert.match(source, /const styles = useNativeScreenOptions\(staticStyles\)/);
    assert.match(source, /const theme = useNativeTheme\(\)/);
    assert.match(source, /color = \{ theme.palette.icon01 \}/);
    assert.doesNotMatch(source, /color = \{ BaseTheme.palette.icon04 \}/);
});
