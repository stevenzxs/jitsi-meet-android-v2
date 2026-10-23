export type ThemeMode = 'dark' | 'light';

export const LIGHT_PALETTE: Record<string, string> = {
    uiBackground: '#F3F5F9',
    ui01: '#FFFFFF',
    ui02: '#E8EDF4',
    ui03: '#D4DCE8',
    ui04: '#C5CFDD',
    ui05: '#FFFFFF',
    ui06: '#C5CFDD',
    ui07: '#637083',
    ui08: '#E2E7EF',
    ui09: '#EEF1F6',
    ui10: '#D4DCE8',
    text01: '#182230',
    text02: '#465469',
    text03: '#637083',
    text04: '#182230',
    icon01: '#182230',
    icon02: '#465469',
    icon03: '#637083',
    icon04: '#182230',
    action01: '#2463C9',
    action01Hover: '#1C54B1',
    action01Active: '#164593',
    action02: '#E2E7EF',
    action02Hover: '#D4DCE8',
    action02Active: '#C5CFDD',
    actionDanger: '#B92F40',
    link01: '#245DB5',
    link01Hover: '#1C4D99',
    link01Active: '#164080',
    focus01: '#2463C9'
};

const lightColors: Record<string, string> = {
    '#040404': LIGHT_PALETTE.uiBackground,
    '#111111': LIGHT_PALETTE.uiBackground,
    '#000000': LIGHT_PALETTE.uiBackground,
    black: LIGHT_PALETTE.uiBackground,
    '#141414': LIGHT_PALETTE.ui01,
    '#292929': LIGHT_PALETTE.ui02,
    '#3D3D3D': LIGHT_PALETTE.ui03,
    '#525252': LIGHT_PALETTE.ui04,
    '#555555': LIGHT_PALETTE.ui04,
    '#666666': LIGHT_PALETTE.text02,
    '#A3A3A3': LIGHT_PALETTE.text03,
    '#AAAAAA': LIGHT_PALETTE.text03,
    '#C2C2C2': LIGHT_PALETTE.text02,
    '#E0E0E0': LIGHT_PALETTE.text02,
    '#FFFFFF': LIGHT_PALETTE.text01,
    white: LIGHT_PALETTE.text01
};

const styleCache = new WeakMap<object, unknown>();

/**
 * Normalize absent or invalid persisted settings without opting into system mode.
 *
 * @param {unknown} value - Stored selection.
 * @returns {ThemeMode} Supported theme.
 */
export function normalizeThemeMode(value: unknown): ThemeMode {
    return value === 'light' ? 'light' : 'dark';
}

/**
 * Map legacy surface/text colors, leaving semantic status colors untouched.
 *
 * @param {string} color - Existing color.
 * @param {ThemeMode} mode - Selected theme.
 * @returns {string} Resolved color.
 */
export function resolveNativeColor(color: string, mode: ThemeMode): string {
    return mode === 'light' ? lightColors[color.toUpperCase()] ?? lightColors[color] ?? color : color;
}

/**
 * Determine foreground inherited by labels/icons on an explicit surface.
 *
 * @param {Object} style - Flattened style.
 * @param {ThemeMode} mode - Selected theme.
 * @returns {string|undefined} Inherited foreground.
 */
export function getNativeForeground(style: { backgroundColor?: unknown; }, mode: ThemeMode): string | undefined {
    const color = style.backgroundColor;

    if (typeof color !== 'string' || color === 'transparent' || /,\s*0\)$/.test(color)) {
        return undefined;
    }
    if (/rgba\(\s*0,\s*0,\s*0,/.test(color)) {
        return '#FFFFFF';
    }
    if (/^#[\da-f]{6}$/i.test(color)) {
        return contrastRatio('#FFFFFF', color) >= 3 ? '#FFFFFF' : mode === 'light' ? LIGHT_PALETTE.text01 : '#111111';
    }

    return undefined;
}

/**
 * Adapt immutable legacy style objects. Dark overlays and filled action labels
 * deliberately retain white foregrounds; these can appear over arbitrary media.
 *
 * @param {T} source - Immutable style definition.
 * @param {ThemeMode} mode - Selected theme.
 * @returns {T} Cached themed style.
 */
export function resolveNativeStyles<T>(source: T, mode: ThemeMode): T {
    if (mode === 'dark' || !source || typeof source !== 'object') {
        return source;
    }
    const cached = styleCache.get(source);

    if (cached) {
        return cached as T;
    }
    const resolve = (value: any, name = '', preserveForeground = false): any => {
        if (!value || typeof value !== 'object') {
            return value;
        }
        if (Array.isArray(value)) {
            return value.map(item => resolve(item, name, preserveForeground));
        }
        const overlay = /rgba\(\s*0,\s*0,\s*0,/.test(value.backgroundColor ?? '');
        const filledLabel = /buttonLabel(Primary|Destructive)$/.test(name);
        const keepForeground = preserveForeground || overlay || filledLabel;

        return Object.fromEntries(Object.entries(value).map(([ key, item ]) => {
            if (typeof item === 'string' && /color$/i.test(key)) {
                const mapped = key === 'backgroundColor' && [ '#FFFFFF', 'white' ].includes(item)
                    ? '#FFFFFF'
                    : keepForeground && key !== 'backgroundColor' && key !== 'borderColor'
                        ? item
                        : resolveNativeColor(item, mode);

                return [ key, mapped ];
            }

            return [ key, resolve(item, key, keepForeground) ];
        }));
    };
    const result = resolve(source);

    styleCache.set(source, result);

    return result;
}

/**
 * WCAG relative luminance contrast for palette regression checks.
 *
 * @param {string} a - First hex color.
 * @param {string} b - Second hex color.
 * @returns {number} Contrast ratio.
 */
export function contrastRatio(a: string, b: string): number {
    const luminance = (color: string) => {
        const channels = color.replace('#', '').match(/.{2}/g)!.map(channel => {
            const value = parseInt(channel, 16) / 255;

            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });

        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    const first = luminance(a);
    const second = luminance(b);

    return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}
