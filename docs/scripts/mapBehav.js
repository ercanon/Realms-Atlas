/*>--------------- { Custom Leaflet Content } ---------------<*/
const CanvasLayer = L.GridLayer.extend({
    options: {
        // The maximum zoom level up to which this layer will be displayed (inclusive).
        maxZoom: 8,

        //Image to be tiled and rendered in the map
        img: null
    },

    /*>---------- [ Tile Rendering ] ----------<*/
    createTile: function (coords, done) {
        const tileCanvas = L.DomUtil.create("canvas", "leaflet-tile");
        const img = this.options.img;
        tileCanvas.width = tileCanvas.height = this.options.tileSize * Math.pow(2, this.options.maxNativeZoom - coords.z);

        this._getDims(coords, tileCanvas.width, img).then((dims) => {
            if (dims)
                tileCanvas.getContext("2d").drawImage(img, ...dims);
            else
                console.warn("Generating outside bounds:", coords);
            done(null, tileCanvas);
        }).catch((error) => {
            console.error("Error generating tiles.", error);
            done(error, null);
        });

        return tileCanvas;
    },
    _getDims: async function ({ x, y }, tileRes, { width, height }) {
        const tileX = x * tileRes;
        const tileY = y * tileRes;

        if (tileX >= width || tileY >= height || tileX < 0 || tileY < 0)
            return null;

        return [tileX, tileY, tileRes, tileRes, 0, 0, tileRes, tileRes];
    }
});
const DynSidebar = L.Control.Sidebar.extend({
    addPanel: function (t) {
        var e, i, s, o, n;
        return i = L.DomUtil.create("li", t.disabled ? "disabled" : ""),
            (s = L.DomUtil.create("a", "", i)).href = "#" + t.id,
            s.setAttribute("role", "tab"),
            s.innerHTML = t.tab,
            i._sidebar = this,
            i._id = t.id,
            i._button = t.button,
            t.title && "<" !== t.title[0] && (i.title = t.title),
            "bottom" === t.position ? this._tabContainerBottom.appendChild(i) : this._tabContainerTop.appendChild(i),
            this._tabitems.push(i),
            t.pane instanceof HTMLElement ? (e = t.pane,
                this._paneContainer.appendChild(e)) : (e = L.DomUtil.create("DIV", "leaflet-sidebar-pane", this._paneContainer),
                n = "",
                t.title && (n += `<h1 class="leaflet-sidebar-header">` + t.title),
                (this.options.closeButton || t.closeIcon) && (n += `<span class="leaflet-sidebar-close":scope > ${typeof t.closeIcon === "string" ? t.closeIcon : `<i class="fa fa-caret-${this.options.position}"></i>`}</span>`),
                t.title && (n += "</h1>"),
                e.innerHTML = n + (t.pane || "")),
                e.id = t.id,
                this._panes.push(e),
                (o = e.querySelectorAll(".leaflet-sidebar-close")).length && (this._closeButtons.push(o[o.length - 1]),
                    this._closeClick(o[o.length - 1], "on", t.closeFunct)),
            this._tabClick(i, "on"),
            this
    },
    removePanel: function (t) {
        var e, i, s, o, n;
        if (typeof t.closeIcon !== "string")
            t = t.target.closest("div.leaflet-sidebar-pane.active").id;
        for (e = 0; e < this._tabitems.length; e++)
            if (this._tabitems[e]._id === t) {
                s = this._tabitems[e],
                    this._tabClick(s, "off"),
                    s.remove(),
                    this._tabitems.splice(e, 1);
                break
            }
        for (e = 0; e < this._panes.length; e++)
            if (this._panes[e].id === t) {
                for (n = (o = this._panes[e]).querySelectorAll(".leaflet-sidebar-close"),
                    i = 0; i < n.length; i++)
                    this._closeClick(n[i], "off");
                o.remove(),
                    this._panes.splice(e, 1);
                break
            }
        return this
    },
    _closeClick: function (t, e, functs = []) {
        if (Array.isArray(functs) && functs.length > 0)
            functs.forEach((f) => L.DomEvent[e](t, "click", f || this.onCloseClick, this));       
        else 
            L.DomEvent[e](t, "click", this.onCloseClick, this);
    },

    /*>---------- [ Sidebar Construct ] ----------<*/
    _loadPreview: async function (indexPath, svgMenu)
    {
        const response = await fetch(indexPath);
        const svgFiles = await response.json();
        const svgGrid = svgMenu.querySelector("#svgGrid");

        svgFiles.forEach(async (file) => {
            const figure = document.createElement("figure");
            const svgImg = document.createElement("img");
            svgImg.src = file;

            const nameObj = `${file.replace(/^icons\/|\.svg$/g, "").replace(/-/g, " ")}`;
            figure.addEventListener("click", (event) => {
                event.stopPropagation();

                svgMenu.parentNode.querySelector(":scope > figure").innerHTML = figure.innerHTML;
                svgMenu.classList.add("hide");
            });

            const nameFig = document.createElement("figcaption");
            nameFig.innerHTML = nameObj;

            figure.append(svgImg, nameFig);
            svgGrid.appendChild(figure);

            if (file.includes("position-marker"))
                svgMenu.parentNode.querySelector(":scope > figure").innerHTML = figure.innerHTML;
        });

        svgMenu.querySelector(`:scope > input[type="text"]`).addEventListener("input", (event) => {
            event.stopPropagation();

            const textInput = event.target.value.toLowerCase();
            svgGrid.forEach((icon) => {
                if (icon.querySelector("span").innerHTML.toLowerCase().includes(textInput))
                    icon.classList.add("hide");
                else
                    icon.classList.remove("hide");
            });
        });
        svgMenu.classList.add("hide");
    },

    _createPanel: function (title, tab, { closeIcon = null, closeFunct = null }, addClass = null) {
        const id = `${title.replace(/ /g, "_")}-panel`
        const panel = this.addPanel({
            title,
            id,
            tab,
            closeIcon,
            closeFunct
        })._paneContainer.querySelector(`#${id}`);

        panel.classList.add(addClass);
        return panel;
    },
    createInfoPanel: function (title, tab, auxBtn = {}) {
        const infoPanel = this._createPanel(
            title,
            tab,
            auxBtn,
            "md-panel"
        );

        if (isHost) {
            const editorDiv = document.createElement("textarea");
            editorDiv.placeholder = "Write in Markdown(.md)...";
            infoPanel.appendChild(editorDiv);

            editorDiv.addEventListener("input", () =>
                previewDiv.innerHTML = marked.parse(editorDiv.value.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, "")));
            editorDiv.addEventListener("change", () =>
                console.log("Sending Data"));
        }

        const previewDiv = document.createElement("div");
        infoPanel.appendChild(previewDiv);

        return infoPanel;
    },
    createMarkerPanel: function (title, tab, auxBtn = {}) {
        const indexPanel = this._createPanel(
            title,
            tab,
            auxBtn,
            "marker-panel"
        );

        if (isHost) {
            const template = tmplList.markerPanelTemplate.cloneNode(true)
            const markerPanel = Object.fromEntries(
                Array.from(template.children).map((child) => [child.id, child])
            );

            const dropdownMenu = markerPanel.svgDropdown.querySelector(":scope > div");
            this._loadPreview("icons/index.json", dropdownMenu);

            let activeMarker = null;
            markerPanel.svgDropdown.addEventListener("click", () =>
                dropdownMenu.classList.toggle("hide"));

            markerPanel.nameMarker.addEventListener("change", () => { });
            markerPanel.colorSpot.addEventListener("change", () => { });
            markerPanel.colorToken.addEventListener("change", () => { });
            markerPanel.newMarker.addEventListener("click", () => 
                new MarkerEntry(indexPanel, markerPanel.newMarker));

            indexPanel.appendChild(template);
        }
        return indexPanel;
    },
    createToolsPanel: function (title, tab, auxBtn = {}) {
        const toolsPanel = this._createPanel(
            title,
            tab,
            auxBtn,
            "tools-panel"
        );
        return toolsPanel;
    }
})
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

