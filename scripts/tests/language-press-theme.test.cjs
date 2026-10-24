const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

for (const component of ['GeneralSection', 'LanguageSelectView']) {
    test(`${component} uses theme-aware language press feedback instead of default black`, () => {
        const source = fs.readFileSync(`react/features/settings/components/native/${component}.tsx`, 'utf8');

        assert.match(source, /const theme = useNativeTheme\(\)/);
        assert.match(source, /underlayColor = \{ theme.palette.ui03 \}/);
    });
}
