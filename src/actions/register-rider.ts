"use server";

import bcrypt from "bcryptjs";
import {
    Prisma,
    RiderAvailabilityStatus,
    RiderStatus,
    RiderVehicleType,
    UserAccessStatus,
    UserRole,
} from "@prisma/client";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhoneDigits } from "@/lib/phone";
import { z } from "zod";

export type RiderRegisterPrevState = {
    status: "idle" | "success" | "error";
    formError: string | null;
    fieldErrors: {
        name?: string;
        email?: string;
        phone?: string;
        documentNumber?: string;
        cnhNumber?: string;
        vehicleType?: string;
        vehiclePlate?: string;
        password?: string;
        confirmPassword?: string;
        acceptTerms?: string;
    };
    values: {
        name: string;
        email: string;
        phone: string;
        documentNumber: string;
        cnhNumber: string;
        vehicleType: RiderVehicleType;
        vehiclePlate: string;
        acceptTerms: boolean;
    };
};

const riderRegisterSchema = z
    .object({
        name: z
            .string()
            .trim()
            .min(3, "Informe seu nome completo.")
            .max(120, "Seu nome esta muito longo."),
        email: z
            .string()
            .trim()
            .min(1, "Informe o seu e-mail.")
            .email("Informe um e-mail valido."),
        phone: z
            .string()
            .transform((value) => normalizePhoneDigits(value))
            .refine(
                (value) => value.length === 10 || value.length === 11,
                "Informe um WhatsApp valido com DDD.",
            ),
        documentNumber: z
            .string()
            .transform((value) => value.replace(/\D/g, ""))
            .refine((value) => value.length === 11, "Informe um CPF valido."),
        cnhNumber: z
            .string()
            .transform((value) => value.replace(/\D/g, ""))
            .refine(
                (value) => value.length === 0 || value.length === 11,
                "Informe uma CNH valida com 11 digitos.",
            ),
        vehicleType: z.enum(RiderVehicleType),
        vehiclePlate: z
            .string()
            .trim()
            .toUpperCase()
            .transform((value) => value.replace(/[^A-Z0-9]/g, ""))
            .refine(
                (value) => value.length === 0 || value.length === 7,
                "Informe uma placa valida ou deixe em branco.",
            ),
        password: z
            .string()
            .min(8, "A senha deve ter pelo menos 8 caracteres.")
            .max(128, "A senha informada e muito longa.")
            .refine(
                (value) => /[A-Za-z]/.test(value) && /\d/.test(value),
                "A senha precisa ter pelo menos uma letra e um numero.",
            ),
        confirmPassword: z.string(),
        acceptTerms: z.boolean().refine(Boolean, {
            message: "Voce precisa aceitar os termos para continuar.",
        }),
    })
    .refine((data) => data.password === data.confirmPassword, {
        path: ["confirmPassword"],
        message: "As senhas nao coincidem.",
    });

function buildValues(
    input: Partial<RiderRegisterPrevState["values"]>,
): RiderRegisterPrevState["values"] {
    return {
        name: input.name ?? "",
        email: input.email ?? "",
        phone: input.phone ?? "",
        documentNumber: input.documentNumber ?? "",
        cnhNumber: input.cnhNumber ?? "",
        vehicleType: input.vehicleType ?? RiderVehicleType.MOTORCYCLE,
        vehiclePlate: input.vehiclePlate ?? "",
        acceptTerms: input.acceptTerms ?? false,
    };
}

