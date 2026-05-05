"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RiderVehicleType } from "@prisma/client";
import {
    Bike,
    Car,
    Check,
    CircleDot,
    IdCard,
    Loader2,
    Lock,
    Mail,
    Phone,
    UserRound,
} from "lucide-react";
import {
    actionRegisterRider,
    type RiderRegisterPrevState,
} from "@/actions/register-rider";
import { Button } from "@/components/ui/button";
import { CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPhoneMask } from "@/lib/phone";

const initialState: RiderRegisterPrevState = {
    status: "idle",
    formError: null,
    fieldErrors: {},
    values: {
        name: "",
        email: "",
        phone: "",
        documentNumber: "",
        cnhNumber: "",
        vehicleType: RiderVehicleType.MOTORCYCLE,
        vehiclePlate: "",
        acceptTerms: false,
    },
};

const vehicleOptions = [
    {
        value: RiderVehicleType.MOTORCYCLE,
        label: "Moto",
    },
    {
        value: RiderVehicleType.BICYCLE,
        label: "Bicicleta",
    },
    {
        value: RiderVehicleType.CAR,
        label: "Carro",
    },
    {
        value: RiderVehicleType.OTHER,
        label: "Outro",
    },
];

function formatCpfMask(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);

    return digits
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatCnhMask(value: string) {
    return value.replace(/\D/g, "").slice(0, 11);
}

function formatVehiclePlate(value: string) {
    return value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 7);
}

type TermsCheckboxProps = {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    error?: string;
};

function RiderTermsCheckbox({
    checked,
    onCheckedChange,
    error,
}: TermsCheckboxProps) {
    return (
        <div className="space-y-2">
            <label
                htmlFor="acceptTerms"
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-primary/30 hover:bg-white"
            >
                <input
                    id="acceptTerms"
                    name="acceptTerms"
                    type="checkbox"
                    value="1"
                    checked={checked}
                    onChange={(event) =>
                        onCheckedChange(event.currentTarget.checked)
                    }
                    className="sr-only"
                />
                <span
                    className={[
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                        checked
                            ? "border-primary bg-primary text-white"
                            : "border-slate-300 bg-white text-transparent",
                    ].join(" ")}
                    aria-hidden="true"
                >
                    <Check className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm leading-6 text-slate-600">
                    Li e aceito os{" "}
                    <Link
                        href="/termos"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                        termos de uso
                    </Link>{" "}
                    para solicitar meu acesso como entregador Floovi.
                </span>
            </label>
            {error ? (
                <p className="text-xs font-medium text-red-600">{error}</p>
            ) : null}
        </div>
    );
}

function FieldError({ message }: { message?: string }) {
    if (!message) {
        return null;
    }

    return <p className="text-xs font-medium text-red-600">{message}</p>;
}

