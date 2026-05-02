"use server";

import { redirect } from "next/navigation";
import { PlanType } from "@prisma/client";
import {
    activateFreePlan,
    createPaidPlanCheckout,
} from "@/lib/saas/server";
import { requireStoreUser } from "@/lib/server-session";

export async function activateFreePlanAction() {
    const user = await requireStoreUser();
    await activateFreePlan(user.id);
    redirect("/dashboard");
}

export async function checkoutPlanAction(formData: FormData) {
    const user = await requireStoreUser();
    const planType = String(formData.get("planType") ?? "") as PlanType;

    if (!Object.values(PlanType).includes(planType)) {
        redirect("/billing");
    }

    if (planType === PlanType.FREE) {
        await activateFreePlan(user.id);
        redirect("/dashboard");
    }

    const result = await createPaidPlanCheckout(user.id, planType);
    redirect(`/billing?checkout=${result.transaction.id}`);
}