export async function actionRegisterRider(
    _prevState: RiderRegisterPrevState | undefined,
    formData: FormData,
) {
    const rawValues = {
        name: String(formData.get("name") ?? "").trim(),
        email: String(formData.get("email") ?? "").trim(),
        phone: String(formData.get("phone") ?? "").trim(),
        documentNumber: String(formData.get("documentNumber") ?? "").trim(),
        cnhNumber: String(formData.get("cnhNumber") ?? "").trim(),
        vehicleType: String(formData.get("vehicleType") ?? ""),
        vehiclePlate: String(formData.get("vehiclePlate") ?? "").trim(),
        password: String(formData.get("password") ?? ""),
        confirmPassword: String(formData.get("confirmPassword") ?? ""),
        acceptTerms:
            String(formData.get("acceptTerms") ?? "").trim() === "1",
    };

    const parsed = riderRegisterSchema.safeParse(rawValues);

    if (!parsed.success) {
        const fieldErrors = parsed.error.flatten().fieldErrors;

        return {
            status: "error" as const,
            formError: "Revise os campos destacados para concluir seu cadastro.",
            fieldErrors: {
                name: fieldErrors.name?.[0],
                email: fieldErrors.email?.[0],
                phone: fieldErrors.phone?.[0],
                documentNumber: fieldErrors.documentNumber?.[0],
                cnhNumber: fieldErrors.cnhNumber?.[0],
                vehicleType: fieldErrors.vehicleType?.[0],
                vehiclePlate: fieldErrors.vehiclePlate?.[0],
                password: fieldErrors.password?.[0],
                confirmPassword: fieldErrors.confirmPassword?.[0],
                acceptTerms: fieldErrors.acceptTerms?.[0],
            },
            values: buildValues({
                name: rawValues.name,
                email: rawValues.email,
                phone: rawValues.phone,
                documentNumber: rawValues.documentNumber,
                cnhNumber: rawValues.cnhNumber,
                vehicleType: Object.values(RiderVehicleType).includes(
                    rawValues.vehicleType as RiderVehicleType,
                )
                    ? (rawValues.vehicleType as RiderVehicleType)
                    : RiderVehicleType.MOTORCYCLE,
                vehiclePlate: rawValues.vehiclePlate,
                acceptTerms: rawValues.acceptTerms,
            }),
        };
    }

    const data = parsed.data;
    const passwordHash = await bcrypt.hash(data.password, 12);

    try {
        await prisma.$transaction(async (tx) => {
            const duplicatedUser = await tx.user.findFirst({
                where: {
                    OR: [{ email: data.email }, { phone: data.phone }],
                },
                select: {
                    email: true,
                    phone: true,
                },
            });

            if (duplicatedUser?.email === data.email) {
                throw new Error("EMAIL_ALREADY_EXISTS");
            }

            if (duplicatedUser?.phone === data.phone) {
                throw new Error("PHONE_ALREADY_EXISTS");
            }

            const duplicatedRider = await tx.rider.findFirst({
                where: {
                    OR: [
                        { documentNumber: data.documentNumber },
                        ...(data.cnhNumber
                            ? [{ cnhNumber: data.cnhNumber }]
                            : []),
                    ],
                },
                select: {
                    documentNumber: true,
                    cnhNumber: true,
                },
            });

            if (duplicatedRider?.documentNumber === data.documentNumber) {
                throw new Error("DOCUMENT_ALREADY_EXISTS");
            }

            if (data.cnhNumber && duplicatedRider?.cnhNumber === data.cnhNumber) {
                throw new Error("CNH_ALREADY_EXISTS");
            }

            const user = await tx.user.create({
                data: {
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    password: passwordHash,
                    role: UserRole.CUSTOMER,
                    accessStatus: UserAccessStatus.ACTIVE,
                    termsAcceptedAt: new Date(),
                },
            });

            await tx.rider.create({
                data: {
                    userId: user.id,
                    displayName: data.name,
                    documentNumber: data.documentNumber,
                    cnhNumber: data.cnhNumber || null,
                    vehicleType: data.vehicleType,
                    vehiclePlate: data.vehiclePlate || null,
                    status: RiderStatus.PENDING_REVIEW,
                    availabilityStatus: RiderAvailabilityStatus.OFFLINE,
                    isStoreOwned: false,
                },
            });
        });
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "EMAIL_ALREADY_EXISTS") {
                return {
                    status: "error" as const,
                    formError: "Ja existe uma conta cadastrada com este e-mail.",
                    fieldErrors: {
                        email: "Use outro e-mail ou entre com sua conta.",
                    },
                    values: buildValues({ ...data, phone: rawValues.phone }),
                };
            }

            if (error.message === "PHONE_ALREADY_EXISTS") {
                return {
                    status: "error" as const,
                    formError:
                        "Ja existe uma conta cadastrada com este WhatsApp.",
                    fieldErrors: {
                        phone: "Use outro telefone ou entre com sua conta.",
                    },
                    values: buildValues({ ...data, phone: rawValues.phone }),
                };
            }

            if (error.message === "DOCUMENT_ALREADY_EXISTS") {
                return {
                    status: "error" as const,
                    formError: "Ja existe um entregador cadastrado com este CPF.",
                    fieldErrors: {
                        documentNumber: "Confira o CPF ou entre com sua conta.",
                    },
                    values: buildValues({ ...data, phone: rawValues.phone }),
                };
            }

            if (error.message === "CNH_ALREADY_EXISTS") {
                return {
                    status: "error" as const,
                    formError: "Ja existe um entregador cadastrado com esta CNH.",
                    fieldErrors: {
                        cnhNumber: "Confira a CNH ou entre com sua conta.",
                    },
                    values: buildValues({ ...data, phone: rawValues.phone }),
                };
            }
        }

        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return {
                status: "error" as const,
                formError:
                    "Ja existe um cadastro usando uma dessas informacoes.",
                fieldErrors: {},
                values: buildValues({ ...data, phone: rawValues.phone }),
            };
        }

        return {
            status: "error" as const,
            formError:
                "Nao foi possivel concluir seu cadastro agora. Tente novamente em instantes.",
            fieldErrors: {},
            values: buildValues({
                name: rawValues.name,
                email: rawValues.email,
                phone: rawValues.phone,
                documentNumber: rawValues.documentNumber,
                cnhNumber: rawValues.cnhNumber,
                vehicleType: data.vehicleType,
                vehiclePlate: rawValues.vehiclePlate,
                acceptTerms: rawValues.acceptTerms,
            }),
        };
    }

    await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
    });

    return {
        status: "success" as const,
        formError: null,
        fieldErrors: {},
        values: buildValues({ ...data, phone: rawValues.phone }),
    };
}
