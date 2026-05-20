import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        id: "zaply-rider",
        name: "Zaply Rider",
        short_name: "Zaply Rider",
        description: "App mobile do entregador Zaply.",
        start_url: "/delivery/rider",
        scope: "/delivery/",
        display: "standalone",
        background_color: "#020617",
        theme_color: "#0284c7",
        icons: [
            {
                src: "/logo-trim.png",
                sizes: "828x593",
                type: "image/png",
                purpose: "any",
            },
        ],
    };
}
