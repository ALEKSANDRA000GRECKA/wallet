import * as React from 'react';
import { Alert, Platform, Text, TouchableOpacity, View } from "react-native";
import * as Haptics from 'expo-haptics';
import { TextInput } from "react-native-gesture-handler";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DeviceEncryption } from '../../storage/getDeviceEncryption';
import Animated, { FadeOutDown, FadeIn, useSharedValue, useAnimatedStyle, withSequence, withTiming, withRepeat } from 'react-native-reanimated';
import { AndroidToolbar } from '../../components/topbar/AndroidToolbar';
import { WordsListTrie } from '../../utils/wordsListTrie';
import { t } from '../../i18n/t';
import { systemFragment } from '../../systemFragment';
import { warn } from '../../utils/log';
import { WalletWordsComponent } from '../../components/secure/WalletWordsComponent';
import { WalletSecurePasscodeComponent } from '../../components/secure/WalletSecurePasscodeComponent';
import { useTypedNavigation } from '../../utils/useTypedNavigation';
import { ForwardedRef, RefObject, forwardRef, memo, useCallback, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { HeaderBackButton } from "@react-navigation/elements";
import { useFocusEffect } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import { useTheme } from '../../engine/hooks';
import { mnemonicValidate } from '@ton/crypto';

export const wordsTrie = WordsListTrie();

export type WordInputRef = {
    focus: () => void;
}

export function normalize(src: string) {
    return src.trim().toLocaleLowerCase();
}

export const WordInput = memo(forwardRef((props: {
    index: number,
    value: string,
    autoFocus?: boolean,
    innerRef: RefObject<View>,
    setValue: (index: number, src: string) => void,
    onFocus: (index: number) => void,
    onSubmit: (index: number, value: string) => void,
}, ref: ForwardedRef<WordInputRef>) => {
    const theme = useTheme();

    //
    // Internal state
    //

    const suggestions = useMemo(() => (props.value.length > 0) ? wordsTrie.find(normalize(props.value)) : [], [props.value]);
    const [isWrong, setIsWrong] = useState(false);

    //
    // Shake
    // 
    const translate = useSharedValue(0);
    const animtedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translate.value }],
        };
    }, []);
    const doShake = useCallback(() => {
        translate.value = withSequence(
            withTiming(-10, { duration: 30 }),
            withRepeat(withTiming(10, { duration: 30 }), 2, true),
            withTiming(0, { duration: 30 })
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }, []);

    //
    // External imperative functions
    //

    const tref = useRef<TextInput>(null);
    useImperativeHandle(ref, () => ({
        focus: () => {
            tref.current!.focus();
        }
    }));

    //
    // Event handlers
    //

    // Forward focus event
    const onFocus = useCallback(() => {
        props.onFocus(props.index);
    }, [props.index]);

    // Update wrong state on blur (should we shake in case of failure?)
    const onBlur = useCallback(() => {
        const normalized = normalize(props.value);
        setIsWrong(normalized.length > 0 && !wordsTrie.contains(normalized));
    }, [props.value]);

    // Handle submit (enter press) action
    const onSubmit = useCallback(async () => {

        // Check if there are suggestions - replace them instead
        if (suggestions.length >= 1) {
            props.onSubmit(props.index, suggestions[0]);
            return;
        }

        // Check if value is invalid - shake and DO NOT forward onSubmit
        const normalized = normalize(props.value.trim());

        try {
            if (props.index === 0 && normalized.split(' ').length === 24) {
                const fullSeedWords = normalized.split(' ').map((v) => normalize(v));
                const isValidFull = await mnemonicValidate(fullSeedWords);
                if (!isValidFull) {
                    doShake();
                    setIsWrong(true);
                    Alert.alert(t('errors.incorrectWords.title'), t('errors.incorrectWords.message'));
                    return;
                }
                props.onSubmit(props.index, normalized);
                return;
            }
        } catch (e) {
            warn('Failed to validate mnemonics');
            doShake();
            setIsWrong(true);
            Alert.alert(t('errors.incorrectWords.title'), t('errors.incorrectWords.message'));
            return;
        }

        if (!wordsTrie.contains(normalized)) {
            doShake();
            setIsWrong(true);
            return;
        }

        // Word is valid - forward onSubmit
        props.onSubmit(props.index, normalized);
    }, [props.value, suggestions, props.onSubmit, props.index]);

    const onTextChange = useCallback((value: string) => {
        props.setValue(props.index, value);
        setIsWrong(false);
    }, [props.index, props.setValue]);

    return (
        <Animated.View style={animtedStyle}>
            <View
                ref={props.innerRef}
                style={{
                    flexDirection: 'row',
                    backgroundColor: theme.border,
                    borderRadius: 16,
                    marginVertical: 8
                }}
                collapsable={false}
            >
                <Text
                    style={{
                        alignSelf: 'center',
                        fontSize: 17, fontWeight: '500',
                        lineHeight: 24,
                        width: 40,
                        paddingVertical: 14,
                        textAlign: 'right',
                        color: !isWrong ? theme.textSecondary : theme.accentRed,
                    }}
                    onPress={() => {
                        tref.current?.focus();
                    }}
                >
                    {(props.index + 1)}:
                </Text>
                {Platform.OS === 'android' && (
                    <TouchableOpacity onPress={tref.current?.focus} activeOpacity={1} >
                        <TextInput
                            ref={tref}
                            style={{
                                paddingVertical: 16,
                                marginLeft: -16,
                                paddingLeft: 26,
                                paddingRight: 48,
                                flexGrow: 1,
                                fontSize: 17,
                                lineHeight: 24,
                                fontWeight: '400',
                                color: !isWrong ? theme.textPrimary : theme.accentRed
                            }}
                            value={props.value}
                            onChangeText={onTextChange}
                            onBlur={onBlur}
                            returnKeyType="next"
                            autoComplete='off'
                            autoCorrect={false}
                            keyboardType="ascii-capable"
                            autoCapitalize="none"
                            onFocus={onFocus}
                            onSubmitEditing={onSubmit}
                            blurOnSubmit={false}
                            inputAccessoryViewID={'suggestions'}
                            autoFocus={props.autoFocus}
                        />
                    </TouchableOpacity>
                )}
                {Platform.OS !== 'android' && (
                    <TextInput
                        ref={tref}
                        style={{
                            paddingVertical: 16,
                            marginLeft: -16,
                            paddingLeft: 26,
                            paddingRight: 48,
                            flexGrow: 1,
                            fontSize: 16,
                            color: !isWrong ? theme.textPrimary : theme.accentRed
                        }}
                        value={props.value}
                        onChangeText={onTextChange}
                        onBlur={onBlur}
                        returnKeyType="next"
                        autoComplete='off'
                        autoCorrect={false}
                        keyboardType="ascii-capable"
                        autoCapitalize="none"
                        onFocus={onFocus}
                        onSubmitEditing={onSubmit}
                        blurOnSubmit={false}
                        inputAccessoryViewID={'suggestions'}
                        autoFocus={props.autoFocus}
                    />
                )}
            </View>
        </Animated.View>
    )
}));

