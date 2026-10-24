const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

test('Simplified Chinese translates the non-moderator private chat setting', () => {
    const locale = JSON.parse(fs.readFileSync('lang/main-zh-CN.json', 'utf8'));

    assert.equal(locale.settings.privateChatWithPermissions, '禁止非主持人私聊');
});
