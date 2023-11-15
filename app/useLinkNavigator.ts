import * as React from 'react';
import { Alert } from 'react-native';
import { t } from './i18n/t';
import { useTypedNavigation } from './utils/useTypedNavigation';
import { ResolvedUrl } from './utils/resolveUrl';
import { Queries } from './engine/queries';
import { useClient4 } from './engine/hooks';
import { useSelectedAccount } from './engine/hooks';
import { jettonWalletAddressQueryFn } from './engine/hooks/jettons/useJettonWalletAddress';
import { useQueryClient } from '@tanstack/react-query';
import { Address } from '@ton/core';

export function useLinkNavigator(isTestnet: boolean) {
    const navigation = useTypedNavigation();
    const client = useClient4(isTestnet);
    const selected = useSelectedAccount();
    const queryClient = useQueryClient();

    const handler = React.useCallback(async (resolved: ResolvedUrl) => {
        if (resolved.type === 'transaction') {
            if (resolved.payload) {
                navigation.navigateTransfer({
                    order: {
                        type: 'order',
                        messages: [{
                            target: resolved.address.toString({ testOnly: isTestnet }),
                            amount: resolved.amount || BigInt(0),
                            amountAll: false,
                            stateInit: resolved.stateInit,
                            payload: resolved.payload,
                        }]
                    },
                    text: resolved.comment,
                    job: null,
                    callback: null
                });
            } else {
                navigation.navigateSimpleTransfer({
                    target: resolved.address.toString({ testOnly: isTestnet }),
                    comment: resolved.comment,
                    amount: resolved.amount,
                    stateInit: resolved.stateInit,
                    job: null,
                    jetton: null,
                    callback: null
                });
            }
        }
        if (resolved.type === 'jetton-transaction') {
            if (!selected) {
                return;
            }

            // TODO: replace with getter
            const jettonWallet = await queryClient.fetchQuery({
                queryKey: Queries.Jettons().Address(selected!.addressString).Wallet(resolved.jettonMaster.toString({ testOnly: isTestnet })),
                queryFn: jettonWalletAddressQueryFn(client, resolved.jettonMaster.toString({ testOnly: isTestnet }), selected!.addressString, isTestnet)
            });

            if (!jettonWallet) {
                Alert.alert(t('transfer.wrongJettonTitle'), t('transfer.wrongJettonMessage'));
                return;
            }

            navigation.navigateSimpleTransfer({
                target: resolved.address.toString({ testOnly: isTestnet }),
                comment: resolved.comment,
                amount: resolved.amount,
                stateInit: null,
                job: null,
                jetton: Address.parse(jettonWallet),
                callback: null
            });
        }
        if (resolved.type === 'connect') {
            navigation.navigate('Authenticate', {
                session: resolved.session,
                endpoint: resolved.endpoint
            });
        }
        if (resolved.type === 'tonconnect') {
            navigation.navigate('TonConnectAuthenticate', { query: resolved.query, type: 'qr' });
        }
        if (resolved.type === 'install') {
            navigation.navigate('Install', {
                url: resolved.url,
                title: resolved.customTitle,
                image: resolved.customImage
            });
        }
    }, []);

    return handler;
}
