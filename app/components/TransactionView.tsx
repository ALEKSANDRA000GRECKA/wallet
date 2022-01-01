import * as React from 'react';
import { Text, View } from 'react-native';
import { fromNano, RawTransaction } from 'ton';

export function TransactionView(props: { tx: RawTransaction }) {
    const tx = props.tx;

    // Transfer out
    if (tx.inMessage && tx.inMessage.info.src === null && tx.outMessages.length === 1 && tx.outMessages[0].info.type === 'internal') {
        return (
            <View>
                <Text>OUT: {fromNano(tx.outMessages[0].info.value.coins)} {tx.outMessages[0].info.dest!.toFriendly()}</Text>
            </View>
        );
    }

    // Transfer in
    if (tx.inMessage && tx.inMessage.info.src !== null && tx.inMessage.info.type === 'internal' && tx.outMessages.length === 0) {
        return (
            <View>
                <Text>IN: {fromNano(tx.inMessage.info.value.coins)} {tx.inMessage.info.src!.toFriendly()}</Text>
            </View>
        );
    }

    return (
        <View>
            <Text>TX</Text>
        </View>
    );
}