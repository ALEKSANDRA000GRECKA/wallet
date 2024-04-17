import { useQuery } from "@tanstack/react-query";
import { Queries } from "../../queries";
import { JettonsConfig, fetchJettonsconfig } from "../../api/fetchJettonsconfig";

export function useJettonsConfig(isTestnet: boolean): JettonsConfig | null {
    return useQuery({
        queryKey: Queries.Jettons().Config(isTestnet ? 'testnet' : 'mainnet'),
        queryFn: async () => {
            const res = await fetchJettonsconfig();

            if (!res) {
                return null;
            }

            return isTestnet ? res.testnet : res.mainnet;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnMount: true,
        refetchOnWindowFocus: true,
    }).data ?? null;
}