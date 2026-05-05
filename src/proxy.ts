import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAccessSummary } from "@/lib/saas/access";

const ADMIN_HOME = "/admin/dashboard";
const STORE_HOME = "/dashboard";
const RIDER_HOME = "/delivery/rider";
const RIDER_REGISTER = "/delivery/rider/register";
const BILLING_HOME = "/billing";

function matchesPath(pathname: string, path: string) {
    return pathname === path || pathname.startsWith(`${path}/`);
}

function getSignedInHomePath(input: {
    isSuperAdmin: boolean;
    isRider: boolean;
}) {
    if (input.isSuperAdmin) {
        return ADMIN_HOME;
    }

    if (input.isRider) {
        return RIDER_HOME;
    }

    return STORE_HOME;
}

export default auth(async (req) => {
    const session = req.auth;
    const pathname = req.nextUrl.pathname;
    const sessionUserId = session?.user?.id;
    const isLoggedIn = Boolean(sessionUserId);
    const isApiRoute = pathname.startsWith("/api/");
    const isAdminRoute = matchesPath(pathname, "/admin");
    const isDashboardRoute = matchesPath(pathname, "/dashboard");
    const isBillingRoute = matchesPath(pathname, "/billing");
    const isRiderRoute = matchesPath(pathname, RIDER_HOME);
    const isRiderRegisterRoute = matchesPath(pathname, RIDER_REGISTER);
    const isDashboardApiRoute = matchesPath(pathname, "/api/dashboard");
    const isRiderApiRoute = matchesPath(pathname, "/api/delivery/rider");

    if (!isLoggedIn) {
        if (isRiderRegisterRoute) {
            return NextResponse.next();
        }

        if (isApiRoute) {
            return NextResponse.json(
                { error: "Sessao obrigatoria." },
                { status: 401 },
            );
        }

        return NextResponse.redirect(new URL("/login", req.nextUrl));
    }

    const dbUser = await prisma.user.findUnique({
        where: { id: String(sessionUserId) },
        include: {
            subscription: true,
            riderProfile: {
                select: {
                    id: true,
                    status: true,
                },
            },
        },
    });

    if (!dbUser) {
        if (isApiRoute) {
            return NextResponse.json(
                { error: "Sessao invalida." },
                { status: 401 },
            );
        }

        return NextResponse.redirect(new URL("/login", req.nextUrl));
    }

    const access = getAccessSummary({
        role: dbUser.role,
        accessStatus: dbUser.accessStatus,
        subscription: dbUser.subscription,
        aiMessageLimitOverride: dbUser.aiMessageLimitOverride,
    });
    const isSuperAdmin = access.isSuperAdmin;
    const isRider = Boolean(dbUser.riderProfile);
    const hasActiveAccess = access.hasActiveAccess;

    if (isRiderRegisterRoute) {
        return NextResponse.redirect(
            new URL(
                getSignedInHomePath({ isSuperAdmin, isRider }),
                req.nextUrl,
            ),
        );
    }

    if (isDashboardApiRoute) {
        if (isSuperAdmin || isRider) {
            return NextResponse.json(
                { error: "Acesso nao permitido para este usuario." },
                { status: 403 },
            );
        }

        return NextResponse.next();
    }

    if (isRiderApiRoute) {
        if (isSuperAdmin || !isRider) {
            return NextResponse.json(
                { error: "Acesso exclusivo para entregadores." },
                { status: 403 },
            );
        }

        return NextResponse.next();
    }

    if (isAdminRoute) {
        if (!isSuperAdmin) {
            return NextResponse.redirect(
                new URL(
                    getSignedInHomePath({ isSuperAdmin, isRider }),
                    req.nextUrl,
                ),
            );
        }

        return NextResponse.next();
    }

    if (isBillingRoute) {
        if (isSuperAdmin) {
            return NextResponse.redirect(new URL(ADMIN_HOME, req.nextUrl));
        }

        if (isRider) {
            return NextResponse.redirect(new URL(RIDER_HOME, req.nextUrl));
        }

        return NextResponse.next();
    }

    if (isRiderRoute) {
        if (isSuperAdmin) {
            return NextResponse.redirect(new URL(ADMIN_HOME, req.nextUrl));
        }

        if (!isRider) {
            return NextResponse.redirect(new URL(STORE_HOME, req.nextUrl));
        }

        return NextResponse.next();
    }

    if (isDashboardRoute) {
        if (isSuperAdmin) {
            return NextResponse.redirect(new URL(ADMIN_HOME, req.nextUrl));
        }

        if (isRider) {
            return NextResponse.redirect(new URL(RIDER_HOME, req.nextUrl));
        }

        if (!hasActiveAccess) {
            return NextResponse.redirect(new URL(BILLING_HOME, req.nextUrl));
        }
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        "/admin/:path*",
        "/dashboard/:path*",
        "/billing/:path*",
        "/delivery/rider/:path*",
        "/api/dashboard/:path*",
        "/api/delivery/rider/:path*",
    ],
};
