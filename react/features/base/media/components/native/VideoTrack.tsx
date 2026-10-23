import React from 'react';
import { connect } from 'react-redux';

import { View } from '../../../ui/components/native/ThemedPrimitives';
import AbstractVideoTrack, { IProps } from '../AbstractVideoTrack';

import styles from './styles';

/**
 * Component that renders video element for a specified video track.
 *
 * @augments AbstractVideoTrack
 */
class VideoTrack extends AbstractVideoTrack<IProps> {
    /**
     * Renders the video element for the associated video track.
     *
     * @override
     * @returns {ReactElement}
     */
    override render() {
        return (
            <View style = { styles.video } >
                { super.render() }
            </View>
        );
    }
}

export default connect()(VideoTrack);
