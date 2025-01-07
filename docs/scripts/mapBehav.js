/*>--------------- { Custom Leaflet Content } ---------------<*/
const CanvasLayer = L.GridLayer.extend({
    options: {
        maxZoom: 8,
        img: null
    },

    /*>---------- [ Tile Rendering ] ----------<*/
    _setView: function (t, e, i, n) {
        var o = Math.round(e)
            , o = void 0 !== this.options.maxZoom && o > this.options.maxZoom || void 0 !== this.options.minZoom && o < this.options.minZoom ? void 0 : this._clampZoom(o)
            , s = this.options.updateWhenZooming && o !== this._tileZoom;

        if (o) {
            const { tileSize, maxNativeZoom } = this.options;
            this.tileRes = tileSize * Math.pow(2, maxNativeZoom - o);
        }

        n && !s || (this._tileZoom = o,
            this._abortLoading && this._abortLoading(),
            this._updateLevels(),
            this._resetGrid(),
            void 0 !== o && this._update(t),
            i || this._pruneTiles(),
            this._noPrune = !!i),
            this._setZoomTransforms(t, e)
    },
    createTile: function (coords) {
        const tileCanvas = L.DomUtil.create("canvas", "leaflet-tile");
        const { img } = this.options;
        tileCanvas.width = tileCanvas.height = this.tileRes;

        const dims = this._getTileDims(coords, tileCanvas.width, img);
        if (dims)
            tileCanvas.getContext("2d").drawImage(img, ...dims);
        else
            console.warn("Generating outside bounds:", coords);

        return tileCanvas;
    },
    _getTileDims: function ({ x, y }, tileRes, { width, height }) {
        const tileX = x * tileRes;
        const tileY = y * tileRes;

        if (tileX >= width || tileY >= height || tileX < 0 || tileY < 0)
            return null;

        return [tileX, tileY, tileRes, tileRes, 0, 0, tileRes, tileRes];
    }
});
const MarkerEntry = L.DivIcon.extend({
    options: {
        defaultName: null,
        markerRef: null,
        markerPathRef: null
    },
    /**
     * this.figure;
     * this.figcaption;
     * this.icon;
     * this.spotColor;
     * this.tokenColor;
     */
    initialize: function ({ data, parentEntry, updateSelected }) {
        const { nameMarker, spotMarker, tokenMarker, spotColor, tokenColor } = data;
        const entry = tmplList.markerEntryTemplate.cloneNode(true).querySelector(".markerEntry");

        try {
            //Create Spot
            this.figure = entry.querySelector(":scope > figure");
            this.figure.innerHTML = spotMarker;

            this.icon = this.figure.querySelector(":scope > svg");
            if (!this.icon) 
                throw new Error("Invalid SVG Element.");

            //Set color to Spot
            this.icon.removeAttribute("style");
            this.spotColor = this.icon.querySelector("path");
            this.setColor("spotColor", spotColor.value);

            //Create Token
            this.setToken(tokenMarker, tokenColor.value);

            //Create referenced Icon
            this.options.markerRef = this.icon.cloneNode(false);
            Object.assign(this.options.markerRef.style, {
                width: "3rem",
                height: "3rem",
                transform: "translate(-50%, -50%)"
            });

            this.options.markerPathRef = document.createElementNS("http://www.w3.org/2000/svg", "use");
            this.options.markerRef.appendChild(this.options.markerPathRef);

            //Set Names
            this.figcaption = document.createElement("figcaption");
            this.figure.appendChild(this.figcaption);
            this.setName(nameMarker.textContent);

            //Set EventListeners
            this.figure.addEventListener("click", this._activeEntry = () => {
                updateSelected(this);
                data.nameMarker.value = this.figcaption.textContent;
                data.spotColor.value = this.spotColor.getAttribute("fill");
                data.tokenColor.value = this.tokenColor?.getAttribute("fill");
            });

            const checkbox = entry.querySelector(`:scope > input[type="checkbox"]`);
            checkbox.addEventListener("click", this._toggleVis = () => {
            });

            const button = entry.querySelector(":scope > button");
            button.addEventListener("click", this._deleteEntry = () => {
                updateSelected(null);
                this.figure.removeEventListener("click", this._activeEntry);
                checkbox.removeEventListener("click", this._toggleVis);
                button.removeEventListener("click", this._deleteEntry);
                this.entry.remove();
            });

            parentEntry.appendChild(entry);
        }
        catch (error) {
            console.error("Error creating Marker Entry:", error);
        }
    },
    setToken: function (tokenMarker, tokenColor = null) {
        const token = tokenMarker.querySelector("g").cloneNode(true);
        if (!token)
            throw new Error("Invalid SVG Element.");

        const path = token.querySelector(":scope > path");
        const shape = path?.getAttribute("d");
        if (!shape)
            throw new Error("Invalid SVG Element.");

        const color = this.tokenColor?.getAttribute("fill") || tokenColor;
        this.tokenColor?.remove();
        this.options.defaultName = tokenMarker.querySelector(":scope > figcaption").textContent;

        if (this.spotColor.getAttribute("d") !== shape &&
            this.tokenColor?.getAttribute("d") !== shape) {
            Object.assign(token.style, {
                transformOrigin: "center",
                transform: "scale(0.4) translate(0%, -45%)"
            });

            this.tokenColor = path;
            if (color)
                this.setColor("tokenColor", color);

            this.icon.appendChild(token);
        }
    },
    setName: function (inputName) {
        const { defaultName, markerPathRef } = this.options;
        const name = inputName || defaultName || "Spot Marker";

        this.figcaption.textContent = name;   
        markerPathRef.setAttribute("href", `#${this.icon.id = name.replace(/ /g, "_")}`);
    },
    setColor: function (type, color) {
        this[type]?.setAttribute("fill", color);
    },
    createIcon: function () {
        return this.options.markerRef.cloneNode(true);
    }
});
const DynSidebar = L.Control.Sidebar.extend({
    options: {
        iconList: { }
    },
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
    _createPanel: function (title, tab, { closeIcon = null, closeFunct = null }) {
        const id = `${title.replace(/ /g, "_")}-panel`
        return this.addPanel({
            title,
            id,
            tab,
            closeIcon,
            closeFunct
        })._paneContainer.querySelector(`#${id}`);
    },
    createInfoPanel: function (title, tab, auxBtn = {}) {
        const panel = this._createPanel(
            title,
            tab,
            auxBtn
        );
        panel.classList.add("info-panel");

        if (isHost) {
            const infoPanel = tmplList.infoPanelTemplate.cloneNode(true);
            const { textarea, div } = Object.fromEntries(
                [...infoPanel.children].map((child) => [child.localName, child])
            );

            textarea.addEventListener("input", (event) =>
                div.innerHTML = marked.parse(event.target.value.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, "")));
            textarea.addEventListener("change", (event) =>
                console.log("Sending Data"));

            panel.appendChild(infoPanel);
        }
    },
    createMarkerPanel: function (title, tab, auxBtn = {}) {
        const panel = this._createPanel(
            title,
            tab,
            auxBtn
        );

        if (isHost) {
            const markerPanel = tmplList.iconPanelTemplate.cloneNode(true);
            const customIcon = markerPanel.querySelector("#customIcon");
            const dropdownIcon = markerPanel.querySelector("#dropdownIcon");

            //id: customIcon
            let selectedMarker = null;
            const data = {
                tokenMarker: customIcon.querySelector(":scope > figure"),
                nameMarker: customIcon.querySelector("#nameMarker"),
                spotColor: customIcon.querySelector("#spotColor"),
                tokenColor: customIcon.querySelector("#tokenColor")
            }

            data.tokenMarker.addEventListener("click", () => 
                dropdownIcon.classList.toggle("hide"));
            data.nameMarker.addEventListener("input", (event) => 
                selectedMarker?.setName(event.target.value));
            data.spotColor.addEventListener("input", (event) => 
                selectedMarker?.setColor("spotColor", event.target.value));
            data.tokenColor.addEventListener("input", (event) => 
                selectedMarker?.setColor("tokenColor", event.target.value));

            data.nameMarker.addEventListener("change", () => { });
            data.spotColor.addEventListener("change", () => { });
            data.tokenColor.addEventListener("change", () => { });

            //id: dropdownIcon
            const dropdownGrid = dropdownIcon.querySelector(":scope > g");
            Object.entries(this.options.iconList).forEach(([key, iconHTML]) => {
                const figure = document.createElement("figure");
                figure.innerHTML = iconHTML;
                figure.querySelector(":scope > svg").removeAttribute("style");


                const nameFig = document.createElement("figcaption");
                nameFig.textContent = key;
                figure.appendChild(nameFig);

                if (key.includes("position marker")) {
                    dropdownGrid.prepend(figure);
                    data.spotMarker = iconHTML;
                    data.tokenMarker.innerHTML = figure.innerHTML;
                }
                else
                    dropdownGrid.appendChild(figure);

                figure.addEventListener("click", () => {
                    data.tokenMarker.innerHTML = figure.innerHTML;
                    selectedMarker?.setToken(figure);
                    dropdownIcon.classList.add("hide");
                });

            });
            dropdownIcon.addEventListener("mouseleave", () =>
                dropdownIcon.classList.add("hide"))

            dropdownIcon.querySelector(`:scope > input[type="text"]`).addEventListener("input", (event) => {
                const textInput = event.target.value.toLowerCase();
                [...dropdownGrid.children].forEach(async (icon) =>
                    icon.classList.toggle("hide", !icon.querySelector("figcaption").textContent.toLowerCase().includes(textInput))
                );
            });

            //id: btnEntry
            const parentEntry = markerPanel.querySelector("#indexEntry");
            markerPanel.querySelector("#btnEntry").addEventListener("click", () =>
                new MarkerEntry({
                    data,
                    //iconSize,
                    //iconAnchor,
                    parentEntry,
                    updateSelected: (marker) => {
                        selectedMarker?.figure.parentNode.classList.remove("active");

                        if (selectedMarker === marker || !marker)
                            selectedMarker = null;
                        else {
                            selectedMarker = marker;
                            marker.figure.parentNode.classList.add("active");
                        }
                    }
                }));

            dropdownIcon.classList.add("hide");
            panel.appendChild(markerPanel);
            return () => { return selectedMarker };
        }
    },
    createToolsPanel: function (title, tab, auxBtn = {}) {
        const panel = this._createPanel(
            title,
            tab,
            auxBtn,
            "tools-panel"
        );
    }
});

