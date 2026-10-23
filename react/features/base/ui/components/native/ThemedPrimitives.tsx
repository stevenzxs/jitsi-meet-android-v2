import React, { createContext, forwardRef, useContext } from 'react';
import * as Native from 'react-native';

import { useNativeTheme } from '../../NativeThemeContext';
import { getNativeForeground, resolveNativeColor, resolveNativeStyles } from '../../nativeTheme';

export const NativeForegroundContext = createContext<string | undefined>(undefined);

/**
 * Explicit native UI boundary for legacy static styles. It preserves component
 * identity and refs; RTCView and media streams never pass through this adapter.
 *
 * @param {string} name - Native primitive name.
 * @returns {Object} Ref-forwarding component.
 */
function themedPrimitive(name: string) {
    const Component = (Native as any)[name];
    const Themed = forwardRef<any, any>((props, ref) => {
        const theme = useNativeTheme();
        const inheritedForeground = useContext(NativeForegroundContext);
        const next = { ...props, ref };

        for (const key of [ 'style', 'contentContainerStyle', 'columnWrapperStyle', 'ListHeaderComponentStyle' ]) {
            const style = props[key];

            next[key] = typeof style === 'function'
                ? (...args: any[]) => resolveNativeStyles(style(...args), theme.mode)
                : resolveNativeStyles(Native.StyleSheet.flatten(style), theme.mode);
        }
        const flatStyle = Native.StyleSheet.flatten(next.style) ?? {};
        const foreground = getNativeForeground(flatStyle, theme.mode) ?? inheritedForeground;

        if (name === 'Text' || name === 'TextInput' || name === 'AnimatedText') {
            const original = Native.StyleSheet.flatten(props.style) ?? {};
            const legacyColor = original.color;
            const isNeutral = !legacyColor || [ '#FFFFFF', 'white', '#C2C2C2', '#E0E0E0',
                'rgba(255, 255, 255, 0.6)' ].includes(legacyColor);
            const color = theme.mode === 'light' && isNeutral
                ? foreground ?? theme.palette.text01
                : flatStyle.color ?? theme.palette.text01;

            next.style = [ next.style, { color } ];
        }
        for (const key of [ 'placeholderTextColor', 'selectionColor', 'underlineColorAndroid', 'underlayColor',
            'tintColor', 'color', 'thumbColor' ]) {
            if (typeof props[key] === 'string') {
                next[key] = resolveNativeColor(props[key], theme.mode);
            }
        }
        if (name === 'StatusBar') {
            next.barStyle = theme.dark ? 'light-content' : 'dark-content';
            next.backgroundColor = theme.palette.uiBackground;
        }
        const element = <Component { ...next } />;

        return <NativeForegroundContext.Provider value = { foreground }>{ element }</NativeForegroundContext.Provider>;
    });

    Themed.displayName = `Themed${name}`;

    return Themed;
}

export const View = themedPrimitive('View');
export const Text = themedPrimitive('Text');
export const TextInput = themedPrimitive('TextInput');
export const ScrollView = themedPrimitive('ScrollView');
export const FlatList = themedPrimitive('FlatList') as unknown as typeof Native.FlatList;
export const SectionList = themedPrimitive('SectionList') as unknown as typeof Native.SectionList;
export const TouchableHighlight = themedPrimitive('TouchableHighlight');
export const TouchableOpacity = themedPrimitive('TouchableOpacity');
export const TouchableWithoutFeedback = themedPrimitive('TouchableWithoutFeedback');
export const Pressable = themedPrimitive('Pressable');
export const KeyboardAvoidingView = themedPrimitive('KeyboardAvoidingView');
export const ActivityIndicator = themedPrimitive('ActivityIndicator');
export const StatusBar = Object.assign(themedPrimitive('StatusBar'), {
    currentHeight: Native.StatusBar.currentHeight,
    setHidden: Native.StatusBar.setHidden,
    setBarStyle: Native.StatusBar.setBarStyle
});

// Native components occupy both the value and type namespaces for existing refs.
/* eslint-disable @typescript-eslint/no-redeclare */
export type View = Native.View;
export type Text = Native.Text;
export type TextInput = Native.TextInput;
export type ScrollView = Native.ScrollView;
export type FlatList<T = any> = Native.FlatList<T>;
export type SectionList<T> = Native.SectionList<T>;
