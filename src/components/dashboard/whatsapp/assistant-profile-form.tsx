"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BusinessProfile } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BUSINESS_PROFILE_OPTIONS } from "@/app/dashboard/whatsapp/checkout-options";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type AssistantProfileFormProps = {
    defaultAssistantName: string;
    defaultBusinessProfile: BusinessProfile;
    action: (formData: FormData) => Promise<void>;
};

export default function AssistantProfileForm({
    defaultAssistantName,
    defaultBusinessProfile,
    action,
}: AssistantProfileFormProps) {
    const router = useRouter();
    const [assistantName, setAssistantName] = useState(defaultAssistantName);
    const [businessProfile, setBusinessProfile] = useState(
        defaultBusinessProfile,
    );
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage(null);

        startTransition(async () => {
            try {
                const formData = new FormData();
                formData.set("assistantName", assistantName);
                formData.set("businessProfile", businessProfile);
                await action(formData);
                router.refresh();
            } catch (error) {
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Nao foi possivel salvar o perfil do atendente.",
                );
            }
        });
    }

    const selectedProfile =
        BUSINESS_PROFILE_OPTIONS.find(
            (option) => option.value === businessProfile,
        ) ?? BUSINESS_PROFILE_OPTIONS[0];

    return (
        <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm"
        >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                <div className="space-y-1.5">
                    <Label htmlFor="assistantName" className="text-xs font-semibold uppercase text-slate-500">Nome do atendente</Label>
                    <Input
                        id="assistantName"
                        name="assistantName"
                        value={assistantName}
                        onChange={(event) =>
                            setAssistantName(event.target.value)
                        }
                        placeholder="Ex: Clara, Julia, Time da Loja"
                        disabled={isPending}
                        maxLength={80}
                        className="bg-white h-9"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="businessProfile" className="text-xs font-semibold uppercase text-slate-500">Perfil do negocio</Label>
                    <Select
                        value={businessProfile}
                        onValueChange={(value) =>
                            setBusinessProfile(value as BusinessProfile)
                        }
                        disabled={isPending}
                    >
                        <SelectTrigger
                            id="businessProfile"
                            className="w-full bg-white h-9"
                        >
                            <SelectValue placeholder="Selecione o perfil" />
                        </SelectTrigger>
                        <SelectContent>
                            {BUSINESS_PROFILE_OPTIONS.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Button type="submit" size="sm" disabled={isPending} className="w-full lg:w-auto h-9">
                    {isPending ? "Salvando..." : "Atualizar Perfil"}
                </Button>
            </div>

            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                <p>{selectedProfile.description}</p>
                <p>IA responderá como {assistantName || "Clara"}</p>
            </div>

            {errorMessage ? (
                <p className="mt-3 text-sm font-medium text-rose-600">
                    {errorMessage}
                </p>
            ) : null}
        </form>
    );
}
