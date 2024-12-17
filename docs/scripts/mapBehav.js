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

        this._getDims(x, y, resTile).then((dims) => {
            if (dims)
                tileCanvas.getContext("2d").drawImage(this.options.img, ...dims);
            else
                console.warn(`Generating outside bounds: ${x}_${y}`);
            done(null, tileCanvas);
        }).catch((error) => {
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
const svgIcon = L.DivIcon.extend({
    options: {
        markHTML: "icons/position-marker.svg",
        markScale: 0.5,
        markColor: "blue",

        tokenUrl: "icons/bank.svg",
        tokenScale: 1,
        tokenColor: "red"
    },
    createIcon: function () {
        const markSVG = this.options.markHTML;
        const markProps = markSVG.querySelector("g");
        markSVG.querySelector("path")?.setAttribute("fill", this.options.markColor);
        markProps?.setAttribute("transform", `translate(-50%, -50%) scale(${this.options.markScale})`);
        markProps?.style.top = '50%';
        markProps?.style.left = '50%';

        this.constructor.loadSVG(this.options.tokenUrl).then((imgSVG) => {
            imgSVG.querySelector("path")?.setAttribute("fill", this.options.tokenColor);

            const tokenProps = imgSVG.documentElement.querySelector("g");
            tokenProps?.setAttribute("transform", `translate(-50%, -50%) scale(${this.options.markScale * this.options.tokenScale})`);
            tokenProps?.style.position = 'absolute';
            tokenProps?.style.top = '50%';
            tokenProps?.style.left = '50%';
            markSVG.appendChild(tokenProps);
        });

        return markSVG;
    },
    getIconToken: function () {

    },
    getMarkColor: function () {

    },
    getIconColor: function () {

    },
    statics: {
        async loadSVG(url) {
            const response = await fetch(url);
            const svgText = await response.text();
            const parser = new DOMParser();
            return parser.parseFromString(svgText, "image/svg+xml");
        }
    }
});
class MapHandeler {
    #delLayerPop = new PopDiv("delLayer");
    #map = null;
    #activeLayer = null;
    constructor(isHost) {
        //Div
        const container = document.createElement("div");
        container.id = "mapRender";
        document.querySelector("main").appendChild(container);

        //Map
        this.#map = L.map(container, {
            crs: L.CRS.Simple,
            zoomSnap: 0.5,
            zoomDelta: 0.5,
            attributionControl: false,
            maxBoundsViscosity: 1.0,
            noWrap: true,
        }).setView([0, 0], 0);

        //Del Button
        if (isHost) {
            const clearButton = L.control({ position: "topright" });
            clearButton.onAdd = () => {
                var button = L.DomUtil.create("button", "customControl");
                button.innerHTML = "Clear Map";
                button.onclick = () => this.#delLayerPop.show();
                return button;
            };
            clearButton.addTo(this.#map);
        }

        //Marker Creation
        let markSVG = null;
        svgIcon.loadSVG("icons/position-marker.svg").then((imgSVG) => {
            markSVG = imgSVG.documentElement;
        });
        this.#map.on("click", (e) => {
            const { lat, lng } = e.latlng;

            L.marker([lat, lng], { icon: new svgIcon({ markHTML: markSVG.cloneNode(true) }) }).addTo(this.#map);
        });

        //Post-Creation
        this.#map.getContainer().classList.add("hide");
    }

    loadLayer(img, { lvl, res }) {
        const bounds = [[0, 0], [-img.height / Math.pow(2, lvl), img.width / Math.pow(2, lvl)]];
        this.#map.setMaxBounds(bounds);
        this.#map.fitBounds(bounds);

        this.#activeLayer = new CanvasLayer({
            tileSize: res,
            maxNativeZoom: lvl,
            minZoom: this.#map.getBoundsZoom(bounds),
            bounds,
            img
        }).addTo(this.#map);

        this.#map.getContainer().classList.remove("hide");
    }

    async deleteLayer() {
        this.#activeLayer.remove();
        await mapDB.delData("mapData");
        p2p.sendData({ type: "del" })

        this.#map.getContainer().classList.add("hide");
        this.closePopup();
    }

    closePopup() {
        this.#delLayerPop.hide();
    }
}



/*>--------------- { ImageHandeler } ---------------<*/
function loadImg(inputSrc, options = { lvl: 4, res: 128 }) {
    const img = new Image();
    img.onload = () => mapHdl.loadLayer(img, options);
    img.onerror = (event) => { throw new Error(event.target.error) };
    img.src = inputSrc;
}