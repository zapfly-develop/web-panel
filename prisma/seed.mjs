import "dotenv/config";
import bcrypt from "bcryptjs";
import {
    DeliveryAssignmentType,
    DeliveryPaymentHandledBy,
    DeliveryStatus,
    DeliveryType,
    MessageTemplateKey,
    MediaType,
    OrderStatus,
    PaymentMethod,
    PlanType,
    PrismaClient,
    ProductType,
    RiderAvailabilityStatus,
    RiderStatus,
    RiderVehicleType,
    StorageLocationType,
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

const GUAIMBE_STORE_LOCATION = {
    street: "Rua Rui Barbosa",
    number: "100",
    neighborhood: "Centro",
    city: "Guaimbe",
    state: "SP",
    postalCode: "16480-100",
    country: "BR",
    formattedAddress:
        "Rua Rui Barbosa, 100 - Centro, Guaimbe - SP, 16480-100, Brasil",
    latitude: -21.9091,
    longitude: -49.8986,
};

const GUAIMBE_DESTINATIONS = [
    {
        address: "Rua Carlos Gomes, 42 - Centro, Guaimbe - SP, 16480-001",
        latitude: -21.9084,
        longitude: -49.8992,
    },
    {
        address: "Rua Duque de Caxias, 88 - Centro, Guaimbe - SP, 16480-003",
        latitude: -21.9102,
        longitude: -49.8977,
    },
    {
        address:
            "Avenida Justiniano Alves de Oliveira, 145 - Centro, Guaimbe - SP, 16480-006",
        latitude: -21.9077,
        longitude: -49.8979,
    },
    {
        address: "Rua Osvaldo Cruz, 171 - Centro, Guaimbe - SP, 16480-007",
        latitude: -21.9109,
        longitude: -49.8997,
    },
    {
        address: "Rua Castro Alves, 65 - Centro, Guaimbe - SP, 16480-009",
        latitude: -21.9096,
        longitude: -49.8969,
    },
    {
        address: "Rua Machado de Assis, 210 - Centro, Guaimbe - SP, 16480-011",
        latitude: -21.9114,
        longitude: -49.8971,
    },
    {
        address: "Rua Henrique Dias, 128 - Centro, Guaimbe - SP, 16480-013",
        latitude: -21.9069,
        longitude: -49.9001,
    },
    {
        address: "Rua Ana Nery, 59 - Centro, Guaimbe - SP, 16480-015",
        latitude: -21.9121,
        longitude: -49.9004,
    },
    {
        address: "Rua Tiradentes, 97 - Centro, Guaimbe - SP, 16480-017",
        latitude: -21.9081,
        longitude: -49.8958,
    },
    {
        address: "Rua Rui Barbosa, 260 - Centro, Guaimbe - SP, 16480-019",
        latitude: -21.9106,
        longitude: -49.8959,
    },
    {
        address:
            "Rua Fernando Martins Paredes, 294 - Centro, Guaimbe - SP, 16480-970",
        latitude: -21.9095,
        longitude: -49.8991,
    },
    {
        address:
            "Rua Marechal Deodoro, 117 - Centro, Guaimbe - SP, 16480-023",
        latitude: -21.9073,
        longitude: -49.8988,
    },
    {
        address: "Rua Regente Feijo, 134 - Centro, Guaimbe - SP, 16480-025",
        latitude: -21.9117,
        longitude: -49.8983,
    },
    {
        address: "Rua Santos Dumont, 76 - Centro, Guaimbe - SP, 16480-027",
        latitude: -21.9126,
        longitude: -49.8976,
    },
    {
        address:
            "Rua Jose Francisco de Mattos, 201 - Centro, Guaimbe - SP, 16480-029",
        latitude: -21.9067,
        longitude: -49.8972,
    },
    {
        address:
            "Rua Joaquim Inocencio, 52 - Centro, Guaimbe - SP, 16480-031",
        latitude: -21.9099,
        longitude: -49.901,
    },
    {
        address:
            "Rua Altamiro Belmiro Rocha, 149 - Centro, Guaimbe - SP, 16480-033",
        latitude: -21.9132,
        longitude: -49.8994,
    },
    {
        address:
            "Rua David Ferreira de Souza, 185 - Conjunto Habitacional Guaimbe I, Guaimbe - SP, 16480-184",
        latitude: -21.9059,
        longitude: -49.9008,
    },
    {
        address:
            "Rua Almirante Barroso, 92 - Centro, Guaimbe - SP, 16480-005",
        latitude: -21.9088,
        longitude: -49.8963,
    },
    {
        address:
            "Rua Fernando Martins Paredes, 360 - Centro, Guaimbe - SP, 16480-021",
        latitude: -21.911,
        longitude: -49.9014,
    },
];

const GUAIMBE_DELIVERY_PRODUCTS = [
    {
        id: "pro-guaimbe-x-salada",
        title: "X-Salada Artesanal",
        description: "Lanche com hamburguer, queijo, salada e molho da casa.",
        priceCents: 2590,
        category: "Lanches",
    },
    {
        id: "pro-guaimbe-marmita-frango",
        title: "Marmita de Frango",
        description: "Arroz, feijao, frango grelhado, batata e salada.",
        priceCents: 2290,
        category: "Marmitas",
    },
    {
        id: "pro-guaimbe-pizza-broto",
        title: "Pizza Broto",
        description: "Pizza broto de mussarela com tomate e oregano.",
        priceCents: 3190,
        category: "Pizzas",
    },
    {
        id: "pro-guaimbe-suco-natural",
        title: "Suco Natural",
        description: "Suco natural gelado de laranja.",
        priceCents: 890,
        category: "Bebidas",
    },
];

const COMPLETED_DELIVERY_RATINGS = [
    { score: 5, comment: "Entrega rapida e produto perfeito." },
    { score: 4, comment: "Chegou dentro do prazo combinado." },
    { score: 5, comment: "Motoboy educado e muito agil." },
    { score: 3, comment: "Entrega ok, mas poderia avisar antes de chegar." },
    { score: 5, comment: "Excelente atendimento na entrega." },
    { score: 4, comment: "Pedido chegou quente e bem embalado." },
    { score: 5, comment: "Experiencia muito boa." },
    { score: 4, comment: "Entrega tranquila e sem problemas." },
    { score: 5, comment: "Muito rapido, recomendo." },
    { score: 3, comment: "Demorou um pouco, mas chegou certo." },
];

function addMinutes(date, minutes) {
    return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date, days) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function calculateDistanceMeters(origin, destination) {
    const earthRadiusMeters = 6371000;
    const toRadians = (value) => (value * Math.PI) / 180;
    const latitudeDelta = toRadians(destination.latitude - origin.latitude);
    const longitudeDelta = toRadians(destination.longitude - origin.longitude);
    const originLatitude = toRadians(origin.latitude);
    const destinationLatitude = toRadians(destination.latitude);

    const haversine =
        Math.sin(latitudeDelta / 2) ** 2 +
        Math.cos(originLatitude) *
            Math.cos(destinationLatitude) *
            Math.sin(longitudeDelta / 2) ** 2;
    const angularDistance =
        2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

    return Math.max(1, Math.round(earthRadiusMeters * angularDistance));
}

function calculateDeliveryPrice(distanceMeters) {
    const baseFeeCents = 500;
    const pricePerKmCents = 250;
    const quotedPriceCents =
        baseFeeCents + Math.ceil((distanceMeters / 1000) * pricePerKmCents);

    return {
        quotedPriceCents,
        riderPayoutCents: quotedPriceCents,
    };
}

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

async function seedRiders(ownerUserId) {
    const riderSeeds = [
        {
            email: "rider1@coinrise.local",
            password: "rider123",
            name: "Rafael Motoboy",
            displayName: "Rafael Motoboy",
            documentNumber: "99911122201",
            cnhNumber: "CNHSEED001",
            vehicleType: RiderVehicleType.MOTORCYCLE,
            vehiclePlate: "ZAP1A01",
        },
        {
            email: "rider2@coinrise.local",
            password: "rider123",
            name: "Bianca Express",
            displayName: "Bianca Express",
            documentNumber: "99911122202",
            cnhNumber: "CNHSEED002",
            vehicleType: RiderVehicleType.BICYCLE,
            vehiclePlate: null,
        },
        {
            email: "rider3@coinrise.local",
            password: "rider123",
            name: "Carlos Entregas",
            displayName: "Carlos Entregas",
            documentNumber: "99911122203",
            cnhNumber: "CNHSEED003",
            vehicleType: RiderVehicleType.CAR,
            vehiclePlate: "ZAP3C03",
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
                ownerUserId,
                displayName: riderSeed.displayName,
                documentNumber: riderSeed.documentNumber,
                cnhNumber: riderSeed.cnhNumber,
                vehicleType: riderSeed.vehicleType,
                vehiclePlate: riderSeed.vehiclePlate,
                isStoreOwned: true,
                status: RiderStatus.ACTIVE,
                availabilityStatus: RiderAvailabilityStatus.OFFLINE,
                incidentBlockedUntil: null,
            },
            create: {
                userId: user.id,
                ownerUserId,
                displayName: riderSeed.displayName,
                documentNumber: riderSeed.documentNumber,
                cnhNumber: riderSeed.cnhNumber,
                vehicleType: riderSeed.vehicleType,
                vehiclePlate: riderSeed.vehiclePlate,
                isStoreOwned: true,
                status: RiderStatus.ACTIVE,
                availabilityStatus: RiderAvailabilityStatus.OFFLINE,
                incidentBlockedUntil: null,
            },
        });

        riders.push({ user, rider, password: riderSeed.password });
    }

    return riders;
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

