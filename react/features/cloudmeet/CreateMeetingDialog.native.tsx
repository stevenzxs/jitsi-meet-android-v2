import 'react-native-get-random-values';
import React, { useCallback, useState } from 'react';
import { Alert, Modal, StyleSheet } from 'react-native';

import BaseTheme from '../base/ui/components/BaseTheme.native';
import Button from '../base/ui/components/native/Button';
import Input from '../base/ui/components/native/Input';
import { Text, View } from '../base/ui/components/native/ThemedPrimitives';
import { BUTTON_TYPES } from '../base/ui/constants.native';

import { IMeetingDraft, createMeeting, newMeetingDraft } from './meetingService';

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: BaseTheme.palette.backdrop },
    panel: { padding: 24, borderRadius: 12, backgroundColor: BaseTheme.palette.ui01, gap: 16 },
    title: { fontSize: 22, color: BaseTheme.palette.text01 }
});

/**
 * Native create form, keeping retry credentials local to this open dialog.
 *
 * @returns {ReactElement} Create dialog.
 */
export default function CreateMeetingDialog({ displayName, onClose, onJoin }: {
    displayName: string;
    onClose: () => void;
    onJoin: (url: string, name: string) => Promise<void>;
}) {
    const [ name, setName ] = useState(displayName);
    const [ subject, setSubject ] = useState('');
    const [ draft ] = useState<IMeetingDraft>(() => newMeetingDraft(bytes =>
        (globalThis as unknown as { crypto: { getRandomValues: (value: Uint8Array) => Uint8Array; }; })
            .crypto.getRandomValues(bytes)));
    const [ busy, setBusy ] = useState(false);
    const [ meetingUrl, setMeetingUrl ] = useState<string>();
    const [ locked, setLocked ] = useState(false);
    const close = useCallback(() => {
        if (!busy) {
            onClose();
        }
    }, [ busy, onClose ]);
    const submit = useCallback(async () => {
        if (busy) {
            return;
        }
        setBusy(true);
        setLocked(true);
        try {
            const url = meetingUrl || await createMeeting(draft, { displayName: name, subject });

            setMeetingUrl(url);
            await onJoin(url, name.trim());
            onClose();
        } catch (error) {
            Alert.alert('创建会议失败', error instanceof Error ? error.message : '请检查网络后重试');
        } finally {
            setBusy(false);
        }
    }, [ busy, draft, meetingUrl, name, onClose, onJoin, subject ]);

    return (
        <Modal
            animationType = 'fade'
            onRequestClose = { close }
            transparent = { true }>
            <View style = { styles.overlay }>
                <View style = { styles.panel }>
                    <Text style = { styles.title }>创建会议</Text>
                    <Input
                        editable = { !locked }
                        label = '会议主题（可选）'
                        maxLength = { 40 }
                        onChange = { setSubject }
                        value = { subject } />
                    <Input
                        editable = { !locked }
                        label = '昵称'
                        maxLength = { 20 }
                        onChange = { setName }
                        value = { name } />
                    <Button
                        accessibilityLabel = '创建会议'
                        disabled = { busy || !name.trim() }
                        labelKey = { busy ? 'cloudmeet.creating' : 'cloudmeet.create' }
                        onClick = { submit }
                        type = { BUTTON_TYPES.PRIMARY } />
                    <Button
                        disabled = { busy }
                        labelKey = 'dialog.Cancel'
                        onClick = { onClose }
                        type = { BUTTON_TYPES.TERTIARY } />
                </View>
            </View>
        </Modal>
    );
}
