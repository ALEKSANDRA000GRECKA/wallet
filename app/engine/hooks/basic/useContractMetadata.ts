import { useQuery } from '@tanstack/react-query';
import { useNetwork } from '../useNetwork';
import { useClient4 } from '../useClient4';
import { Queries } from '../../queries';
import { contractMetadataQueryFn } from '../usePrefetchHints';

export function useContractMetadata(contract: string | null) {
    const { isTestnet } = useNetwork();
    const client = useClient4(isTestnet);

    return useQuery({
        queryKey: Queries.ContractMetadata(contract!),
        queryFn: contractMetadataQueryFn(client, isTestnet, contract!),
        staleTime: Infinity,
        enabled: contract !== null,
    }).data ?? null;
}