async function seedGuaimbeStoreAddress(ownerUserId) {
    const geocodedAt = new Date();

    const storeAddress = await prisma.storeAddress.upsert({
        where: { ownerUserId },
        update: {
            ...GUAIMBE_STORE_LOCATION,
            geocodedAt,
        },
        create: {
            ownerUserId,
            ...GUAIMBE_STORE_LOCATION,
            geocodedAt,
        },
    });

    await prisma.user.update({
        where: { id: ownerUserId },
        data: {
            storeAddress: GUAIMBE_STORE_LOCATION.formattedAddress,
            deliveryFeeCents: 600,
            dynamicFareBonusCents: 200,
            stagnatedTimeoutMinutes: 15,
            riderIncidentCooldownMinutes: 30,
            acceptedPaymentMethods: {
                set: [
                    PaymentMethod.PIX_DELIVERY,
                    PaymentMethod.CARD_DELIVERY,
                    PaymentMethod.CASH,
                ],
            },
            availableDeliveryTypes: {
                set: [DeliveryType.DELIVERY, DeliveryType.PICKUP],
            },
        },
    });

    await prisma.merchant.upsert({
        where: { userId: ownerUserId },
        update: {
            storeName: "Floovi Guaimbe",
            storeAddress: GUAIMBE_STORE_LOCATION.formattedAddress,
            deliveryFeeCents: 600,
            dynamicFareBonusCents: 200,
            stagnatedTimeoutMinutes: 15,
            riderIncidentCooldownMinutes: 30,
            acceptedPaymentMethods: {
                set: [
                    PaymentMethod.PIX_DELIVERY,
                    PaymentMethod.CARD_DELIVERY,
                    PaymentMethod.CASH,
                ],
            },
            availableDeliveryTypes: {
                set: [DeliveryType.DELIVERY, DeliveryType.PICKUP],
            },
        },
        create: {
            userId: ownerUserId,
            storeName: "Floovi Guaimbe",
            storeAddress: GUAIMBE_STORE_LOCATION.formattedAddress,
            deliveryFeeCents: 600,
            dynamicFareBonusCents: 200,
            stagnatedTimeoutMinutes: 15,
            riderIncidentCooldownMinutes: 30,
            acceptedPaymentMethods: [
                PaymentMethod.PIX_DELIVERY,
                PaymentMethod.CARD_DELIVERY,
                PaymentMethod.CASH,
            ],
            availableDeliveryTypes: [DeliveryType.DELIVERY, DeliveryType.PICKUP],
        },
    });

    return storeAddress;
}

