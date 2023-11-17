import React, { memo, useCallback } from "react";
import { View, Text, Pressable, Image } from "react-native";
import { ellipsiseAddress } from "../WalletAddress";
import { WalletItem } from "./WalletItem";
import { useTypedNavigation } from "../../utils/useTypedNavigation";
import { useAppState, useTheme } from "../../engine/hooks";
import { useLedgerTransport } from "../../fragments/ledger/components/TransportContext";

import IcCheck from "@assets/ic-check.svg";

export const WalletSelector = memo(() => {
    const theme = useTheme();
    const navigation = useTypedNavigation();

    const appState = useAppState();

    const ledgerContext = useLedgerTransport();
    const ledgerConnected = !!ledgerContext?.tonTransport;

    const onLedgerSelect = useCallback(async () => {
        navigation.navigateLedgerApp();
    }, []);

    return (
        <View style={{ flexGrow: 1 }}>
            {appState.addresses.map((wallet, index) => {
                return (
                    <WalletItem
                        key={`wallet-${index}`}
                        index={index}
                        address={wallet.address}
                        selected={index === appState.selected && !ledgerContext?.focused}
                    />
                )
            })}
            {ledgerConnected && (
                <Pressable
                    style={{
                        backgroundColor: theme.surfaceOnElevation,
                        padding: 20,
                        marginBottom: 16,
                        borderRadius: 20,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}
                    onPress={onLedgerSelect}
                >
                    <View style={{
                        height: 46, width: 46,
                        backgroundColor: theme.accent,
                        borderRadius: 23,
                        marginRight: 12,
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        <Image
                            style={{
                                width: 46,
                                height: 46,
                            }}
                            source={require('@assets/ledger_device.png')}
                        />
                    </View>
                    <View style={{ justifyContent: 'center', flexGrow: 1, flexShrink: 1 }}>
                        <Text
                            style={{
                                fontSize: 17, lineHeight: 24,
                                fontWeight: '600',
                                color: theme.textPrimary,
                                marginBottom: 2,
                                maxWidth: '90%',
                            }}
                            numberOfLines={1}
                        >
                            {'Ledger'}
                        </Text>
                        <Text style={{ fontSize: 15, lineHeight: 20, fontWeight: '400', color: '#838D99' }}>
                            {ellipsiseAddress(ledgerContext.addr?.address ?? '')}
                        </Text>
                    </View>
                    <View style={{
                        justifyContent: 'center', alignItems: 'center',
                        height: 24, width: 24,
                        backgroundColor: ledgerContext.focused ? theme.accent : theme.divider,
                        borderRadius: 12
                    }}>
                        {ledgerContext.focused && (
                            <IcCheck color={'white'} height={16} width={16} style={{ height: 16, width: 16 }} />
                        )}
                    </View>
                </Pressable>
            )}
        </View>
    );
});