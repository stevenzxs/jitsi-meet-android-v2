import {
    getLocalizedDateFormatter,
    getLocalizedDurationFormatter
} from '../base/i18n/dateUtil';
import NavigateSectionList from '../base/react/components/native/NavigateSectionList';
import { parseURIString, safeDecodeURIComponent } from '../base/util/uri';
import { IMeetingHistory, historyLines } from '../cloudmeet/historyService';
import { CLOUDMEET_ORIGIN } from '../cloudmeet/meetingService';

import { IRecentItem } from './types';

/**
 * Creates a displayable list item of a recent list entry.
 *
 * @private
 * @param {Object} item - The recent list entry.
 * @param {string} defaultServerURL - The default server URL.
 * @param {Function} t - The translate function.
 * @param {Array} meetings - Optional authoritative meeting metadata.
 * @returns {Object}
 */
function toDisplayableItem(item: IRecentItem,
        defaultServerURL: string, t: Function, meetings?: IMeetingHistory[]) {
    const location = parseURIString(item.conference);
    const baseURL = `${location.protocol}//${location.host}`;
    const serverName = baseURL === defaultServerURL ? null : location.host;
    const metadata: IMeetingHistory | undefined = meetings && baseURL === CLOUDMEET_ORIGIN
        ? meetings.find(record => record.roomName === location.room) || { roomName: location.room } : undefined;

    return {
        colorBase: serverName,
        id: {
            date: item.date,
            url: item.conference
        },
        key: `key-${item.conference}-${item.date}`,
        lines: metadata ? historyLines(metadata) : [
            _toDateString(item.date, t),
            _toDurationString(item.duration),
            serverName
        ],
        title: metadata ? metadata.subject || '未命名会议' : safeDecodeURIComponent(location.room),
        url: item.conference
    };
}

/**
 * Generates a duration string for the item.
 *
 * @private
 * @param {number} duration - The item's duration.
 * @returns {string}
 */
function _toDurationString(duration: number) {
    if (duration) {
        return getLocalizedDurationFormatter(duration);
    }

    return null;
}

/**
 * Generates a date string for the item.
 *
 * @private
 * @param {number} itemDate - The item's timestamp.
 * @param {Function} t - The translate function.
 * @returns {string}
 */
function _toDateString(itemDate: number, t: Function) {
    const m = getLocalizedDateFormatter(itemDate);
    const date = new Date(itemDate);
    const dateInMs = date.getTime();
    const now = new Date();
    const todayInMs = new Date().setHours(0, 0, 0, 0);
    const yesterday = new Date();

    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const yesterdayInMs = yesterday.getTime();

    if (dateInMs >= todayInMs) {
        return m.fromNow();
    } else if (dateInMs >= yesterdayInMs) {
        return `${t('dateUtils.yesterday')}, ${m.format('h:mm A')}`;
    } else if (date.getFullYear() !== now.getFullYear()) {
        // We only want to include the year in the date if its not the current
        // year.
        return m.format('ddd, MMMM DD h:mm A, gggg');
    }

    return m.format('ddd, MMMM DD h:mm A');
}

/**
 * Transforms the history list to a displayable list
 * with sections.
 *
 * @private
 * @param {Array<Object>} recentList - The recent list form the redux store.
 * @param {Function} t - The translate function.
 * @param {string} defaultServerURL - The default server URL.
 * @param {Array} meetings - Optional authoritative meeting metadata.
 * @returns {Array<Object>}
 */
export function toDisplayableList(recentList: IRecentItem[],
        t: Function, defaultServerURL: string, meetings?: IMeetingHistory[]) {
    const { createSection } = NavigateSectionList;
    const todaySection = createSection(t('dateUtils.today'), 'today');
    const yesterdaySection
        = createSection(t('dateUtils.yesterday'), 'yesterday');
    const earlierSection
        = createSection(t('dateUtils.earlier'), 'earlier');
    const today = new Date();
    const todayString = today.toDateString();
    const yesterday = new Date();

    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toDateString();

    const entries = [ ...recentList ];

    entries.sort((a, b) => a.date - b.date);
    for (const item of entries) {
        const itemDateString = new Date(item.date).toDateString();
        const displayableItem = toDisplayableItem(item, defaultServerURL, t, meetings);

        if (itemDateString === todayString) {
            todaySection.data.push(displayableItem);
        } else if (itemDateString === yesterdayString) {
            yesterdaySection.data.push(displayableItem);
        } else {
            earlierSection.data.push(displayableItem);
        }
    }
    const displayableList = [];

    // the recent list in the redux store has the latest date in the last index
    // therefore all the sectionLists' data that was created by parsing through
    // the recent list is in reverse order and must be reversed for the most
    // item to show first
    if (todaySection.data.length) {
        todaySection.data.reverse();
        displayableList.push(todaySection);
    }
    if (yesterdaySection.data.length) {
        yesterdaySection.data.reverse();
        displayableList.push(yesterdaySection);
    }
    if (earlierSection.data.length) {
        earlierSection.data.reverse();
        displayableList.push(earlierSection);
    }

    return displayableList;
}

/**
 * Returns <tt>true</tt> if recent list is enabled and <tt>false</tt> otherwise.
 *
 * @returns {boolean} <tt>true</tt> if recent list is enabled and <tt>false</tt>
 * otherwise.
 */
export function isRecentListEnabled() {
    return true;
}
