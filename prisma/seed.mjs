import "dotenv/config";
import bcrypt from "bcryptjs";
import {
    MessageTemplateKey,
    MediaType,
    PlanType,
    PrismaClient,
    ProductType,
    RiderAvailabilityStatus,
    RiderStatus,
    RiderVehicleType,
    SubscriptionStatus,
    UserRole,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
    adapter,
    log: ["error", "warn"],
});

async function upsertUser(input) {
    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.upsert({
        where: { email: input.email },
        update: {
            name: input.name,
            password: passwordHash,
            role: input.role,
            accessStatus: "ACTIVE",
        },
        create: {
            email: input.email,
            name: input.name,
            password: passwordHash,
            role: input.role,
            accessStatus: "ACTIVE",
        },
    });

    if (input.planType) {
        const endDate =
            input.planType === PlanType.FREE
                ? null
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await prisma.subscription.upsert({
            where: { userId: user.id },
            update: {
                planType: input.planType,
                status: input.subscriptionStatus ?? SubscriptionStatus.ACTIVE,
                startDate: new Date(),
                endDate,
                graceUntil: null,
                planPriceCents: input.planPriceCents ?? 0,
            },
            create: {
                userId: user.id,
                planType: input.planType,
                status: input.subscriptionStatus ?? SubscriptionStatus.ACTIVE,
                startDate: new Date(),
                endDate,
                graceUntil: null,
                planPriceCents: input.planPriceCents ?? 0,
            },
        });
    }

    if (input.role === UserRole.MERCHANT || input.merchantProfile) {
        const storeName = input.merchantProfile?.storeName ?? input.name;

        await prisma.merchant.upsert({
            where: { userId: user.id },
            update: {
                storeName,
            },
            create: {
                userId: user.id,
                storeName,
            },
        });
    }

    return user;
}

async function seedUsers() {
    const admin = await upsertUser({
        email: "admin@coinrise.local",
        password: "admin123",
        name: "CoinRise Admin",
        role: UserRole.SUPER_ADMIN,
    });

    const freeCustomer = await upsertUser({
        email: "free@coinrise.local",
        password: "free123",
        name: "Cliente Free",
        role: UserRole.MERCHANT,
        merchantProfile: {
            storeName: "Loja Free",
        },
        planType: PlanType.FREE,
        planPriceCents: 0,
    });

    const paidCustomer = await upsertUser({
        email: "pro@coinrise.local",
        password: "pro123",
        name: "Cliente Pro",
        role: UserRole.MERCHANT,
        merchantProfile: {
            storeName: "Floovi Guaimbe",
        },
        planType: PlanType.PRO,
        planPriceCents: Number(process.env.SAAS_PRO_PRICE_CENTS ?? 9900),
    });

    return { admin, freeCustomer, paidCustomer };
}

async function seedMarketplaceRiders() {
    const riderSeeds = [
        {
            email: "market-rider1@coinrise.local",
            password: "rider123",
            name: "Diego Marketplace",
            displayName: "Diego Marketplace",
            documentNumber: "99911122301",
            cnhNumber: "CNHSEEDMKT001",
            vehicleType: RiderVehicleType.MOTORCYCLE,
            vehiclePlate: "MKT1A01",
        },
        {
            email: "market-rider2@coinrise.local",
            password: "rider123",
            name: "Fernanda Marketplace",
            displayName: "Fernanda Marketplace",
            documentNumber: "99911122302",
            cnhNumber: "CNHSEEDMKT002",
            vehicleType: RiderVehicleType.MOTORCYCLE,
            vehiclePlate: "MKT2B02",
        },
    ];

    const riders = [];

    for (const riderSeed of riderSeeds) {
        const user = await upsertUser({
            email: riderSeed.email,
            password: riderSeed.password,
            name: riderSeed.name,
            role: UserRole.RIDER,
        });

        const rider = await prisma.rider.upsert({
            where: { userId: user.id },
            update: {
                ownerUserId: null,
                displayName: riderSeed.displayName,
                documentNumber: riderSeed.documentNumber,
                cnhNumber: riderSeed.cnhNumber,
                vehicleType: riderSeed.vehicleType,
                vehiclePlate: riderSeed.vehiclePlate,
                isStoreOwned: false,
                status: RiderStatus.ACTIVE,
                availabilityStatus: RiderAvailabilityStatus.OFFLINE,
                incidentBlockedUntil: null,
            },
            create: {
                userId: user.id,
                ownerUserId: null,
                displayName: riderSeed.displayName,
                documentNumber: riderSeed.documentNumber,
                cnhNumber: riderSeed.cnhNumber,
                vehicleType: riderSeed.vehicleType,
                vehiclePlate: riderSeed.vehiclePlate,
                isStoreOwned: false,
                status: RiderStatus.ACTIVE,
                availabilityStatus: RiderAvailabilityStatus.OFFLINE,
                incidentBlockedUntil: null,
            },
        });

        riders.push({ user, rider, password: riderSeed.password });
    }

    return riders;
}

