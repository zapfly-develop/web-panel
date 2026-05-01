import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        id: "zaply-rider",
        name: "Zaply Rider",
        short_name: "Zaply Rider",
        description: "App mobile do entregador Zaply.",
        start_url: "/delivery/rider",
        scope: "/",
        display: "standalone",
        background_color: "#f8fafc",
        theme_color: "#0284c7",
        icons: [
            {
                src: "/globe.svg",
                sizes: "any",
                type: "image/svg+xml",
                purpose: "any",
            },
        ],
    };
}
