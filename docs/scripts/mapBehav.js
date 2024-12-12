/*>--------------- { MapHandeler } ---------------<*/
const CanvasLayer = L.GridLayer.extend({
    options: {
        // The maximum zoom level up to which this layer will be displayed (inclusive).
        maxZoom: 10,

        //Image to be tiled and rendered in the map
        img: null
    },
    createTile: function (coords, done) {
        const { x, y, z } = coords;
        const resTile = this.options.tileSize * Math.pow(2, this.options.maxNativeZoom - z);

        const tileCanvas = L.DomUtil.create("canvas", "leaflet-tile");
        tileCanvas.width = tileCanvas.height = resTile;

        this._getDims(x, y, resTile).then(dims => {
            if (dims)
                tileCanvas.getContext("2d").drawImage(this.options.img, ...dims);
            else
                console.warn(`Generating outside bounds: ${x}_${y}`);
            done(null, tileCanvas);
        }).catch(error => {
            showError("Error generating tiles.", error);
            done(error, null);
        });
        return tileCanvas;
    },
    _getDims: async function (x, y, resTile) {
        const img = this.options.img;

        const tileX = x * resTile;
        const tileY = y * resTile;

        if (tileX >= img.width || tileY >= img.height || tileX < 0 || tileY < 0)
            return null;

        return [tileX, tileY, resTile, resTile, 0, 0, resTile, resTile];
    }
});
class MapHandeler {
    #delLayerPop = new PopDiv("delLayer");
    #mapRend = null;
    #activeLayer = null;
    constructor(mapRend) {
        this.#mapRend = mapRend;

        this.map = L.map(mapRend, {
            crs: L.CRS.Simple,
            zoomSnap: 0.5,
            zoomDelta: 0.5,
            attributionControl: false,
            maxBoundsViscosity: 1.0,
            noWrap: true,
        }).setView([0, 0], 0);

        //Del Button
        const clearButton = L.control({ position: "topright" });
        clearButton.onAdd = () => {
            var button = L.DomUtil.create("button", "customControl");
            button.innerHTML = "Clear Map";
            button.onclick = () => {
                this.#delLayerPop.show();
            };
            return button;
        };
        clearButton.addTo(this.map);

        mapRend.classList.add("hide");
    }

    loadLayer(img, zoomSettings) {
        const bound = [[0, 0], [-img.height / Math.pow(2, zoomSettings.lvl), img.width / Math.pow(2, zoomSettings.lvl)]];
        this.map.setMaxBounds(bound);
        this.map.fitBounds(bound);

        this.#activeLayer = new CanvasLayer({
            tileSize: zoomSettings.res,
            maxNativeZoom: zoomSettings.lvl,
            minZoom: this.map.getBoundsZoom(bound),
            bounds: bound,
            img: img
        }).addTo(this.map);

        this.#mapRend.classList.remove("hide");
    }

    async deleteLayer() {
        this.#activeLayer.remove();
        await window.mapDB.delData("mapData");

        this.#mapRend.classList.add("hide");
        this.closePopup();
    }

    closePopup() {
        this.#delLayerPop.hide();
    }
}



/*>--------------- { ImageHandeler } ---------------<*/
function loadImg(inputSrc) {
    try {
        const img = new Image();
        img.onload  = () => window.mapHandeler.loadLayer(img, { lvl: 4, res: 128 });
        img.onerror = (event) => { throw new Error (event.target.error)};
        img.src = inputSrc;
    }
    catch (error) {
        showError("Error loading the image.", error);
    }
}