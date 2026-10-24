const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

function service() {
    const module = { exports: {} };
    const source = ts.transpileModule(fs.readFileSync('react/features/cloudmeet/historyService.ts', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS }
    }).outputText;
    new Function('module', 'exports', 'require', source)(module, module.exports,
        () => ({ CLOUDMEET_ORIGIN: 'https://example.test' }));
    return module.exports;
}

test('history uses actual meeting timestamps, never scheduled or personal duration', () => {
    const m = service();
    const record = { roomName: '123456789', subject: '周会', status: 'ENDED',
        startedAt: '2026-10-24T01:00:00Z', endedAt: '2026-10-24T01:35:00Z',
        scheduledStartTime: '2026-10-24T00:00:00Z', scheduledEndTime: '2026-10-24T03:00:00Z' };
    assert.deepEqual(m.historyLines(record).slice(0, 2), ['会议号：123456789', '会议状态：已结束']);
    assert.equal(m.historyLines(record)[3], '会议时长：35分钟');
    assert.equal(m.historyLines({ ...record, startedAt: null })[2], '会议时间：暂无数据');
    assert.equal(m.historyLines({ ...record, startedAt: null })[3], '会议时长：暂无数据');
    assert.equal(m.historyLines({ ...record, endedAt: 'invalid' })[3], '会议时长：暂无数据');
    assert.equal(m.historyLines({ ...record, status: 'RUNNING', endedAt: null }, Date.parse(record.startedAt) + 120000)[3], '会议时长：已进行2分钟');
    assert.equal(m.historyLines({ roomName: record.roomName, status: 'unexpected' })[1], '会议状态：状态未知');
});

test('history requests are identity scoped and validate both visible and historical responses', async () => {
    const m = service();
    await assert.rejects(m.fetchMeetingHistory('', () => assert.fail('unscoped request')));
    const urls = [];
    const records = await m.fetchMeetingHistory('android-owner', async url => {
        urls.push(url);
        return { ok: true, json: async () => ({ data: [{ roomName: '123456789', creatorId: 'android-owner' }] }) };
    });
    assert.equal(records.length, 1);
    assert.equal(urls.length, 2);
    assert.ok(urls.every(url => url.includes('creatorId=android-owner')));
    await assert.rejects(m.fetchMeetingHistory('owner', async () => ({ ok: true, json: async () => ({ data: {} }) })), /格式/);
    await assert.rejects(m.fetchMeetingHistory('owner', async () => ({ ok: false, json: async () => ({ message: 'offline' }) })), /offline/);
});

test('history excludes another creator and upcoming reservations', async () => {
    const m = service();
    const records = await m.fetchMeetingHistory('owner', async () => ({ ok: true, json: async () => ([
        { roomName: '123456789', creatorId: 'someone-else', status: 'ENDED' },
        { roomName: '123456788', creatorId: 'owner', status: 'SCHEDULED' },
        { roomName: '123456787', creatorId: 'owner', status: 'RUNNING' }
    ]) }));
    assert.deepEqual(records.map(record => record.roomName), ['123456787']);
});

test('history merge preserves local entries and never displays attendance as meeting duration', () => {
    const module = { exports: {} };
    const model = service();
    const source = ts.transpileModule(fs.readFileSync('react/features/recent-list/functions.native.ts', 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS }
    }).outputText;
    new Function('module', 'exports', 'require', source)(module, module.exports, name => {
        if (name.includes('dateUtil')) return { getLocalizedDateFormatter: () => ({ fromNow: () => 'now', format: () => 'date' }), getLocalizedDurationFormatter: () => 'personal-duration' };
        if (name.includes('NavigateSectionList')) return { default: { createSection: (title, key) => ({ title, key, data: [] }) } };
        if (name.includes('/uri')) return { parseURIString: value => { const url = new URL(value); return { protocol: url.protocol, host: url.host, room: url.pathname.slice(1) }; }, safeDecodeURIComponent: decodeURIComponent };
        if (name.includes('historyService')) return model;
        return { CLOUDMEET_ORIGIN: 'https://example.test' };
    });
    const local = [{ conference: 'https://example.test/123456789', date: Date.now(), duration: 9999 }];
    const output = module.exports.toDisplayableList(local, x => x, 'https://example.test', [
        { roomName: '123456789', subject: '真实主题', status: 'ENDED' },
        { roomName: '123456788', subject: '服务端历史', status: 'ENDED' }
    ]).flatMap(section => section.data);
    assert.equal(output.length, 1);
    assert.equal(local.length, 1);
    assert.equal(output[0].title, '真实主题');
    assert.ok(output[0].lines.includes('会议时长：暂无数据'));
    assert.equal(output[0].id.url, local[0].conference);
    assert.equal(output[0].id.date, local[0].date);
});

test('CloudMeet navigation prioritizes schedules and wires history refresh without replacing other servers', () => {
    const source = fs.readFileSync('react/features/mobile/navigation/components/welcome/components/WelcomePageTabs.tsx', 'utf8');
    assert.ok(source.indexOf('name = { screen.welcome.tabs.calendar }') < source.indexOf('name = { screen.welcome.tabs.recent }'));
    assert.match(source, /initialRouteName = \{ cloudMeetEnabled \? screen.welcome.tabs.calendar : screen.welcome.tabs.recent \}/);
    assert.match(source, /<HistoryMeetings/);
});

test('history UI compiles with native Babel and preserves long press and refresh wiring', () => {
    const babel = require('@babel/core');
    for (const filename of ['react/features/cloudmeet/HistoryMeetings.native.tsx', 'react/features/recent-list/components/RecentList.native.tsx']) {
        assert.doesNotThrow(() => babel.transformFileSync(filename));
    }
    const source = fs.readFileSync('react/features/recent-list/components/RecentList.native.tsx', 'utf8');
    assert.match(source, /onLongPress = \{ this._onLongPress \}/);
    assert.match(source, /onRefresh = \{ this.props.onRefresh \}/);
});