async function seedGuaimbeDeliveryProducts(ownerUserId) {
    const products = [];

    for (const productSeed of GUAIMBE_DELIVERY_PRODUCTS) {
        const product = await prisma.product.upsert({
            where: { id: productSeed.id },
            update: {
                ownerUserId,
                title: productSeed.title,
                description: productSeed.description,
                priceCents: productSeed.priceCents,
                productType: ProductType.ONE_TIME,
                category: productSeed.category,
                stockQuantity: 100,
                isActive: true,
            },
            create: {
                id: productSeed.id,
                ownerUserId,
                title: productSeed.title,
                description: productSeed.description,
                priceCents: productSeed.priceCents,
                productType: ProductType.ONE_TIME,
                category: productSeed.category,
                stockQuantity: 100,
                isActive: true,
            },
        });

        products.push(product);
    }

    return products;
}

const WMS_INBOUND_PRODUCTS = [
    {
        id: "seed-wms-prod-cafe-500g",
        title: "Cafe Especial 500g",
        description: "Cafe torrado e moido para reposicao por NF-e.",
        sku: "WMS-CAFE-500G",
        category: "Mercearia",
        priceCents: 2490,
        stockQuantity: 18,
    },
    {
        id: "seed-wms-prod-acucar-1kg",
        title: "Acucar Cristal 1kg",
        description: "Acucar cristal para venda avulsa no catalogo.",
        sku: "WMS-ACUCAR-1KG",
        category: "Mercearia",
        priceCents: 690,
        stockQuantity: 42,
    },
    {
        id: "seed-wms-prod-azeite-500ml",
        title: "Azeite Extra Virgem 500ml",
        description: "Azeite extra virgem importado para controle WMS.",
        sku: "WMS-AZEITE-500ML",
        category: "Mercearia premium",
        priceCents: 4290,
        stockQuantity: 7,
    },
    {
        id: "seed-wms-prod-biscoito-chocolate",
        title: "Biscoito Recheado Chocolate",
        description: "Biscoito recheado para testar item sem codigo identico.",
        sku: "WMS-BISCOITO-CHOC",
        category: "Doces",
        priceCents: 590,
        stockQuantity: 30,
    },
];

