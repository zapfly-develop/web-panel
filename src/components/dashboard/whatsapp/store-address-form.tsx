"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, MapPin } from "lucide-react";

const addressSchema = z.object({
    postalCode: z.string().min(8, "CEP inválido").max(9),
    street: z.string().min(3, "Rua é obrigatória"),
    number: z.string().min(1, "Número é obrigatório"),
    neighborhood: z.string().min(2, "Bairro é obrigatório"),
    complement: z.string().optional(),
    city: z.string().min(2, "Cidade é obrigatória"),
    state: z.string().length(2, "UF deve ter 2 caracteres"),
});

type AddressFormValues = z.infer<typeof addressSchema>;

interface StoreAddressFormProps {
    defaultValues?: Partial<AddressFormValues>;
    onSubmit: (values: AddressFormValues) => Promise<void>;
}

export default function StoreAddressForm({
    defaultValues,
    onSubmit,
}: StoreAddressFormProps) {
    const [isPending, startTransition] = useTransition();
    const [isFetchingCep, setIsFetchingCep] = useState(false);

    const form = useForm<AddressFormValues>({
        resolver: zodResolver(addressSchema),
        defaultValues: {
            postalCode: defaultValues?.postalCode || "",
            street: defaultValues?.street || "",
            number: defaultValues?.number || "",
            neighborhood: defaultValues?.neighborhood || "",
            complement: defaultValues?.complement || "",
            city: defaultValues?.city || "",
            state: defaultValues?.state || "",
        },
    });

    const handleFetchCep = async (cep: string) => {
        const cleanCep = cep.replace(/\D/g, "");
        if (cleanCep.length !== 8) return;

        setIsFetchingCep(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            const data = await response.json();

            if (data.erro) {
                toast.error("CEP não encontrado.");
                return;
            }

            form.setValue("street", data.logradouro);
            form.setValue("neighborhood", data.bairro);
            form.setValue("city", data.localidade);
            form.setValue("state", data.uf);

            // Focus on number field after CEP fetch
            const numberInput = document.getElementById("address-number");
            if (numberInput) numberInput.focus();

        } catch (error) {
            toast.error("Erro ao buscar CEP.");
        } finally {
            setIsFetchingCep(false);
        }
    };

    const onFormSubmit = (values: AddressFormValues) => {
        startTransition(async () => {
            try {
                await onSubmit(values);
                toast.success("Endereço salvo com sucesso!");
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Erro ao salvar endereço.");
            }
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>CEP</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            {...field}
                                            placeholder="00000-000"
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, "").slice(0, 8);
                                                field.onChange(value);
                                                if (value.length === 8) handleFetchCep(value);
                                            }}
                                            disabled={isPending}
                                        />
                                        {isFetchingCep && (
                                            <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-slate-400" />
                                        )}
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="number"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Número</FormLabel>
                                <FormControl>
                                    <Input id="address-number" {...field} placeholder="123" disabled={isPending} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="street"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Logradouro (Rua/Avenida)</FormLabel>
                            <FormControl>
                                <Input {...field} placeholder="Rua das Flores" disabled={isPending} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="neighborhood"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Bairro</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="Centro" disabled={isPending} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="complement"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Complemento (Opcional)</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="Apto 101, Próximo ao mercado" disabled={isPending} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Cidade</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="São Paulo" disabled={isPending} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>UF</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        placeholder="SP"
                                        maxLength={2}
                                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                        disabled={isPending}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                        </>
                    ) : (
                        <>
                            <MapPin className="mr-2 h-4 w-4" />
                            Salvar Endereço Estruturado
                        </>
                    )}
                </Button>
            </form>
        </Form>
    );
}
