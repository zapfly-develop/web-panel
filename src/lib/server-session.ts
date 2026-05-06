import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
    getAccessSummary,
    isMerchantRole,
    isRiderRole,
} from "@/lib/saas/access";
import { redirect } from "next/navigation";

export async function requireSessionUser() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
            subscription: true,
            merchantProfile: {
                select: {
                    id: true,
                },
            },
            riderProfile: {
                select: {
                    id: true,
                    status: true,
                },
            },
        },
    });

    if (!dbUser) {
        redirect("/login");
    }

    const access = getAccessSummary({
        role: dbUser.role,
        accessStatus: dbUser.accessStatus,
        subscription: dbUser.subscription,
        aiMessageLimitOverride: dbUser.aiMessageLimitOverride,
    });
    const isRider = isRiderRole(dbUser.role) || Boolean(dbUser.riderProfile);
    const isMerchant =
        !isRider &&
        (Boolean(dbUser.merchantProfile) || isMerchantRole(dbUser.role));

    return {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        accessStatus: dbUser.accessStatus,
        planType: access.planType,
        subscriptionStatus: dbUser.subscription?.status ?? null,
        hasActiveAccess: access.hasActiveAccess,
        isSuperAdmin: access.isSuperAdmin,
        isMerchant,
        merchantId: dbUser.merchantProfile?.id ?? null,
        isRider,
        riderStatus: dbUser.riderProfile?.status ?? null,
    };
}

export async function requireSuperAdminUser() {
    const user = await requireSessionUser();

    if (!user.isSuperAdmin) {
        redirect("/dashboard");
    }

    return user;
}

export async function requireStoreUser() {
    const user = await requireSessionUser();

    if (user.isSuperAdmin) {
        redirect("/admin/dashboard");
    }

    if (user.isRider) {
        redirect("/delivery/rider");
    }

    if (!user.isMerchant) {
        redirect("/login");
    }

    return user;
}

export async function requireRiderUser() {
    const user = await requireSessionUser();

    if (user.isSuperAdmin) {
        redirect("/admin/dashboard");
    }

    if (!user.isRider) {
        redirect("/dashboard");
    }

    return user;
}
