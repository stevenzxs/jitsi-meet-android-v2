import React from 'react';
import { useSelector } from 'react-redux';

import { getParticipantCountForDisplay } from '../../../base/participants/functions';
import { Text } from '../../../base/ui/components/native/ThemedPrimitives';

import styles from './styles';

const ParticipantsCounter = () => {
    const participantsCount = useSelector(getParticipantCountForDisplay);

    return <Text style = { styles.participantsBadge }>{participantsCount}</Text>;
};

export default ParticipantsCounter;