async function seedWmsInboundScenario(ownerUserId) {
    const warehouse = await prisma.warehouse.upsert({
        where: { id: "seed-wms-warehouse-main" },
        update: {
            ownerUserId,
            name: "Galpao Principal",
        },
        create: {
            id: "seed-wms-warehouse-main",
            ownerUserId,
            name: "Galpao Principal",
        },
    });

    await prisma.storageLocation.upsert({
        where: { id: "seed-wms-location-receiving" },
        update: {
            warehouseId: warehouse.id,
            aisle: "DOC",
            shelf: "01",
            bin: "RECEB",
            code: "DOC-01-RECEB",
            type: StorageLocationType.RECEIVING,
        },
        create: {
            id: "seed-wms-location-receiving",
            warehouseId: warehouse.id,
            aisle: "DOC",
            shelf: "01",
            bin: "RECEB",
            code: "DOC-01-RECEB",
            type: StorageLocationType.RECEIVING,
        },
    });

    await prisma.storageLocation.upsert({
        where: { id: "seed-wms-location-a-01-01" },
        update: {
            warehouseId: warehouse.id,
            aisle: "A",
            shelf: "01",
            bin: "01",
            code: "A-01-01",
            type: StorageLocationType.PICKING,
        },
        create: {
            id: "seed-wms-location-a-01-01",
            warehouseId: warehouse.id,
            aisle: "A",
            shelf: "01",
            bin: "01",
            code: "A-01-01",
            type: StorageLocationType.PICKING,
        },
    });

    const products = [];

    for (const productSeed of WMS_INBOUND_PRODUCTS) {
        const product = await prisma.product.upsert({
            where: { id: productSeed.id },
            update: {
                ownerUserId,
                title: productSeed.title,
                description: productSeed.description,
                sku: productSeed.sku,
                category: productSeed.category,
                priceCents: productSeed.priceCents,
                stockQuantity: productSeed.stockQuantity,
                reservedStockQuantity: 0,
                productType: ProductType.ONE_TIME,
                isActive: true,
            },
            create: {
                id: productSeed.id,
                ownerUserId,
                title: productSeed.title,
                description: productSeed.description,
                sku: productSeed.sku,
                category: productSeed.category,
                priceCents: productSeed.priceCents,
                stockQuantity: productSeed.stockQuantity,
                reservedStockQuantity: 0,
                productType: ProductType.ONE_TIME,
                isActive: true,
            },
        });

        products.push(product);
    }

    return {
        warehouse,
        productIds: products.map((product) => product.id),
    };
}

