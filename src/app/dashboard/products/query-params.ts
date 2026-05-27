import { Prisma } from "@prisma/client";

export type ProductSortField =
    | "createdAt"
    | "title"
    | "sku"
    | "category"
    | "price"
    | "stock"
    | "status";

export type SortDirection = "asc" | "desc";

export type ProductTabFilter = "all" | "active" | "inactive";

export const DEFAULT_PRODUCT_SORT_FIELD: ProductSortField = "createdAt";
export const DEFAULT_PRODUCT_SORT_DIRECTION: SortDirection = "desc";
export const DEFAULT_PRODUCT_TAB: ProductTabFilter = "all";

export function parseProductSortField(value?: string): ProductSortField {
    switch (value) {
        case "title":
        case "sku":
        case "category":
        case "price":
        case "stock":
        case "status":
        case "createdAt":
            return value;
        default:
            return DEFAULT_PRODUCT_SORT_FIELD;
    }
}

export function parseSortDirection(value?: string): SortDirection {
    return value === "asc" ? "asc" : "desc";
}

export function parseProductTab(value?: string): ProductTabFilter {
    if (value === "active" || value === "inactive") return value;
    return DEFAULT_PRODUCT_TAB;
}

export function buildProductsOrderBy(
    sortField: ProductSortField,
    sortDirection: SortDirection,
): Prisma.ProductOrderByWithRelationInput[] {
    switch (sortField) {
        case "title":
            return [{ title: sortDirection }, { createdAt: "desc" }];
        case "sku":
            return [{ sku: sortDirection }, { title: "asc" }];
        case "category":
            return [{ category: sortDirection }, { title: "asc" }];
        case "price":
            return [{ priceCents: sortDirection }, { title: "asc" }];
        case "stock":
            return [{ stockQuantity: sortDirection }, { title: "asc" }];
        case "status":
            return [{ isActive: sortDirection }, { title: "asc" }];
        case "createdAt":
        default:
            return [{ createdAt: sortDirection }, { title: "asc" }];
    }
}

export function buildProductsPageHref(input: {
    page?: number;
    query?: string;
    sortField?: ProductSortField;
    sortDirection?: SortDirection;
    tab?: ProductTabFilter;
}): string {
    const params = new URLSearchParams();

    if (input.page && input.page > 1) {
        params.set("page", String(input.page));
    }

    if (input.query?.trim()) {
        params.set("q", input.query.trim());
    }

    if (input.sortField && input.sortField !== DEFAULT_PRODUCT_SORT_FIELD) {
        params.set("sort", input.sortField);
    }

    if (
        input.sortDirection &&
        input.sortDirection !== DEFAULT_PRODUCT_SORT_DIRECTION
    ) {
        params.set("dir", input.sortDirection);
    }

    if (input.tab && input.tab !== DEFAULT_PRODUCT_TAB) {
        params.set("tab", input.tab);
    }

    const queryString = params.toString();
    return queryString
        ? `/dashboard/products?${queryString}`
        : "/dashboard/products";
}
