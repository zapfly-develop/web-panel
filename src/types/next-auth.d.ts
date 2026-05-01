import "next-auth";
import "next-auth/jwt";
import {
    PlanType,
    RiderStatus,
    SubscriptionStatus,
    UserAccessStatus,
    UserRole,
} from "@prisma/client";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            role?: UserRole;
            accessStatus?: UserAccessStatus;
            planType?: PlanType | null;
            subscriptionStatus?: SubscriptionStatus | null;
            hasActiveAccess?: boolean;
            isSuperAdmin?: boolean;
            isRider?: boolean;
            riderStatus?: RiderStatus | null;
        };
    }

    interface User {
        id: string;
        role?: UserRole;
        accessStatus?: UserAccessStatus;
        planType?: PlanType | null;
        subscriptionStatus?: SubscriptionStatus | null;
        hasActiveAccess?: boolean;
        isRider?: boolean;
        riderStatus?: RiderStatus | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role?: UserRole;
        accessStatus?: UserAccessStatus;
        planType?: PlanType | null;
        subscriptionStatus?: SubscriptionStatus | null;
        hasActiveAccess?: boolean;
        isSuperAdmin?: boolean;
        isRider?: boolean;
        riderStatus?: RiderStatus | null;
    }
}