async function seedBot(userId, suffix) {
    return prisma.botAccount.upsert({
        where: { phoneNumber: `+55000000000${suffix}` },
        update: {
            ownerUserId: userId,
            name: `Conta ${suffix}`,
            isUserAccount: true,
            isActive: false,
        },
        create: {
            ownerUserId: userId,
            name: `Conta ${suffix}`,
            phoneNumber: `+55000000000${suffix}`,
            apiId: 123456 + Number(suffix),
            apiHash: `hash_${suffix}`,
            isUserAccount: true,
            isActive: false,
        },
    });
}

async function seedTenantCatalog(userId, prefix, priceCents) {
    await prisma.product.upsert({
        where: { id: `${prefix.toLowerCase()}-vip-plan` },
        update: {
            ownerUserId: userId,
            title: `${prefix} VIP`,
            description: `${prefix} acesso premium`,
            priceCents,
            productType: ProductType.SUBSCRIPTION,
            subscriberDays: 30,
            isActive: true,
        },
        create: {
            id: `${prefix.toLowerCase()}-vip-plan`,
            ownerUserId: userId,
            title: `${prefix} VIP`,
            description: `${prefix} acesso premium`,
            priceCents,
            productType: ProductType.SUBSCRIPTION,
            subscriberDays: 30,
            isActive: true,
        },
    });

    await prisma.messageTemplate.upsert({
        where: { id: `${prefix.toLowerCase()}-welcome-template` },
        update: {
            ownerUserId: userId,
            key: MessageTemplateKey.WELCOME,
            title: `${prefix} boas vindas`,
            type: MediaType.TEXT,
            text: `Oi meu amor, eu sou a ${prefix}. Me conta o que voce quer ver hoje.`,
            isActive: true,
            tags: ["welcome", prefix.toLowerCase()],
        },
        create: {
            id: `${prefix.toLowerCase()}-welcome-template`,
            ownerUserId: userId,
            key: MessageTemplateKey.WELCOME,
            title: `${prefix} boas vindas`,
            type: MediaType.TEXT,
            text: `Oi meu amor, eu sou a ${prefix}. Me conta o que voce quer ver hoje.`,
            isActive: true,
            tags: ["welcome", prefix.toLowerCase()],
        },
    });

    await prisma.messageTemplate.upsert({
        where: { id: `${prefix.toLowerCase()}-dontsell-template` },
        update: {
            ownerUserId: userId,
            key: MessageTemplateKey.DONT_SELL,
            title: `${prefix} resgate`,
            type: MediaType.TEXT,
            text: "Ainda estou te esperando. Se quiser, eu separo uma condicao especial para voce agora.",
            isActive: true,
            tags: ["resgate", prefix.toLowerCase()],
        },
        create: {
            id: `${prefix.toLowerCase()}-dontsell-template`,
            ownerUserId: userId,
            key: MessageTemplateKey.DONT_SELL,
            title: `${prefix} resgate`,
            type: MediaType.TEXT,
            text: "Ainda estou te esperando. Se quiser, eu separo uma condicao especial para voce agora.",
            isActive: true,
            tags: ["resgate", prefix.toLowerCase()],
        },
    });
}

async function seedTransaction(userId) {
    const subscription = await prisma.subscription.findUnique({
        where: { userId },
    });

    if (!subscription || subscription.planPriceCents <= 0) {
        return;
    }

    await prisma.transaction.upsert({
        where: { gatewayReference: `seed_paid_${userId}` },
        update: {
            status: "PAID",
            amountCents: subscription.planPriceCents,
            paidAt: new Date(),
            referenceDate: new Date(),
            subscriptionId: subscription.id,
        },
        create: {
            userId,
            subscriptionId: subscription.id,
            amountCents: subscription.planPriceCents,
            status: "PAID",
            paidAt: new Date(),
            referenceDate: new Date(),
            gatewayReference: `seed_paid_${userId}`,
        },
    });
}

async function main() {
    console.log("Seeding SaaS users...");

    const { admin, freeCustomer, paidCustomer } = await seedUsers();

    await seedBot(freeCustomer.id, "1");
    await seedBot(paidCustomer.id, "2");
    await seedTenantCatalog(freeCustomer.id, "Luna", 3900);
    await seedTenantCatalog(paidCustomer.id, "Clara", 6900);
    await seedTransaction(paidCustomer.id);
    const riders = await seedMarketplaceRiders();

    console.log("Admin:");
    console.log("  email: admin@coinrise.local");
    console.log("  password: admin123");
    console.log("Free customer:");
    console.log("  email: free@coinrise.local");
    console.log("  password: free123");
    console.log("Paid customer:");
    console.log("  email: pro@coinrise.local");
    console.log("  password: pro123");
    console.log("Marketplace riders:");
    for (const { user, password } of riders) {
        console.log(`  email: ${user.email}`);
        console.log(`  password: ${password}`);
    }
    console.log("Seed completed:", {
        adminId: admin.id,
        freeCustomerId: freeCustomer.id,
        paidCustomerId: paidCustomer.id,
        riderIds: riders.map(({ rider }) => rider.id),
    });
}

main()
    .catch((error) => {
        console.error("Seed error:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