export function RiderRegisterForm() {
    const router = useRouter();
    const [state, submitAction, isPending] = useActionState(
        actionRegisterRider,
        initialState,
    );
    const [phoneValue, setPhoneValue] = useState(
        formatPhoneMask(initialState.values.phone),
    );
    const [documentValue, setDocumentValue] = useState(
        formatCpfMask(initialState.values.documentNumber),
    );
    const [cnhValue, setCnhValue] = useState(
        formatCnhMask(initialState.values.cnhNumber),
    );
    const [plateValue, setPlateValue] = useState(
        formatVehiclePlate(initialState.values.vehiclePlate),
    );
    const [acceptTerms, setAcceptTerms] = useState(
        initialState.values.acceptTerms,
    );

    useEffect(() => {
        if (state.status === "success") {
            router.push("/delivery/rider");
        }
    }, [router, state.status]);

    useEffect(() => {
        setPhoneValue(formatPhoneMask(state.values.phone));
        setDocumentValue(formatCpfMask(state.values.documentNumber));
        setCnhValue(formatCnhMask(state.values.cnhNumber));
        setPlateValue(formatVehiclePlate(state.values.vehiclePlate));
        setAcceptTerms(state.values.acceptTerms);
    }, [
        state.values.acceptTerms,
        state.values.cnhNumber,
        state.values.documentNumber,
        state.values.phone,
        state.values.vehiclePlate,
    ]);

    return (
        <form action={submitAction}>
            <CardContent className="space-y-4">
                {state.formError ? (
                    <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-xs font-medium text-red-600 animate-in fade-in zoom-in duration-200">
                        <div className="h-1 w-1 rounded-full bg-red-600" />
                        {state.formError}
                    </div>
                ) : null}

                <div className="space-y-2">
                    <Label htmlFor="name">Nome completo</Label>
                    <div className="relative">
                        <UserRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                            id="name"
                            name="name"
                            placeholder="Seu nome"
                            defaultValue={state.values.name}
                            className="border-slate-200 bg-slate-50/50 pl-10 transition-colors focus:bg-white"
                            aria-invalid={Boolean(state.fieldErrors.name)}
                            autoComplete="name"
                            required
                        />
                    </div>
                    <FieldError message={state.fieldErrors.name} />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                placeholder="voce@exemplo.com"
                                defaultValue={state.values.email}
                                className="border-slate-200 bg-slate-50/50 pl-10 transition-colors focus:bg-white"
                                aria-invalid={Boolean(state.fieldErrors.email)}
                                autoComplete="email"
                                required
                            />
                        </div>
                        <FieldError message={state.fieldErrors.email} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">WhatsApp</Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                id="phone"
                                type="tel"
                                name="phone"
                                placeholder="(14) 99999-9999"
                                value={phoneValue}
                                onChange={(event) =>
                                    setPhoneValue(
                                        formatPhoneMask(event.target.value),
                                    )
                                }
                                className="border-slate-200 bg-slate-50/50 pl-10 transition-colors focus:bg-white"
                                aria-invalid={Boolean(state.fieldErrors.phone)}
                                autoComplete="tel"
                                inputMode="tel"
                                required
                            />
                        </div>
                        <FieldError message={state.fieldErrors.phone} />
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="documentNumber">CPF</Label>
                        <div className="relative">
                            <IdCard className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                id="documentNumber"
                                name="documentNumber"
                                placeholder="000.000.000-00"
                                value={documentValue}
                                onChange={(event) =>
                                    setDocumentValue(
                                        formatCpfMask(event.target.value),
                                    )
                                }
                                className="border-slate-200 bg-slate-50/50 pl-10 transition-colors focus:bg-white"
                                aria-invalid={Boolean(
                                    state.fieldErrors.documentNumber,
                                )}
                                inputMode="numeric"
                                required
                            />
                        </div>
                        <FieldError message={state.fieldErrors.documentNumber} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="cnhNumber">CNH</Label>
                        <div className="relative">
                            <IdCard className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                id="cnhNumber"
                                name="cnhNumber"
                                placeholder="Opcional para bicicleta"
                                value={cnhValue}
                                onChange={(event) =>
                                    setCnhValue(
                                        formatCnhMask(event.target.value),
                                    )
                                }
                                className="border-slate-200 bg-slate-50/50 pl-10 transition-colors focus:bg-white"
                                aria-invalid={Boolean(state.fieldErrors.cnhNumber)}
                                inputMode="numeric"
                            />
                        </div>
                        <FieldError message={state.fieldErrors.cnhNumber} />
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="vehicleType">Veículo principal</Label>
                        <div className="relative">
                            <Bike className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <select
                                id="vehicleType"
                                name="vehicleType"
                                defaultValue={state.values.vehicleType}
                                className="flex h-9 w-full rounded-md border border-slate-200 bg-slate-50/50 px-3 py-1 pl-10 text-sm shadow-xs transition-colors outline-none focus:border-ring focus:bg-white focus:ring-[3px] focus:ring-ring/50"
                                aria-invalid={Boolean(
                                    state.fieldErrors.vehicleType,
                                )}
                            >
                                {vehicleOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <FieldError message={state.fieldErrors.vehicleType} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="vehiclePlate">Placa</Label>
                        <div className="relative">
                            <Car className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                id="vehiclePlate"
                                name="vehiclePlate"
                                placeholder="ABC1D23"
                                value={plateValue}
                                onChange={(event) =>
                                    setPlateValue(
                                        formatVehiclePlate(event.target.value),
                                    )
                                }
                                className="border-slate-200 bg-slate-50/50 pl-10 transition-colors focus:bg-white"
                                aria-invalid={Boolean(
                                    state.fieldErrors.vehiclePlate,
                                )}
                            />
                        </div>
                        <FieldError message={state.fieldErrors.vehiclePlate} />
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="password">Senha</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                id="password"
                                type="password"
                                name="password"
                                placeholder="Crie uma senha forte"
                                className="border-slate-200 bg-slate-50/50 pl-10 transition-colors focus:bg-white"
                                aria-invalid={Boolean(state.fieldErrors.password)}
                                autoComplete="new-password"
                                required
                            />
                        </div>
                        <p className="flex items-center gap-1.5 text-xs text-slate-500">
                            <CircleDot className="h-3 w-3 text-emerald-500" />
                            Pelo menos 8 caracteres com letra e numero.
                        </p>
                        <FieldError message={state.fieldErrors.password} />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirmar senha</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                id="confirmPassword"
                                type="password"
                                name="confirmPassword"
                                placeholder="Repita sua senha"
                                className="border-slate-200 bg-slate-50/50 pl-10 transition-colors focus:bg-white"
                                aria-invalid={Boolean(
                                    state.fieldErrors.confirmPassword,
                                )}
                                autoComplete="new-password"
                                required
                            />
                        </div>
                        <FieldError message={state.fieldErrors.confirmPassword} />
                    </div>
                </div>

                <RiderTermsCheckbox
                    checked={acceptTerms}
                    onCheckedChange={setAcceptTerms}
                    error={state.fieldErrors.acceptTerms}
                />
            </CardContent>

            <CardFooter className="mt-4 flex flex-col gap-3">
                <Button
                    type="submit"
                    disabled={isPending}
                    className="h-11 w-full bg-primary font-bold uppercase tracking-widest shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
                >
                    {isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enviando cadastro...
                        </>
                    ) : (
                        "Criar acesso de entregador"
                    )}
                </Button>

                <p className="text-center text-sm text-slate-500">
                    Ja tem uma conta?{" "}
                    <Link
                        href="/login"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                        Entrar no app
                    </Link>
                </p>
            </CardFooter>
        </form>
    );
}
