import { redirect } from "next/navigation";
import { requireRiderUser } from "@/lib/server-session";

export const runtime = "nodejs";

type DeliveryAvailablePageProps = {
    searchParams: Promise<{
        deliveryId?: string;
    }>;
};

export default async function DeliveryAvailablePage({
    searchParams,
}: DeliveryAvailablePageProps) {
    await requireRiderUser();

    const { deliveryId } = await searchParams;
    const riderPath = deliveryId
        ? `/delivery/rider?deliveryId=${encodeURIComponent(deliveryId)}`
        : "/delivery/rider";

    redirect(riderPath);
}