export const WalletImportFragment = systemFragment(() => {
    const theme = useTheme();
    const navigation = useTypedNavigation();
    const [state, setState] = useState<{
        mnemonics: string,
        deviceEncryption: DeviceEncryption
    } | null>(null);
    const safeArea = useSafeAreaInsets();

    useLayoutEffect(() => {
        if (Platform.OS === 'ios') {
            if (Platform.OS === 'ios') {
                navigation.base.setOptions({
                    headerLeft: () => {
                        return (
                            <HeaderBackButton
                                style={{ marginLeft: -13 }}
                                label={t('common.back')}
                                labelVisible
                                onPress={navigation.goBack}
                                tintColor={theme.accent}
                            />
                        )
                    },
                });
            }
        }
    }, [navigation,]);

    useFocusEffect(useCallback(() => {
        setTimeout(() => {
            setStatusBarStyle(theme.style === 'dark' ? 'light' : 'dark');
        }, 10);
    }, []));

    return (
        <View
            style={{
                flexGrow: 1,
                paddingBottom: Platform.OS === 'ios' ? (safeArea.bottom === 0 ? 32 : safeArea.bottom) + 16 : 0,
            }}
        >
            {!state && (
                <Animated.View
                    style={{
                        alignItems: 'center', justifyContent: 'center', flexGrow: 1,
                        paddingTop: Platform.OS === 'android' ? safeArea.top : 0,
                    }}
                    key={'loading'}
                    exiting={FadeOutDown}
                >
                    <AndroidToolbar />
                    <WalletWordsComponent onComplete={setState} />
                </Animated.View>
            )}
            {state && (
                <Animated.View
                    style={{ alignItems: 'stretch', justifyContent: 'center', flexGrow: 1 }}
                    key={'content'}
                    entering={FadeIn}
                >
                    <WalletSecurePasscodeComponent
                        mnemonics={state.mnemonics}
                        import={true}
                        onBack={() => setState(null)}
                    />
                </Animated.View>
            )}
        </View>
    );
});