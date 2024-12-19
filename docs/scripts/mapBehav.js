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
        markUrl: "icons/position-marker.svg",
        markColor: "blue",

        tokenUrl: "icons/bank.svg",
        tokenColor: "red"
    },
    createIcon: function () {
        const mark = this._loadSVG(this.options.markUrl).then((markSVG) => {
            markSVG = markSVG.documentElement;
            markSVG.querySelector("path")?.setAttribute("fill", this.options.markColor);

            markSVG.style.transform = `scale(0.2) translate(-50%, -50%)`;
            return markSVG;
        });

        const token = this._loadSVG(this.options.tokenUrl).then((tokenSVG) => {
            tokenSVG = tokenSVG.documentElement;
            tokenSVG.querySelector("path")?.setAttribute("fill", this.options.tokenColor);

            tokenSVG = tokenSVG.querySelector("g");
            tokenSVG.style.transformOrigin = "center";
            tokenSVG.style.transform = `scale(0.38) translate(0%, -50%)`;
            return tokenSVG;
        });

        return Promise.all([mark, token]).then(([markSVG, tokenSVG]) => {
            markSVG.appendChild(tokenSVG);
            return markSVG;
        });
    },
    getIconToken: function () {

    },
    getMarkColor: function () {

    },
    getIconColor: function () {

    },
    _loadSVG: async function (url) {
        const response = await fetch(url);
        const svgText = await response.text();
        const parser = new DOMParser();
        return parser.parseFromString(svgText, "image/svg+xml");
    }
});
class MapHandeler {
    #delLayerPop = new PopDiv("delLayer");
    #map = null;
    #activeLayer = null;
    constructor(isHost) {
        //Div
        const mapDiv = document.createElement("div");
        mapDiv.id = "mapRender";
        document.querySelector("main").appendChild(mapDiv);

        //Map
        this.#map = L.map(mapDiv, {
            crs: L.CRS.Simple,
            zoomSnap: 0.5,
            zoomDelta: 0.5,
            attributionControl: false,
            maxBoundsViscosity: 1.0,
            noWrap: true,
            zoomControl: false
        }).setView([0, 0], 0);

        //Zoom
        L.control.zoom({
            position: 'topright'
        }).addTo(this.#map);

        //Index
        const indexDiv = document.createElement("div");
        indexDiv.id = "indexEditor";
        indexDiv.classList.add("hide");
        mapDiv.appendChild(indexDiv);

        const indexBtn = L.control({ position: "topleft" });
        indexBtn.onAdd = () => {
            var button = L.DomUtil.create("button", "indexBtn");
            button.innerHTML =
                `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style="width: 24px; height: 24px;">
	                <path d="M96 96 H32 V160 H96 V96 Z M96 224 H32 V288 H96 V224 Z M96 352 H32 V416 H96 V352 Z M480 96 H160 V160 H480 V96 Z M480 224 H160 V288 H480 V224 Z M160 352 H480 V416 H160 V352 Z" fill="#000"/>
                </svg>`;
            button.onclick = () => indexDiv.classList.contains("hide") ? indexDiv.classList.remove("hide") : indexDiv.classList.add("hide");
            return button;
        };
        indexBtn.addTo(this.#map);

        //Del Button
        if (isHost) {
            const clearBtn = L.control({ position: "bottomright" });
            clearBtn.onAdd = () => {
                var button = L.DomUtil.create("button", "clearBtn");
                button.innerHTML = "Clear Map";
                button.onclick = () => this.#delLayerPop.show();
                return button;
            };
            clearBtn.addTo(this.#map);
        }

        //Marker Creation
        this.#map.on("click", (e) => {
            const { lat, lng } = e.latlng;

            L.marker([lat, lng], { icon: new svgIcon() }).addTo(this.#map);
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