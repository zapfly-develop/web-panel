import { auth } from "@/auth";
import { redirect } from "next/navigation";

export async function requireSessionUser() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    return session.user;
}

export async function requireSuperAdminUser() {
    const user = await requireSessionUser();

    if (!user.isSuperAdmin) {
        redirect("/dashboard");
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
