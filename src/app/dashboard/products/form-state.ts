import { ProductType } from "@prisma/client";

export type ProductFormValues = {
    title: string;
    description: string;
    imageUrl: string;
    category: string;
    tags: string[];
    sku: string;
    price: string;
    promotionalPrice: string;
    stockQuantity: string;
    reservedStockQuantity: string;
    productType: ProductType;
    subscriberDays: string;
    syncToChannels: boolean;
};

export type ProductFormState = {
    status: "idle" | "success" | "error";
    formError: string | null;
    savedProduct?: {
        id: string;
        title: string;
        sku: string | null;
        stockQuantity: number | null;
    };
    fieldErrors: {
        title?: string;
        description?: string;
        imageUrl?: string;
        category?: string;
        tags?: string;
        sku?: string;
        price?: string;
        promotionalPrice?: string;
        stockQuantity?: string;
        productType?: string;
        subscriberDays?: string;
        syncToChannels?: string;
    };
    values: ProductFormValues;
};

export const initialProductFormValues: ProductFormValues = {
    title: "",
    description: "",
    imageUrl: "",
    category: "",
    tags: [],
    sku: "",
    price: "",
    promotionalPrice: "",
    stockQuantity: "",
    reservedStockQuantity: "0",
    productType: ProductType.ONE_TIME,
    subscriberDays: "",
    syncToChannels: false,
};

export const initialProductFormState: ProductFormState = {
    status: "idle",
    formError: null,
    fieldErrors: {},
    values: initialProductFormValues,
};

export type CreateProductFormState = ProductFormState;
export const initialCreateProductFormState = initialProductFormState;
