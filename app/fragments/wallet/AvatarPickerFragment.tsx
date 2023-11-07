import { Platform, Pressable, View, Text, ScrollView } from "react-native";
import { fragment } from "../../fragment";
import { useParams } from "../../utils/useParams";
import { ScreenHeader } from "../../components/ScreenHeader";
import { useTypedNavigation } from "../../utils/useTypedNavigation";
import { t } from "../../i18n/t";
import { useCallback, useState } from "react";
import { Avatar, avatarImages } from "../../components/Avatar";
import { useTheme } from "../../engine/hooks";

export const AvatarPickerFragment = fragment(() => {
    const { callback, hash } = useParams<{ callback: (newHash: number) => void, hash: number }>();
    const theme = useTheme();
    const navigation = useTypedNavigation();

    const [hashState, setHash] = useState(hash);

    const onSave = useCallback(() => {
        if (hashState !== hash) {
            navigation.goBack();
            callback(hashState);
        }
    }, [hashState]);

    return (
        <View style={{ backgroundColor: theme.white, flexGrow: 1 }}>
            <ScreenHeader
                onBackPressed={() => navigation.goBack()}
                title={t('wallets.settings.changeAvatar')}
                style={{ paddingHorizontal: 16 }}
                rightButton={
                    <Pressable
                        style={({ pressed }) => {
                            return {
                                opacity: pressed ? 0.5 : 1,
                            }
                        }}
                        onPress={onSave}
                        hitSlop={
                            Platform.select({
                                ios: undefined,
                                default: { top: 16, right: 16, bottom: 16, left: 16 },
                            })
                        }
                    >
                        <Text style={{
                            color: hashState !== hash ? theme.accent : theme.textSecondary,
                            fontSize: 17, lineHeight: 24,
                            fontWeight: '500',
                        }}>
                            {t('common.select')}
                        </Text>
                    </Pressable>
                }
                textColor={theme.accent}
                tintColor={theme.accent}
            />
            <View style={{ flexGrow: 1 }} />
            <View style={{ width: '100%', justifyContent: 'center', alignItems: 'center' }}>
                <Avatar
                    size={300}
                    id={""}
                    hash={hashState}
                    borderColor={theme.transparent}
                />
            </View>
            <View style={{ flexGrow: 1 }} />
            <View style={{
                borderTopLeftRadius: 20, borderTopRightRadius: 20,
                paddingTop: 20, paddingBottom: 16
            }}>
                <ScrollView
                    contentContainerStyle={{ margin: 16, paddingVertical: 16, paddingRight: 16 }}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                >
                    {avatarImages.map((avatar, index) => {
                        return (
                            <Pressable
                                key={`avatar-${index}`}
                                onPress={() => setHash(index)}
                                style={{
                                    justifyContent: 'center', alignItems: 'center',
                                    width: 72, height: 72,
                                    marginRight: 8,
                                    borderWidth: index === hashState ? 1 : 0,
                                    borderColor: theme.accent,
                                    borderRadius: 37
                                }}
                            >
                                <Avatar
                                    size={70}
                                    id={""}
                                    hash={index}
                                    borderColor={theme.border}
                                />
                            </Pressable>
                        )
                    })}
                </ScrollView>
            </View>
        </View>
    )
});