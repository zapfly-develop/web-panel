import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
    const session = req.auth;
    const pathname = req.nextUrl.pathname;
    const isLoggedIn = Boolean(session?.user?.id);
    const isSuperAdmin = Boolean(session?.user?.isSuperAdmin);
    const isRider = Boolean(session?.user?.isRider);
    const hasActiveAccess = Boolean(session?.user?.hasActiveAccess);
    const isApiRoute = pathname.startsWith("/api/");

    if (!isLoggedIn) {
        if (isApiRoute) {
            return NextResponse.json(
                { error: "Sessao obrigatoria." },
                { status: 401 },
            );
        }

        return NextResponse.redirect(new URL("/login", req.nextUrl));
    }

    if (pathname.startsWith("/api/dashboard")) {
        if (isSuperAdmin || isRider) {
            return NextResponse.json(
                { error: "Acesso nao permitido para este usuario." },
                { status: 403 },
            );
        }

        return NextResponse.next();
    }

    if (pathname.startsWith("/admin")) {
        if (!isSuperAdmin) {
            return NextResponse.redirect(
                new URL(isRider ? "/delivery/rider" : "/dashboard", req.nextUrl),
            );
        }

        return NextResponse.next();
    }

    if (pathname.startsWith("/billing")) {
        if (isSuperAdmin) {
            return NextResponse.redirect(
                new URL("/admin/dashboard", req.nextUrl),
            );
        }

        if (isRider) {
            return NextResponse.redirect(new URL("/delivery/rider", req.nextUrl));
        }

        return NextResponse.next();
    }

    if (pathname.startsWith("/delivery/rider")) {
        if (isSuperAdmin) {
            return NextResponse.redirect(
                new URL("/admin/dashboard", req.nextUrl),
            );
        }

        if (!isRider) {
            return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
        }

        return NextResponse.next();
    }

    if (pathname.startsWith("/dashboard")) {
        if (isSuperAdmin) {
            return NextResponse.redirect(
                new URL("/admin/dashboard", req.nextUrl),
            );
        }

        if (isRider) {
            return NextResponse.redirect(new URL("/delivery/rider", req.nextUrl));
        }

        if (!hasActiveAccess) {
            return NextResponse.redirect(new URL("/billing", req.nextUrl));
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
    ],
};