async function seedGuaimbeRiderLocations(riderRecords) {
    const now = new Date();
    const locationOffsets = [
        { latitude: 0.0004, longitude: -0.0003 },
        { latitude: -0.0005, longitude: 0.0002 },
        { latitude: 0.0001, longitude: 0.0007 },
        { latitude: -0.0008, longitude: -0.0004 },
        { latitude: 0.0007, longitude: 0.0005 },
    ];

    const updatedRiders = await Promise.all(
        riderRecords.map(({ rider }, index) => {
            const offset = locationOffsets[index % locationOffsets.length];

            return prisma.rider.update({
                where: { id: rider.id },
                data: {
                    availabilityStatus: RiderAvailabilityStatus.AVAILABLE,
                    currentLatitude:
                        GUAIMBE_STORE_LOCATION.latitude + offset.latitude,
                    currentLongitude:
                        GUAIMBE_STORE_LOCATION.longitude + offset.longitude,
                    lastLocationAt: now,
                },
            });
        }),
    );

    return riderRecords.map((record, index) => ({
        ...record,
        rider: updatedRiders[index],
    }));
}

async function seedOrderWithDelivery(input) {
    const product = input.products[input.index % input.products.length];
    const beverage = input.products.find(
        (candidate) => candidate.id === "pro-guaimbe-suco-natural",
    );
    const quantity = input.index % 3 === 0 ? 2 : 1;
    const productSubtotalCents = product.priceCents * quantity;
    const beverageSubtotalCents =
        beverage && beverage.id !== product.id ? beverage.priceCents : 0;
    const itemSubtotalCents = productSubtotalCents + beverageSubtotalCents;
    const distanceMeters = calculateDistanceMeters(
        GUAIMBE_STORE_LOCATION,
        input.destination,
    );
    const pricing = calculateDeliveryPrice(distanceMeters);
    const totalCents = itemSubtotalCents + pricing.quotedPriceCents;
    const orderCreatedAt =
        input.status === DeliveryStatus.DELIVERED
            ? addMinutes(input.acceptedAt, -12)
            : addMinutes(input.riderSearchStartedAt, -20);
    const customerSuffix = String(input.index + 1).padStart(2, "0");
    const customerWhatsappId =
        input.status === DeliveryStatus.DELIVERED
            ? `5514998800${customerSuffix}`
            : `5514997700${customerSuffix}`;
    const orderId =
        input.status === DeliveryStatus.DELIVERED
            ? `seed-guaimbe-completed-order-${customerSuffix}`
            : `seed-guaimbe-waiting-order-${customerSuffix}`;
    const deliveryId =
        input.status === DeliveryStatus.DELIVERED
            ? `seed-guaimbe-completed-delivery-${customerSuffix}`
            : `seed-guaimbe-waiting-delivery-${customerSuffix}`;
    const paymentHandledBy =
        input.index % 2 === 0
            ? DeliveryPaymentHandledBy.RIDER
            : DeliveryPaymentHandledBy.STORE_MACHINE;

    const order = await prisma.order.upsert({
        where: { id: orderId },
        update: {
            ownerUserId: input.ownerUserId,
            customerWhatsappId,
            customerName:
                input.status === DeliveryStatus.DELIVERED
                    ? `Cliente avaliado ${customerSuffix}`
                    : `Cliente aguardando ${customerSuffix}`,
            status:
                input.status === DeliveryStatus.DELIVERED
                    ? OrderStatus.DELIVERED
                    : OrderStatus.SHIPPED,
            paymentMethod:
                paymentHandledBy === DeliveryPaymentHandledBy.STORE_MACHINE
                    ? PaymentMethod.CARD_DELIVERY
                    : PaymentMethod.CASH,
            paymentStatus:
                input.status === DeliveryStatus.DELIVERED ? "PAID" : "PENDING",
            deliveryType: DeliveryType.DELIVERY,
            changeAmount:
                paymentHandledBy === DeliveryPaymentHandledBy.RIDER ? 50 : null,
            deliveryFeeCents: pricing.quotedPriceCents,
            totalCents,
            currency: "BRL",
            deliveryAddress: input.destination.address,
            notes:
                input.status === DeliveryStatus.DELIVERED
                    ? "Seed de pedido entregue e avaliado em Guaimbe/SP."
                    : "Seed de pedido aguardando entregador em Guaimbe/SP.",
            createdAt: orderCreatedAt,
        },
        create: {
            id: orderId,
            ownerUserId: input.ownerUserId,
            customerWhatsappId,
            customerName:
                input.status === DeliveryStatus.DELIVERED
                    ? `Cliente avaliado ${customerSuffix}`
                    : `Cliente aguardando ${customerSuffix}`,
            status:
                input.status === DeliveryStatus.DELIVERED
                    ? OrderStatus.DELIVERED
                    : OrderStatus.SHIPPED,
            paymentMethod:
                paymentHandledBy === DeliveryPaymentHandledBy.STORE_MACHINE
                    ? PaymentMethod.CARD_DELIVERY
                    : PaymentMethod.CASH,
            paymentStatus:
                input.status === DeliveryStatus.DELIVERED ? "PAID" : "PENDING",
            deliveryType: DeliveryType.DELIVERY,
            changeAmount:
                paymentHandledBy === DeliveryPaymentHandledBy.RIDER ? 50 : null,
            deliveryFeeCents: pricing.quotedPriceCents,
            totalCents,
            currency: "BRL",
            deliveryAddress: input.destination.address,
            notes:
                input.status === DeliveryStatus.DELIVERED
                    ? "Seed de pedido entregue e avaliado em Guaimbe/SP."
                    : "Seed de pedido aguardando entregador em Guaimbe/SP.",
            createdAt: orderCreatedAt,
        },
    });

    await prisma.orderItem.deleteMany({
        where: { orderId: order.id },
    });

    const orderItems = [
        {
            orderId: order.id,
            productId: product.id,
            quantity,
            unitPriceCents: product.priceCents,
            subtotalCents: productSubtotalCents,
        },
    ];

    if (beverage && beverage.id !== product.id) {
        orderItems.push({
            orderId: order.id,
            productId: beverage.id,
            quantity: 1,
            unitPriceCents: beverage.priceCents,
            subtotalCents: beverageSubtotalCents,
        });
    }

    await prisma.orderItem.createMany({
        data: orderItems,
    });

    const delivery = await prisma.delivery.upsert({
        where: { orderId: order.id },
        update: {
            ownerUserId: input.ownerUserId,
            riderId: input.rider?.id ?? null,
            status: input.status,
            assignmentType: input.rider?.isStoreOwned
                ? DeliveryAssignmentType.STORE_OWNED
                : DeliveryAssignmentType.MARKETPLACE,
            paymentHandledBy,
            orderTotalCollectedByStore:
                paymentHandledBy === DeliveryPaymentHandledBy.STORE_MACHINE,
            distanceMeters,
            quotedPriceCents: pricing.quotedPriceCents,
            riderPayoutCents: pricing.riderPayoutCents,
            isHighPriority: input.index % 4 === 0,
            deliveryBonusApplied: false,
            bonusValueCents: 0,
            currency: "BRL",
            pickupAddress: GUAIMBE_STORE_LOCATION.formattedAddress,
            pickupLatitude: GUAIMBE_STORE_LOCATION.latitude,
            pickupLongitude: GUAIMBE_STORE_LOCATION.longitude,
            destinationAddress: input.destination.address,
            destinationLatitude: input.destination.latitude,
            destinationLongitude: input.destination.longitude,
            acceptedAt: input.acceptedAt ?? null,
            acceptedLatitude: input.rider?.currentLatitude ?? null,
            acceptedLongitude: input.rider?.currentLongitude ?? null,
            pickedUpAt: input.pickedUpAt ?? null,
            deliveredAt: input.deliveredAt ?? null,
            canceledAt: null,
            cancellationReason: null,
            riderSearchStartedAt: input.riderSearchStartedAt,
            createdAt: orderCreatedAt,
        },
        create: {
            id: deliveryId,
            ownerUserId: input.ownerUserId,
            orderId: order.id,
            riderId: input.rider?.id ?? null,
            status: input.status,
            assignmentType: input.rider?.isStoreOwned
                ? DeliveryAssignmentType.STORE_OWNED
                : DeliveryAssignmentType.MARKETPLACE,
            paymentHandledBy,
            orderTotalCollectedByStore:
                paymentHandledBy === DeliveryPaymentHandledBy.STORE_MACHINE,
            distanceMeters,
            quotedPriceCents: pricing.quotedPriceCents,
            riderPayoutCents: pricing.riderPayoutCents,
            isHighPriority: input.index % 4 === 0,
            deliveryBonusApplied: false,
            bonusValueCents: 0,
            currency: "BRL",
            pickupAddress: GUAIMBE_STORE_LOCATION.formattedAddress,
            pickupLatitude: GUAIMBE_STORE_LOCATION.latitude,
            pickupLongitude: GUAIMBE_STORE_LOCATION.longitude,
            destinationAddress: input.destination.address,
            destinationLatitude: input.destination.latitude,
            destinationLongitude: input.destination.longitude,
            acceptedAt: input.acceptedAt ?? null,
            acceptedLatitude: input.rider?.currentLatitude ?? null,
            acceptedLongitude: input.rider?.currentLongitude ?? null,
            pickedUpAt: input.pickedUpAt ?? null,
            deliveredAt: input.deliveredAt ?? null,
            riderSearchStartedAt: input.riderSearchStartedAt,
            createdAt: orderCreatedAt,
        },
    });

    if (input.rating && input.rider) {
        await prisma.deliveryRating.upsert({
            where: { deliveryId: delivery.id },
            update: {
                riderId: input.rider.id,
                ownerUserId: input.ownerUserId,
                customerWhatsappId,
                score: input.rating.score,
                comment: input.rating.comment,
                createdAt: input.deliveredAt,
            },
            create: {
                deliveryId: delivery.id,
                riderId: input.rider.id,
                ownerUserId: input.ownerUserId,
                customerWhatsappId,
                score: input.rating.score,
                comment: input.rating.comment,
                createdAt: input.deliveredAt,
            },
        });
    } else {
        await prisma.deliveryRating.deleteMany({
            where: { deliveryId: delivery.id },
        });
    }

    return { order, delivery };
}

