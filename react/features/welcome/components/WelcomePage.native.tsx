import React from 'react';
import { Alert, Animated, BlurEvent, FocusEvent, StyleProp, TextStyle, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { connect } from 'react-redux';

import { appNavigate } from '../../app/actions.native';
import { getName } from '../../app/functions.native';
import { IReduxState } from '../../app/types';
import { translate } from '../../base/i18n/functions';
import Icon from '../../base/icons/components/Icon';
import { IconWarning } from '../../base/icons/svg';
import LoadingIndicator from '../../base/react/components/native/LoadingIndicator';
import Text from '../../base/react/components/native/Text';
import { getServerURL } from '../../base/settings/functions.native';
import { ISettingsState } from '../../base/settings/reducer';
import BaseTheme from '../../base/ui/components/BaseTheme.native';
import Button from '../../base/ui/components/native/Button';
import Input from '../../base/ui/components/native/Input';
import { TouchableHighlight, View } from '../../base/ui/components/native/ThemedPrimitives';
import { BUTTON_TYPES } from '../../base/ui/constants.native';
import getUnsafeRoomText from '../../base/util/getUnsafeRoomText.native';
import CreateMeetingDialog from '../../cloudmeet/CreateMeetingDialog.native';
import { enterCreatedMeeting } from '../../cloudmeet/actions.native';
import { CLOUDMEET_ORIGIN, joinMeeting } from '../../cloudmeet/meetingService';
import WelcomePageTabs
    from '../../mobile/navigation/components/welcome/components/WelcomePageTabs';

import {
    IProps as AbstractProps,
    AbstractWelcomePage,
    _mapStateToProps as _abstractMapStateToProps
} from './AbstractWelcomePage';
import styles from './styles.native';

interface IProps extends AbstractProps {
    cloudMeetEnabled: boolean;

    /**
     * Function for getting the unsafe room text.
     */
    getUnsafeRoomTextFn: Function;

    /**
     * Default prop for navigating between screen components(React Navigation).
     */
    navigation: any;
}

/**
 * The native container rendering the welcome page.
 *
 * @augments AbstractWelcomePage
 */
class WelcomePage extends AbstractWelcomePage<IProps> {
    /**
     * Validate CloudMeet IDs rather than silently creating arbitrary rooms.
     *
     * @returns {Promise<void>} Navigation completion.
     */
    override async _onJoin() {
        if (!this.props.cloudMeetEnabled) {
            return super._onJoin();
        }
        if (this.state.joining) {
            return;
        }
        this.setState({ joining: true });
        try {
            const url = await joinMeeting(this.state.room, this.state.meetingPassword || '');

            await this.props.dispatch(appNavigate(url));
        } catch (error) {
            Alert.alert('加入会议失败', error instanceof Error ? error.message : '请检查网络后重试');
        } finally {
            this._mounted && this.setState({ joining: false });
        }
    }

    _onFieldBlur: (e: BlurEvent) => void;
    _onFieldFocus: (e: FocusEvent) => void;

    /**
     * Show the create form.
     *
     * @returns {void}
     */
    _onOpenCreate = () => this.setState({ createDialogVisible: true });

    /**
     * Close the create form.
     *
     * @returns {void}
     */
    _onCloseCreate = () => this.setState({ createDialogVisible: false });

    /**
     * Set the business meeting password.
     *
     * @param {string} value - Password.
     * @returns {void}
     */
    _onMeetingPasswordChange = (value: string) => this.setState({ meetingPassword: value });

    /**
     * Enter a registered room.
     *
     * @param {string} url - Token-bearing URL.
     * @param {string} name - Nickname.
     * @returns {Promise<void>}
     */
    _onEnterCreated = async (url: string, name: string) => {
        await this.props.dispatch(enterCreatedMeeting(url, name));
    };

    /**
     * Constructor of the Component.
     *
     * @inheritdoc
     */
    constructor(props: IProps) {
        super(props);

        this.state._fieldFocused = false;

        this.state.isSettingsScreenFocused = false;

        this.state.roomNameInputAnimation = new Animated.Value(1);

        this.state.hintBoxAnimation = new Animated.Value(0);

        // Bind event handlers so they are only bound once per instance.
        this._onFieldFocusChange = this._onFieldFocusChange.bind(this);
        this._renderHintBox = this._renderHintBox.bind(this);

        // Specially bind functions to avoid function definition on render.
        this._onFieldBlur = this._onFieldFocusChange.bind(this, false);
        this._onFieldFocus = this._onFieldFocusChange.bind(this, true);
        this._onSettingsScreenFocused = this._onSettingsScreenFocused.bind(this);
    }

    /**
     * Implements React's {@link Component#componentDidMount()}. Invoked
     * immediately after mounting occurs. Creates a local video track if none
     * is available and the camera permission was already granted.
     *
     * @inheritdoc
     * @returns {void}
     */
    override componentDidMount() {
        super.componentDidMount();

        const {
            navigation,
            t
        } = this.props;

        navigation.setOptions({
            headerTitle: t('welcomepage.headerTitle')
        });

        navigation.addListener('focus', () => {
            this._updateRoomName();
        });

        navigation.addListener('blur', () => {
            this._clearTimeouts();

            this.setState({
                generatedRoomName: '',
                insecureRoomName: false,
                room: ''
            });
        });
    }

    /**
     * Implements React's {@link Component#render()}. Renders a prompt for
     * entering a room name.
     *
     * @inheritdoc
     * @returns {ReactElement}
     */
    override render() {
        // We want to have the welcome page support the reduced UI layout,
        // but we ran into serious issues enabling it so we disable it
        // until we have a proper fix in place. We leave the code here though, because
        // this part should be fine when the bug is fixed.
        //
        // NOTE: when re-enabling, don't forget to uncomment the respective _mapStateToProps line too

        /*
        const { _reducedUI } = this.props;

        if (_reducedUI) {
            return this._renderReducedUI();
        }
        */

        return this._renderFullUI();
    }

    /**
     * Renders the insecure room name warning.
     *
     * @inheritdoc
     */
    _doRenderInsecureRoomNameWarning() {
        return (
            <View
                style = { [
                    styles.messageContainer,
                    styles.insecureRoomNameWarningContainer as ViewStyle
                ] }>
                <Icon
                    src = { IconWarning }
                    style = { styles.insecureRoomNameWarningIcon } />
                <Text style = { styles.insecureRoomNameWarningText }>
                    { this.props.getUnsafeRoomTextFn(this.props.t) }
                </Text>
            </View>
        );
    }

    /**
     * Constructs a style array to handle the hint box animation.
     *
     * @private
     * @returns {Array<Object>}
     */
    _getHintBoxStyle() {
        return [
            styles.messageContainer,
            styles.hintContainer,
            {
                opacity: this.state.hintBoxAnimation
            }
        ];
    }

    /**
     * Callback for when the room field's focus changes so the hint box
     * must be rendered or removed.
     *
     * @private
     * @param {boolean} focused - The focused state of the field.
     * @returns {void}
     */
    _onFieldFocusChange(focused: boolean) {
        if (focused) {
            // Stop placeholder animation.
            this._clearTimeouts();
            this.setState({
                _fieldFocused: true,
                roomPlaceholder: ''
            });
        } else {
            // Restart room placeholder animation.
            this._updateRoomName();
        }

        Animated.timing(

            this.state.hintBoxAnimation,

            {
                duration: 300,
                toValue: focused ? 1 : 0,
                useNativeDriver: true
            })
            .start(animationState =>

                animationState.finished

                && !focused
                    && this.setState({
                        _fieldFocused: false
                    }));
    }

    /**
     * Callback for when the settings screen is focused.
     *
     * @private
     * @param {boolean} focused - The focused state of the screen.
     * @returns {void}
     */
    _onSettingsScreenFocused(focused: boolean) {
        this.setState({
            isSettingsScreenFocused: focused
        });

        this.props.navigation.setOptions({
            headerShown: !focused
        });

        Animated.timing(
            this.state.roomNameInputAnimation,
            {
                toValue: focused ? 0 : 1,
                duration: 500,
                useNativeDriver: true
            })
            .start();
    }

    /**
     * Renders the hint box if necessary.
     *
     * @private
     * @returns {React$Node}
     */
    _renderHintBox() {
        const { t } = this.props;

        if (this.state._fieldFocused || this.props.cloudMeetEnabled) {
            return (
                <Animated.View style = { this.props.cloudMeetEnabled ? undefined : this._getHintBoxStyle() as ViewStyle[] }>
                    <View style = { styles.hintTextContainer as ViewStyle } >
                        <Text style = { styles.hintText as TextStyle }>
                            { t('welcomepage.roomnameHint') }
                        </Text>
                    </View>
                    <View style = { styles.hintButtonContainer as ViewStyle } >
                        { this._renderJoinButton() }
                    </View>
                </Animated.View>
            );
        }

        return null;
    }

    /**
     * Renders the join button.
     *
     * @private
     * @returns {ReactElement}
     */
    _renderJoinButton() {
        const { t } = this.props;
        let joinButton;


        if (this.state.joining) {
            // TouchableHighlight is picky about what its children can be, so
            // wrap it in a native component, i.e. View to avoid having to
            // modify non-native children.
            joinButton = (
                <TouchableHighlight
                    accessibilityLabel =
                        { t('welcomepage.accessibilityLabel.join') }
                    onPress = { this._onJoin }
                    style = { styles.button as ViewStyle }>
                    <View>
                        <LoadingIndicator
                            color = { BaseTheme.palette.icon01 }
                            size = 'small' />
                    </View>
                </TouchableHighlight>
            );
        } else {
            joinButton = (
                <Button
                    accessibilityLabel = { 'welcomepage.accessibilityLabel.join' }
                    labelKey = { this.props.cloudMeetEnabled ? 'cloudmeet.join' : 'welcomepage.join' }
                    labelStyle = { styles.joinButtonLabel }
                    onClick = { this._onJoin }
                    type = { BUTTON_TYPES.PRIMARY } />
            );
        }

        return joinButton;
    }

    /**
     * Renders the room name input.
     *
     * @private
     * @returns {ReactElement}
     */
    _renderRoomNameInput() {
        const roomnameAccLabel = 'welcomepage.accessibilityLabel.roomname';
        const { t } = this.props;
        const { isSettingsScreenFocused } = this.state;

        return (
            <Animated.View
                style = { [
                    isSettingsScreenFocused && styles.roomNameInputContainer,
                    { opacity: this.state.roomNameInputAnimation }
                ] as StyleProp<ViewStyle> }>
                <SafeAreaView
                    edges = { [ 'left', 'right' ] }
                    style = { styles.roomContainer as StyleProp<ViewStyle> }>
                    <Text style = { styles.enterRoomText as StyleProp<TextStyle> }>
                        { t('welcomepage.roomname') }
                    </Text>
                    <Input
                        accessibilityLabel = { t(roomnameAccLabel) }
                        autoCapitalize = { 'none' }
                        autoFocus = { false }
                        customStyles = {{ input: styles.customInput }}
                        onBlur = { this._onFieldBlur }
                        onChange = { this._onRoomChange }
                        onFocus = { this._onFieldFocus }
                        onSubmitEditing = { this._onJoin }
                        placeholder = { this.state.roomPlaceholder }
                        returnKeyType = { 'go' }
                        value = { this.state.room } />
                    { this.props.cloudMeetEnabled && <Input
                        label = '会议密码（如有）'
                        onChange = { this._onMeetingPasswordChange }
                        secureTextEntry = { true }
                        value = { this.state.meetingPassword || '' } /> }
                    {
                        this._renderInsecureRoomNameWarning()
                    }
                    {
                        this._renderHintBox()
                    }
                </SafeAreaView>
            </Animated.View>
        );
    }

    /**
     * Renders the full welcome page.
     *
     * @returns {ReactElement}
     */
    _renderFullUI() {
        return (
            <>
                { this.props.cloudMeetEnabled && <View style = { styles.createMeetingContainer }>
                    <Button
                        labelKey = 'cloudmeet.create'
                        onClick = { this._onOpenCreate }
                        type = { BUTTON_TYPES.PRIMARY } />
                </View> }
                { this.state.createDialogVisible && <CreateMeetingDialog
                    displayName = { (this.props._settings as ISettingsState).displayName || '' }
                    onClose = { this._onCloseCreate }
                    onJoin = { this._onEnterCreated } /> }
                { this._renderRoomNameInput() }
                <View style = { styles.welcomePage as ViewStyle }>
                    <WelcomePageTabs
                        disabled = { Boolean(this.state._fieldFocused) } // @ts-ignore
                        onListContainerPress = { this._onFieldBlur }
                        onSettingsScreenFocused = { this._onSettingsScreenFocused } />
                </View>
            </>
        );
    }

    /**
     * Renders a "reduced" version of the welcome page.
     *
     * @returns {ReactElement}
     */
    _renderReducedUI() {
        const { t } = this.props;

        return (
            <View style = { styles.reducedUIContainer as ViewStyle }>
                <Text style = { styles.reducedUIText }>
                    { t('welcomepage.reducedUIText', { app: getName() }) }
                </Text>
            </View>
        );
    }
}

/**
 * Maps part of the Redux state to the props of this component.
 *
 * @param {Object} state - The Redux state.
 * @returns {Object}
 */
function _mapStateToProps(state: IReduxState) {
    return {
        ..._abstractMapStateToProps(state),
        cloudMeetEnabled: getServerURL(state).replace(/\/$/, '') === CLOUDMEET_ORIGIN,

        // _reducedUI: state['features/base/responsive-ui'].reducedUI
        getUnsafeRoomTextFn: (t: Function) => getUnsafeRoomText(state, t, 'welcome')
    };
}

export default translate(connect(_mapStateToProps)(WelcomePage));