/*>--------------- { Map Handeler } ---------------<*/
class MapHandeler {
    #delLayerPop = new PopDiv("delLayer");
    #map = null;
    #sidebar = null;
    #activeLayer = null;
    constructor() {
        /*>---------- [ Map Construct ] ----------<*/
        const mapDiv = document.createElement("div");
        document.body.querySelector("main").appendChild(mapDiv);

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
                button.onclick = () =>
                    this.#delLayerPop.setState("remove");
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
        this.#sidebar = new DynSidebar({
            position: "left",
            closeButton: false,
            autopan: true
        }).addTo(this.#map);
        leftSide.appendChild(this.#sidebar.getContainer());

        //Info Panel
        this.#sidebar.createInfoPanel("Map Information", `<i class="fa-solid fa-circle-info"></i>`);

        //Index Panel
        this.#sidebar.createMarkerPanel("Marker Index", `<i class="fa-solid fa-list"></i>`)

        //Marker Panel
        /*this.#sidebar.createInfoPanel("Token Information", `<i class="fa-solid fa-location-pin"></i>`, {
            closeIcon: `<i class="fa-solid fa-xmark"></i>`,
            closeFunct: [this.#sidebar.onCloseClick, this.#sidebar.removePanel]
        });*/

        //Tools Panel
        this.#sidebar.createToolsPanel("Map Tools", `<i class="fa-solid fa-screwdriver-wrench"></i>`)

        /*>---------- [ Marker Construct ] ----------<*/
        //this.#map.on("click", (e) => {
        //    const { lat, lng } = e.latlng;

        //    L.marker([lat, lng], { icon: new svgIcon() }).addTo(this.#map);
        //});

        /*>---------- [ Post-Construct ] ----------<*/
        this.#setMapState("add");
    }
    #setMapState(state){
        this.#map.getContainer().classList[state]("hide");
    }

    loadMapImg(inputSrc, options = { lvl: 4, res: 256 }) {
        const img = new Image();
        img.onload = () =>
            this.loadMapLayer(img, options);
        img.onerror = (event) => { throw new Error(event.target.error) };
        img.src = inputSrc;
    }
    loadMapLayer(img, { lvl, res }) {
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

        this.#setMapState("remove");
    }

    async deleteMapLayer() {
        this.#activeLayer.remove();
        await storeDB.delData("mapData");
        p2p.sendData({ type: "del" })

        this.#setMapState("add");
        this.#delLayerPop.setState("add");
    }
}
class MarkerEntry {
    #markerEntry = null;
    constructor(parent, objBefore = null) {
        const template = tmplList.markerEntryTemplate.cloneNode(true).children[0];
        this.markerEntry = { [template.id]: template };
        for (const child of template.children)
            this.markerEntry[child.id] = child;

      //this.markerEntry.div.addEventListener("click", () => );

        objBefore ? parent.insertBefore(template, objBefore) : parent.appendChild(template);
    }

    getProp(prop) {
        return this.markerEntry[prop];
    }
}