export type GoogleMapsLatLngLiteral = {
    lat: number;
    lng: number;
};

export type GoogleMapsMap = {
    fitBounds: (
        bounds: GoogleMapsLatLngBounds,
        padding?: number | GoogleMapsPadding,
    ) => void;
    setCenter: (position: GoogleMapsLatLngLiteral) => void;
    setZoom: (zoom: number) => void;
};

export type GoogleMapsLatLngBounds = {
    extend: (position: GoogleMapsLatLngLiteral) => void;
};

export type GoogleMapsMarker = {
    setMap: (map: GoogleMapsMap | null) => void;
    setPosition: (position: GoogleMapsLatLngLiteral) => void;
    setTitle: (title: string) => void;
    setIcon: (icon: GoogleMapsMarkerIcon) => void;
};

export type GoogleMapsGlobal = {
    maps: {
        Map: new (
            element: HTMLElement,
            options: GoogleMapsMapOptions,
        ) => GoogleMapsMap;
        Marker: new (options: GoogleMapsMarkerOptions) => GoogleMapsMarker;
        LatLngBounds: new () => GoogleMapsLatLngBounds;
        Point: new (x: number, y: number) => unknown;
        Size: new (width: number, height: number) => unknown;
    };
};

type GoogleMapsWindow = Window &
    typeof globalThis & {
        google?: GoogleMapsGlobal;
        __zaplyGoogleMapsLoaded?: () => void;
    };

type GoogleMapsMapOptions = {
    center: GoogleMapsLatLngLiteral;
    zoom: number;
    disableDefaultUI?: boolean;
    clickableIcons?: boolean;
    fullscreenControl?: boolean;
    gestureHandling?: string;
    mapTypeControl?: boolean;
    streetViewControl?: boolean;
    zoomControl?: boolean;
};

type GoogleMapsMarkerIcon = {
    url: string;
    scaledSize?: unknown;
    anchor?: unknown;
};

type GoogleMapsMarkerOptions = {
    map: GoogleMapsMap;
    position: GoogleMapsLatLngLiteral;
    title: string;
    icon: GoogleMapsMarkerIcon;
    zIndex?: number;
};

type GoogleMapsPadding = {
    top: number;
    right: number;
    bottom: number;
    left: number;
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