async function seedGuaimbeDeliveryScenario(ownerUserId, riderRecords) {
    const now = new Date();
    const storeAddress = await seedGuaimbeStoreAddress(ownerUserId);
    const products = await seedGuaimbeDeliveryProducts(ownerUserId);
    const positionedRiderRecords = await seedGuaimbeRiderLocations(riderRecords);
    const riders = positionedRiderRecords.map(({ rider }) => rider);
    const waitingOrders = [];
    const completedDeliveries = [];

    for (let index = 0; index < 10; index += 1) {
        const result = await seedOrderWithDelivery({
            ownerUserId,
            products,
            index,
            destination: GUAIMBE_DESTINATIONS[index],
            status: DeliveryStatus.WAITING_RIDER,
            riderSearchStartedAt: addMinutes(now, -(index + 1)),
        });

        waitingOrders.push(result.order);
    }

    for (let index = 0; index < 10; index += 1) {
        const acceptedAt = addDays(addMinutes(now, -35 - index * 3), -(index + 2));
        const pickedUpAt = addMinutes(acceptedAt, 6 + (index % 4));
        const deliveredAt = addMinutes(acceptedAt, 18 + index * 3);
        const result = await seedOrderWithDelivery({
            ownerUserId,
            products,
            index,
            destination: GUAIMBE_DESTINATIONS[index + 10],
            status: DeliveryStatus.DELIVERED,
            rider: riders[index % riders.length],
            acceptedAt,
            pickedUpAt,
            deliveredAt,
            riderSearchStartedAt: addMinutes(acceptedAt, -8),
            rating: COMPLETED_DELIVERY_RATINGS[index],
        });

        completedDeliveries.push(result.delivery);
    }

    return {
        storeAddress,
        productIds: products.map((product) => product.id),
        waitingOrderIds: waitingOrders.map((order) => order.id),
        completedDeliveryIds: completedDeliveries.map(
            (delivery) => delivery.id,
        ),
        availableRiderIds: positionedRiderRecords.map(({ rider }) => rider.id),
    };
}

