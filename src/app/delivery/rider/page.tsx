import { redirect } from "next/navigation";
import { RiderDashboard } from "@/features/delivery/pages/rider-dashboard";
import {
    getMyActiveDelivery,
    getMyRiderProfile,
} from "@/features/delivery/services/delivery-api";
import type {
    DeliveryRider,
    StoreDelivery,
} from "@/features/delivery/services/delivery-types";
import { requireSessionUser } from "@/lib/server-session";

export const runtime = "nodejs";

export default async function RiderAppPage() {
    const user = await requireSessionUser();

    if (user.isSuperAdmin) {
        redirect("/admin/dashboard");
    }

    let profile: DeliveryRider | null = null;
    let activeDelivery: StoreDelivery | null = null;
    let loadError: string | null = null;

    try {
        profile = await getMyRiderProfile(user.id);
        activeDelivery = await getMyActiveDelivery(user.id);
    } catch (error) {
        loadError =
            error instanceof Error
                ? error.message
                : "Nao foi possivel carregar seu perfil de entregador.";
    }

    return (
        <RiderDashboard
            userId={user.id}
            initialProfile={profile}
            initialActiveDelivery={activeDelivery}
            loadError={loadError}
        />
    );
}
