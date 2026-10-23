// Deliberately opt native UI imports into reactive styling. No runtime patching.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve('react/features');
const target = path.join(root, 'base/ui/components/native/ThemedPrimitives');
const names = new Set([ 'View', 'Text', 'TextInput', 'ScrollView', 'FlatList', 'SectionList',
    'TouchableHighlight', 'TouchableOpacity', 'TouchableWithoutFeedback', 'Pressable',
    'KeyboardAvoidingView', 'ActivityIndicator', 'StatusBar' ]);
let changed = 0;

function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (entry.name !== 'web') visit(file);
            continue;
        }
        if (!/\.(tsx?|jsx?)$/.test(file) || /\.web\./.test(file)
                || file.includes('ThemedPrimitives') || file.includes('ThemeSelect')) continue;
        const source = fs.readFileSync(file, 'utf8');
        const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true,
            file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
        const edits = [];
        const moved = [];

        for (const node of ast.statements) {
            if (!ts.isImportDeclaration(node) || node.moduleSpecifier.text !== 'react-native') continue;
            const clause = node.importClause;

            if (!clause || clause.isTypeOnly || !clause.namedBindings || !ts.isNamedImports(clause.namedBindings)) continue;
            const keep = [];

            for (const specifier of clause.namedBindings.elements) {
                const imported = (specifier.propertyName ?? specifier.name).text;

                if (names.has(imported) && !specifier.isTypeOnly) moved.push(specifier.getText(ast));
                else keep.push(specifier.getText(ast));
            }
            if (!moved.length) continue;
            const prefix = clause.name ? `${clause.name.text}${keep.length ? ', ' : ''}` : '';
            const replacement = prefix || keep.length
                ? `import ${prefix}${keep.length ? `{ ${keep.join(', ')} }` : ''} from 'react-native';` : '';

            edits.push({ start: node.getStart(ast), end: node.end, text: replacement });
        }
        if (!edits.length) continue;
        let result = source;

        for (const edit of edits.reverse()) result = result.slice(0, edit.start) + edit.text + result.slice(edit.end);
        let relative = path.relative(path.dirname(file), target).replaceAll('\\', '/');

        if (!relative.startsWith('.')) relative = `./${relative}`;
        result = `import { ${moved.join(', ')} } from '${relative}';\n${result}`;
        fs.writeFileSync(file, result);
        changed++;
    }
}
visit(root);
console.log(`Migrated ${changed} native UI modules`);

// Navigation options are configuration objects rather than native style props.
const navigationDir = path.join(root, 'mobile/navigation/components');

function migrateNavigation(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);

        if (entry.isDirectory()) { migrateNavigation(file); continue; }
        if (!file.endsWith('.tsx')) continue;
        let source = fs.readFileSync(file, 'utf8');

        if (!source.includes('screenOptions') && !source.includes('tabBarOptions')) continue;
        if (source.includes('useNativeScreenOptions')) continue;
        const optionsImport = /import\s*\{([^}]+)\}\s*from\s*'([^']*(?:screenOptions|welcome\/constants))';/g;
        const imports = [];
        let match;

        while ((match = optionsImport.exec(source))) {
            const names = match[1].replace(/\/\/[^\n]*/g, '').split(',').map(s => s.trim()).filter(Boolean);

            imports.push({ original: match[0], names, path: match[2] });
        }
        if (!imports.length) continue;
        for (const item of imports) {
            source = source.replace(item.original,
                `import { ${item.names.map(name => `${name} as static_${name}`).join(', ')} } from '${item.path}';`);
        }
        const names = imports.flatMap(item => item.names);
        const componentStart = /((?:const \w+ = \([^]*?\) =>|function \w+\([^]*?\))\s*\{)/;
        // Locate only top-level component bodies, not interface or callbacks.
        const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
        let position;

        for (const statement of ast.statements) {
            if (ts.isVariableStatement(statement)) {
                for (const declaration of statement.declarationList.declarations) {
                    const init = declaration.initializer;

                    if (init && ts.isArrowFunction(init) && ts.isBlock(init.body)) {
                        position = init.body.getStart(ast) + 1; break;
                    }
                }
            } else if (ts.isFunctionDeclaration(statement) && statement.body) {
                position = statement.body.getStart(ast) + 1;
            }
            if (position !== undefined) break;
        }
        if (position === undefined) continue;
        const declarations = names.map(name => `\n    const ${name} = useNativeScreenOptions(static_${name});`).join('');

        source = source.slice(0, position) + declarations + source.slice(position);
        let relative = path.relative(path.dirname(file), path.join(root, 'base/ui/components/native/ThemedNavigation')).replaceAll('\\', '/');

        if (!relative.startsWith('.')) relative = './' + relative;
        if (source.includes('NavigationContainer, NavigationIndependentTree')) {
            source = source.replace('NavigationContainer, NavigationIndependentTree', 'NavigationIndependentTree');
            source = `import { NavigationContainer, useNativeScreenOptions } from '${relative}';\n${source}`;
        } else {
            source = `import { useNativeScreenOptions } from '${relative}';\n${source}`;
        }
        fs.writeFileSync(file, source);
    }
}
migrateNavigation(navigationDir);