async function main() {
    console.log("Seeding SaaS users...");

    const { admin, freeCustomer, paidCustomer } = await seedUsers();

    await seedBot(freeCustomer.id, "1");
    await seedBot(paidCustomer.id, "2");
    await seedTenantCatalog(freeCustomer.id, "Luna", 3900);
    await seedTenantCatalog(paidCustomer.id, "Clara", 6900);
    await seedTransaction(paidCustomer.id);
    const riders = await seedRiders(paidCustomer.id);
    const marketplaceRiders = await seedMarketplaceRiders();
    const wmsInboundScenario = await seedWmsInboundScenario(paidCustomer.id);
    const deliveryScenario = await seedGuaimbeDeliveryScenario(paidCustomer.id, [
        ...riders,
        ...marketplaceRiders,
    ]);

    console.log("Admin:");
    console.log("  email: admin@coinrise.local");
    console.log("  password: admin123");
    console.log("Free customer:");
    console.log("  email: free@coinrise.local");
    console.log("  password: free123");
    console.log("Paid customer:");
    console.log("  email: pro@coinrise.local");
    console.log("  password: pro123");
    console.log("WMS inbound scenario:");
    console.log(`  warehouseId: ${wmsInboundScenario.warehouse.id}`);
    console.log(
        `  productIds: ${wmsInboundScenario.productIds.join(", ")}`,
    );
    console.log("  sample XML: inspirations/inbound/nfe-wms-test.xml");
    console.log("Store-owned riders:");
    riders.forEach(({ user, rider, password }) => {
        console.log(`  ${user.name}:`);
        console.log(`    email: ${user.email}`);
        console.log(`    password: ${password}`);
        console.log(`    userId: ${user.id}`);
        console.log(`    riderId: ${rider.id}`);
        console.log(`    ownerUserId: ${rider.ownerUserId}`);
    });
    console.log("Marketplace riders:");
    marketplaceRiders.forEach(({ user, rider, password }) => {
        console.log(`  ${user.name}:`);
        console.log(`    email: ${user.email}`);
        console.log(`    password: ${password}`);
        console.log(`    userId: ${user.id}`);
        console.log(`    riderId: ${rider.id}`);
        console.log(`    ownerUserId: ${rider.ownerUserId}`);
    });
    console.log("Guaimbe delivery scenario:");
    console.log(`  storeAddressId: ${deliveryScenario.storeAddress.id}`);
    console.log(
        `  products: ${deliveryScenario.productIds.length} cadastrados`,
    );
    console.log(
        `  waiting orders: ${deliveryScenario.waitingOrderIds.length}`,
    );
    console.log(
        `  completed deliveries with ratings: ${deliveryScenario.completedDeliveryIds.length}`,
    );
    console.log(
        `  available rider locations: ${deliveryScenario.availableRiderIds.length}`,
    );
    console.log("Seed completed:", {
        adminId: admin.id,
        freeCustomerId: freeCustomer.id,
        paidCustomerId: paidCustomer.id,
        riderIds: riders.map(({ rider }) => rider.id),
        marketplaceRiderIds: marketplaceRiders.map(({ rider }) => rider.id),
        guaimbeWaitingOrderIds: deliveryScenario.waitingOrderIds,
        guaimbeCompletedDeliveryIds: deliveryScenario.completedDeliveryIds,
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
