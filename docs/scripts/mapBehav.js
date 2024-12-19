/*>--------------- { MapHandeler } ---------------<*/
const CanvasLayer = L.GridLayer.extend({
    options: {
        // The maximum zoom level up to which this layer will be displayed (inclusive).
        maxZoom: 8,

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
    #sidebar = null;
    #activeLayer = null;
    constructor(isHost) {
        const docuMain = document.querySelector("main");

        /*>---------- [ Map Construct ] ----------<*/
        const mapDiv = document.createElement("div");
        mapDiv.id = "mapRender";
        docuMain.appendChild(mapDiv);

        this.#map = L.map(mapDiv, {
            crs: L.CRS.Simple,
            zoomSnap: 0.5,
            zoomDelta: 0.5,
            attributionControl: false,
            maxBoundsViscosity: 1.0,
            noWrap: true,
            zoomControl: false
        }).setView([0, 0], 0);

        /*>---------- [ Zoom Construct ] ----------<*/
        L.control.zoom({
            position: "topright"
        }).addTo(this.#map);

        /*>---------- [ ClearBtn Construct ] ----------<*/
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

        /*>---------- [ Search Construct ] ----------<*/
        L.control.search({
            position: "topleft",
            autoCollapse: true
        }).addTo(this.#map);

        /*>---------- [ Sidebar Construct ] ----------<*/
        const sidebarDiv = document.createElement("div");
        sidebarDiv.id = "sidebar";
        sidebarDiv.className = "leaflet-sidebar collapsed";

        this.#sidebar = L.control.sidebar({
            position: "left",
            container: "sidebar",
            autopan: true
        }).addTo(this.#map);

        //Info Panel
        const infoDiv = document.createElement("div");
        this.#sidebar.addPanel({
            id: "markdown-panel",
            tab: `<svg style="vertical-align: middle; width: 2rem; height: 2rem;" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
	                <path d="M8 7.333V10.667M14 8C14 11.98 11.98 14 8 14C4.02 14 2 11.98 2 8C2 4.02 4.02 2 8 2C11.98 2 14 4.02 14 8Z" stroke="#000000" stroke-width="1.333" stroke-linecap="round" stroke-linejoin="round"/>
	                <circle cx="8" cy="5" r="0.667" fill="#000000"/>
                  </svg>`,
            title: "Map Info",
            pane: infoDiv,
        });

        if (isHost) {
            const editor = document.createElement("textarea");
            editor.id = "markdown-editor";
            editor.placeholder = "Write in Markdown(.md)...";
            infoDiv.appendChild(editor);

            editor.addEventListener("change", () => preview.innerHTML = marked.parse(editor.value.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, "")));
        }
        const preview = document.createElement("div");
        preview.id = "markdown-preview";
        infoDiv.appendChild(preview);

        //Index Panel
        this.#sidebar.addPanel({
            id: 'markIndex',
            tab: `<svg style="vertical-align: middle; width: 2rem; height: 2rem;" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
	                <path d="M 3 3 L 1 3 L 1 5 L 3 5 L 3 3 Z M 3 7 L 1 7 L 1 9 L 3 9 L 3 7 Z M 1 11 L 3 11 L 3 13 L 1 13 L 1 11 Z M 15 3 L 5 3 L 5 5 L 15 5 L 15 3 Z M 15 7 L 5 7 L 5 9 L 15 9 L 15 7 Z M 5 11 L 15 11 L 15 13 L 5 13 L 5 11 Z" fill="#000000"/>
                  </svg>`,
            title: "Markers Index",
            button: 'https://github.com/noerw/leaflet-sidebar-v2',
        });   

        /*>---------- [ Marker Construct ] ----------<*/
        this.#map.on("click", (e) => {
            const { lat, lng } = e.latlng;

            L.marker([lat, lng], { icon: new svgIcon() }).addTo(this.#map);
        });

        /*>---------- [ Post-Construct ] ----------<*/
        this.#map.getContainer().classList.add("hide");
    }

    /*>---------- [ Map Layer ] ----------<*/
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

    /*>---------- [ Sidebar ] ----------<*/
}



/*>--------------- { ImageHandeler } ---------------<*/
function loadImg(inputSrc, options = { lvl: 4, res: 256 }) {
    const img = new Image();
    img.onload = () => mapHdl.loadLayer(img, options);
    img.onerror = (event) => { throw new Error(event.target.error) };
    img.src = inputSrc;
}