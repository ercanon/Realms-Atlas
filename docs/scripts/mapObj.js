class MapHandeler {
    static #map = null;
    constructor() {
        MapHandeler.#map = L.map(document.body.querySelector("main"), {
            crs: L.CRS.Simple,
            zoomSnap: 0.5,
            zoomDelta: 0.5,
            attributionControl: false,
            maxBoundsViscosity: 1.0,
            noWrap: true,
            zoomControl: false
        }).setView([0, 0], 0);
    }
}