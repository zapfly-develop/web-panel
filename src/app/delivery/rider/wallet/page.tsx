import { WalletOverview } from "@/features/wallet/pages/wallet-overview";
import {
    getMyWallet,
    getWalletStatement,
} from "@/features/wallet/services/wallet-api";
import type {
    RiderWallet,
    WalletStatement,
} from "@/features/wallet/services/wallet-types";
import { requireRiderUser } from "@/lib/server-session";

export const runtime = "nodejs";

export default async function RiderWalletPage() {
    const user = await requireRiderUser();

    let wallet: RiderWallet | null = null;
    let statement: WalletStatement | null = null;
    let loadError: string | null = null;

    try {
        const [walletData, statementData] = await Promise.all([
            getMyWallet(user.id),
            getWalletStatement(user.id, { take: 50 }),
        ]);

        wallet = walletData;
        statement = statementData;
    } catch (error) {
        loadError =
            error instanceof Error
                ? error.message
                : "Nao foi possivel carregar sua carteira.";
    }

    return (
        <WalletOverview
            initialWallet={wallet}
            initialStatement={statement}
            loadError={loadError}
        />
    );
}
