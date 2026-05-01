export type GoogleMapsLatLngLiteral = google.maps.LatLngLiteral;
export type GoogleMapsMap = google.maps.Map;
export type GoogleMapsLatLngBounds = google.maps.LatLngBounds;
export type GoogleMapsMarker = google.maps.Marker;

export type GoogleMapsGlobal = {
    maps: {
        Map: typeof google.maps.Map;
        Marker: typeof google.maps.Marker;
        LatLngBounds: typeof google.maps.LatLngBounds;
        Point: typeof google.maps.Point;
        Size: typeof google.maps.Size;
    };
};

type GoogleMapsWindow = Window &
    typeof globalThis & {
        google?: GoogleMapsGlobal;
        __zaplyGoogleMapsLoaded?: () => void;
    };

const GOOGLE_MAPS_SCRIPT_ID = "zaply-google-maps-script";
const GOOGLE_MAPS_CALLBACK = "__zaplyGoogleMapsLoaded";

let pendingGoogleMaps: Promise<GoogleMapsGlobal> | null = null;

export function loadGoogleMaps(apiKey: string): Promise<GoogleMapsGlobal> {
    const browserWindow = window as GoogleMapsWindow;

    if (browserWindow.google?.maps?.Map) {
        return Promise.resolve(browserWindow.google);
    }

    if (pendingGoogleMaps) {
        return pendingGoogleMaps;
    }

    pendingGoogleMaps = new Promise((resolve, reject) => {
        browserWindow[GOOGLE_MAPS_CALLBACK] = () => {
            if (browserWindow.google?.maps?.Map) {
                resolve(browserWindow.google);
            } else {
                reject(new Error("Google Maps nao foi carregado."));
            }

            delete browserWindow[GOOGLE_MAPS_CALLBACK];
        };

        const existingScript = document.getElementById(
            GOOGLE_MAPS_SCRIPT_ID,
        ) as HTMLScriptElement | null;

        if (existingScript) {
            existingScript.addEventListener(
                "load",
                () => {
                    if (browserWindow.google?.maps?.Map) {
                        resolve(browserWindow.google);
                    }
                },
                { once: true },
            );
            existingScript.addEventListener(
                "error",
                () => reject(new Error("Falha ao carregar Google Maps.")),
                { once: true },
            );
            return;
        }

        const script = document.createElement("script");
        script.id = GOOGLE_MAPS_SCRIPT_ID;
        script.async = true;
        script.defer = true;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
            apiKey,
        )}&v=weekly&callback=${GOOGLE_MAPS_CALLBACK}`;
        script.onerror = () => {
            pendingGoogleMaps = null;
            delete browserWindow[GOOGLE_MAPS_CALLBACK];
            reject(new Error("Falha ao carregar Google Maps."));
        };

        document.head.appendChild(script);
    });

    return pendingGoogleMaps;
}
