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
    constructor() {
        /*>---------- [ Map Construct ] ----------<*/
        const mapDiv = document.createElement("div");
        document.querySelector("main").appendChild(mapDiv);

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
        const leftSide = document.createElement("div");
        leftSide.id = "sidecolumn";
        mapDiv.appendChild(leftSide);

        L.control.search({
            position: "topleft",
            container: "sidecolumn",
            autoCollapse: true
        }).addTo(this.#map);
        leftSide.removeAttribute("style");

        /*>---------- [ Sidebar Construct ] ----------<*/
        this.#sidebar = new SidebarHandeler(this.#map, leftSide);

        //Info Panel
        this.#sidebar.createInfoPanel("Map Information", `<i class="fa-solid fa-circle-info"></i>`);

        //Index Panel
        this.#sidebar.createSpotPanel("Spot Index", `<i class="fa-solid fa-list"></i>`)

        //Marker Panel
        this.#sidebar.createInfoPanel("Token Information", `<i class="fa-solid fa-location-pin"></i>`);

        /*>---------- [ Marker Construct ] ----------<*/
        this.#map.on("click", (e) => {
            const { lat, lng } = e.latlng;

            L.marker([lat, lng], { icon: new svgIcon() }).addTo(this.#map);
        });

        /*>---------- [ Post-Construct ] ----------<*/
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
        await storeDB.delData("mapData");
        p2p.sendData({ type: "del" })

        this.#map.getContainer().classList.add("hide");
        this.#delLayerPop.hide();
    }
}

class SidebarHandeler {
    #sidebar = null;
    constructor(map, cont = null) {
        this.#sidebar = L.control.sidebar({
            position: "left",
            closeButton: true,
            autopan: true
        }).addTo(map);
        cont?.appendChild(this.#sidebar.getContainer());
    }
    #createPanel(title, tab) {
        const pane = document.getElementById("panel-template").content.cloneNode(true).querySelector("#pane");
        pane.querySelector(".leaflet-sidebar-header").firstChild.nodeValue = title;
        const id = `${title.substring(0, title.indexOf(" "))}-panel`

        this.#sidebar.addPanel({
            title,
            id,
            tab,
            pane
        });
        return pane;
    }

    createInfoPanel(title, tab) {
        const infoPanel = this.#createPanel(
            title,
            tab
        );
        infoPanel.classList.add("md-panel");

        if (isHost) {
            const editorDiv = document.createElement("textarea");
            editorDiv.id = "md-editor";
            editorDiv.placeholder = "Write in Markdown(.md)...";

            infoPanel.appendChild(editorDiv);

            editorDiv.addEventListener("input", () => previewDiv.innerHTML = marked.parse(editorDiv.value.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, "")));
            editorDiv.addEventListener("change", () => console.log("Sending Data"));
        }

        const previewDiv = document.createElement("div");
        previewDiv.id = "md-preview";
        infoPanel.appendChild(previewDiv);

        return infoPanel;
    }
    createSpotPanel(title, tab) {
        const indexPanel = this.#createPanel(
            title,
            tab
        );

        if (isHost) {
            const spotName = document.createElement("input");
            spotName.type = "text";
            spotName.placeholder = "Spot Name";
            spotName.classList.id = "spotName";

            const tokenColor = document.createElement("input");
            tokenColor.type = "color";
            tokenColor.classList.add("spotColor");

            const markColor = document.createElement("input");
            markColor.type = "color";
            markColor.classList.add("spotColor");

            const newSpotBtn = document.createElement("button");
            newSpotBtn.innerHTML = `<i class="fa-solid fa-plus">`;
            newSpotBtn.id = "newSpotBtn";

            indexPanel.appendChild(spotName);
            indexPanel.appendChild(tokenColor);
            indexPanel.appendChild(markColor);
            indexPanel.appendChild(newSpotBtn);

            //spotName.addEventListener("change", () => );
            //tokenColor.addEventListener("change", () => );
            //markColor.addEventListener("change", () => );
            const spotHdl = document.getElementById("spot-template").content.cloneNode(true);
            newSpotBtn.addEventListener("click", () => indexPanel.insertBefore(spotHdl.cloneNode(true), newSpotBtn));
        }

        return indexPanel;
    }
}



/*>--------------- { ImageHandeler } ---------------<*/
function loadImg(inputSrc, options = { lvl: 4, res: 256 }) {
    const img = new Image();
    img.onload = () => mapHdl.loadLayer(img, options);
    img.onerror = (event) => { throw new Error(event.target.error) };
    img.src = inputSrc;
}