/*>--------------- { Map Handeler } ---------------<*/
class MapHandeler {
    #delLayerPop = new PopDiv("delLayer");
    #map = null;
    #sidebar = null;
    #iconList = {};
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
        const leftSide = document.createElement("g");
        leftSide.id = "sideColumn";
        mapDiv.appendChild(leftSide);

        L.control.search({
            position: "topleft",
            container: "sideColumn",
            autoCollapse: true
        }).addTo(this.#map);
        leftSide.removeAttribute("style");

        /*>---------- [ Sidebar Construct ] ----------<*/
        this.#fetchMapIcons("icons/index.json").then(() => {
            this.#sidebar = new DynSidebar({
                position: "left",
                closeButton: false,
                autopan: true,
                iconList: this.#iconList
            }).addTo(this.#map);
            leftSide.appendChild(this.#sidebar.getContainer());

            //Info Panel
            this.#sidebar.createInfoPanel("Map Information", `<i class="fa-solid fa-circle-info"></i>`);

            //Index Panel
            const indexEntry = this.#sidebar.createMarkerPanel("Marker Index", `<i class="fa-solid fa-list"></i>`);

            //Marker Panel
            /*this.#sidebar.createInfoPanel("Token Information", `<i class="fa-solid fa-location-pin"></i>`, {
                closeIcon: `<i class="fa-solid fa-xmark"></i>`,
                closeFunct: [this.#sidebar.onCloseClick, this.#sidebar.removePanel]
            });*/

            //Tools Panel
            this.#sidebar.createToolsPanel("Map Tools", `<i class="fa-solid fa-screwdriver-wrench"></i>`);

            //Map Distribution Panel

            //Settings Panel

            /*>---------- [ Marker Construct ] ----------<*/
            this.#map.pm.addControls({
                position: 'topleft',
                drawCircleMarker: false,
                rotateMode: false,
            });
            if (isHost) {
                this.#map.on("click", (e) => {
                    const { lat, lng } = e.latlng;
                    const selectedMarker = indexEntry();

                    if (selectedMarker)
                        L.marker([lat, lng], { icon: selectedMarker }).addTo(this.#map);
                });
            }
        });


        /*>---------- [ Post-Construct ] ----------<*/
        this.#setMapState("add");
    }
    async #fetchMapIcons(indexPath) {
        try {
            const response = await fetch(indexPath);
            if (!response.ok)
                throw new Error(`Failed to fetch ${indexPath}: ${response.statusText}`);
            const iconFiles = await response.json();

            this.#iconList = Object.fromEntries(
                iconFiles.map((path) => {
                    const name = path.replace(/^icons\/|\.svg$/g, "").replace(/-/g, " ");
                    return [name, path];
                })
            );

            const filePromises = Object.entries(this.#iconList).map(async ([name, path]) => {
                const fileResponse = await fetch(path);
                if (!fileResponse.ok)
                    throw new Error(`Failed to fetch ${name}: ${fileResponse.statusText}`);
                this.#iconList[name] = await fileResponse.text();
            });

            await Promise.all(filePromises);
        }
        catch (error) {
            console.error("Error loading SVG:", error);
        }
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
        p2p.sendData({ type: "del" });

        this.#setMapState("add");
        this.#delLayerPop.setState("add");
    }
} 