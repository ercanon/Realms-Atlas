L.Atlas = L.Map.extend({
    options: {
        zoomControl: false,
        attributionControl: false,
        tileSize: 256,
        maxNativeZoom: 4
    },
    _initControlPos: function () {
        const controlCorners = this._controlCorners = {};
        const createElement = ([position, side, parent, type]) => {
            const elementCreated = L.DomUtil.create(type, `leaflet-${position} leaflet-${side}`, parent);
            if (type === "div")
                controlCorners[position + side] = elementCreated;
            return elementCreated;
        }

        const leftContent = this._leftContent = createElement(["content", "left", this._container, "span"]);
        const rightContent = this._rightContent = createElement(["content", "right", this._container, "span"]);
        //const topContent = this._topContent = createElement(["content", "top", this._container, "span"]);
        //const bottomContent = this._bottomContent = createElement(["content", "bottom", this._container, "span"]);

        [/*["side", "top", topContent, "div"],     ["side", "bottom", bottomContent, "div"],
         ["left", "top", topContent, "div"],     ["left", "bottom", bottomContent, "div"],
         ["right", "top", topContent, "div"],    ["right", "bottom", bottomContent, "div"],*/
         ["side", "left", leftContent, "div"],   ["side", "right", rightContent, "div"],
         ["top", "left", leftContent, "div"],    ["top", "right", rightContent, "div"],
         ["bottom", "left", leftContent, "div"], ["bottom", "right", rightContent, "div"]].forEach((element) =>
            createElement(element));
    },
    _clearControlPos() {
        for (const elem of Object.values(this._controlCorners))
            L.DomUtil.remove(element);
        delete this._controlCorners;

        ["_leftContent", "_rightContent",
         /*"_topContent", "_bottomContent"*/].forEach((divContent) => {
            L.DomUtil.remove(this[divContent]);
            delete this[divContent];
        });
    }
});
L.CanvasLayer = L.GridLayer.extend({
    options: {
        maxZoom: 8,
        img: null
    },

    /*>---------- [ Tile Rendering ] ----------<*/
    _setView: function (center, zoom, noPrune, instant) {
        let targetZoom = Math.round(zoom);

        const isZoomOutOfBounds = (this.options.maxZoom !== undefined && targetZoom > this.options.maxZoom) ||
            (this.options.minZoom !== undefined && targetZoom < this.options.minZoom);

        targetZoom = isZoomOutOfBounds ? undefined : this._clampZoom(targetZoom);

        if (targetZoom !== null) {
            const { tileSize, maxNativeZoom } = this.options;
            this.tileRes = tileSize * Math.pow(2, maxNativeZoom - targetZoom);
        }

        if (!instant || !(this.options.updateWhenZooming && targetZoom !== this._tileZoom)) {
            this._tileZoom = targetZoom;

            if (this._abortLoading)
                this._abortLoading();

            this._updateLevels();
            this._resetGrid();

            if (targetZoom !== undefined)
                this._update(center);

            if (!noPrune)
                this._pruneTiles();

            this._noPrune = !!noPrune;
        }

        this._setZoomTransforms(center, zoom);
    },
    createTile: function (coords) {
        const tileCanvas = L.DomUtil.create("canvas", "leaflet-tile");
        const img = this.options.img;
        tileCanvas.width = tileCanvas.height = this.tileRes;

        const dims = this._getTileDims(coords, img);
        if (dims)
            tileCanvas.getContext("2d").drawImage(img, ...dims);
        else
            console.warn("Generating outside bounds:", coords);

        return tileCanvas;
    },
    _getTileDims: function ({ x, y }, { width, height }) {
        const tileX = x * this.tileRes;
        const tileY = y * this.tileRes;

        if (tileX >= width || tileY >= height || tileX < 0 || tileY < 0)
            return null;

        return [tileX, tileY, this.tileRes, this.tileRes, 0, 0, this.tileRes, this.tileRes];
    }
});
L.Control.prototype.addTo = function (map) {
    this.remove();

    this._map = map;
    const container = this._container = this.onAdd(map);
    const [position, composition] = this.getPosition().split("_");
    const controlCorner = map._controlCorners[position];

    L.DomUtil.addClass(container, "leaflet-control");
    if (composition?.includes("upper"))
        controlCorner.insertBefore(container, controlCorner.firstChild);
    else //lower
        controlCorner.appendChild(container);

    this._map.on("unload", this.remove, this);

    return this;
};

L.Control.Sidebar = L.Control.extend({
    includes: L.Evented.prototype || L.Mixin.Events,
    options: {
        container: null,
        autopan: false,
        position: "left"
    },

    initialize: function (options) {
        this._entries = [];
        L.setOptions(this, options);
        return this;
    },
    onAdd: function () {
        const { container } = this.options;
        const contentContainer = this._container || (typeof container === "string" ? L.DomUtil.get(container) : container) || L.DomUtil.create("div", "leaflet-sidebar");
        if (typeof container === "string")
            contentPanel.id = container;

        const tabContainers = contentContainer.querySelectorAll("nav.leaflet-sidebar-tabs, div.leaflet-sidebar-tabs > nav");
        this._tabContainerTop = tabContainers[0] || null;
        this._tabContainerBottom = tabContainers[1] || null;

        if (!this._tabContainerTop) {
            const tabDiv = L.DomUtil.create("div", "leaflet-sidebar-tabs", contentContainer);
            tabDiv.setAttribute("role", "tablist");
            this._tabContainerTop = L.DomUtil.create("nav", "", tabDiv);
        }
        if (!this._tabContainerBottom)
            this._tabContainerBottom = L.DomUtil.create("nav", "", this._tabContainerTop.parentNode);

        this._panelContainer = contentContainer.querySelector("div.leaflet-sidebar-content") ||
            L.DomUtil.create("div", "leaflet-sidebar-content collapsed", contentContainer);

        const panelList = Object.fromEntries([...this._panelContainer.children]
            .filter((panel) => panel.tagName === "div" && L.DomUtil.hasClass(panel, "leaflet-sidebar-panel"))
            .map((panel) => [panel.id, panel])
        );
        [...this._tabContainerTop.children, ...this._tabContainerBottom.children].forEach((tab) => {
            if (panelList[tab.hash.slice(1)])
                this._entries.push(panelList);
        });

        return contentContainer;
    },
    onRemove: function () {
        this._entries.forEach((item) =>
            item.remove());

        this._entries = [];
        return this;
    },
    addTo: function (map) {
        const position = this.getPosition();
        L.Control.prototype.addTo.call(this, map);

        L.DomUtil.addClass(this._container, "leaflet-control");
        L.DomUtil.addClass(this._container, `leaflet-sidebar-${position}`);
        if (L.Browser.touch)
            L.DomUtil.addClass(this._container, "leaflet-touch");

        L.DomEvent.disableScrollPropagation(this._container);
        L.DomEvent.disableClickPropagation(this._container);
        L.DomEvent.on(this._container, "contextmenu", L.DomEvent.stopPropagation);

        return this;
    },

    remove: function (id) {
        if (id)
            this.getEntry(id).remove();
        else {
            this._map?._container.removeChild(this._container);
            this.onRemove();
            this._map = null;
        }
        return this;
    },

    panMap: function (action) {
        if (!this.options.autopan)
            return null;

        const offset = parseInt(L.DomUtil.getStyle(this._container, "max-width"), 10) / 2;
        const panOffset = action === "open" && this.options.position === "left" || action === "close" && this.options.position === "right" ? offset : -offset;
        this._map.panBy([panOffset, 0], { duration: 0.5 });
    },
    addEntry: function (entry) {
        this._entries.push(entry);
        return this;
    },
    getEntry: function (prop) {
        if (prop instanceof L.Control.Sidebar.BlankEntry)
            return this._entries.find((item) => item === prop);

        return this._entries.find((item) =>
            prop[0] === "."
                ? L.DomUtil.hasClass(item._panel, prop.slice(1))
                : item.options.id === prop
        );
    },
    getContainer: function (position) {
        switch (position) {
            case "panel":
                return this._panelContainer;
            case "top":
                return this._tabContainerTop;
            case "bottom":
                return this._tabContainerBottom;
            default:
                this._container
        }
    }
})
L.Control.MapBtn = L.Control.extend({
    options: {
        className: null,
        innerMsg: null,
        action: null
    },
    onAdd: function () {
        const { className, innerMsg, action } = this.options;
        const button = L.DomUtil.create("button", className);
        button.innerHTML = innerMsg;
        button.onclick = action;
        return button;
    }
});

L.DivIcon.MarkerEntry = L.DivIcon.extend({ //TODO
    _stringDOM: document.createElement("span"),
    options: {
        _markerName: "",
        _iconName: "",
        defaultName: "",
        transformIcon: {},
        structureEntry: "",
        actionEntry: null
    },
    initialize: function (markerInput, markerControls, options) {
        const isString = typeof markerInput === "string";

        this.markerRef = isString
            ? Iconify.renderSVG(markerInput, { height: "unset" })
            : markerInput.markerRef.cloneNode(true);

        this.spotRef = this.markerRef.firstElementChild;

        this.iconRef = isString
            ? document.createElementNS("http://www.w3.org/2000/svg", "path")
            : this.markerRef.lastElementChild;
        this.markerRef.appendChild(this.iconRef);

        this.markerRef.id = DataHandler.randomUUIDv4();
        this.markerRef.removeAttribute("style");

        if (isString) {
            Object.assign(this.markerRef.style, {
                position: "absolute",
                transform: "scale(0)"
            });
            this.iconRef.style.transformOrigin = "center";
            Object.entries(markerControls).forEach(([name, prop]) =>
                this.setProperty(name, prop.value));
        }

        L.setOptions(this, (isString ? options : markerInput.options));
        this.options.transformIcon = { ...this.options.transformIcon };
    },
    createIcon: function () {
        this._stringDOM.innerHTML =
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${this.markerRef.getAttribute("viewBox")}">
                <use href="#${this.markerRef.id}"></use>
            </svg>`
        return this._stringDOM.firstElementChild;
    },
    createEntry: function () {
        this._stringDOM.innerHTML = this.options.structureEntry;

        this.entry = this._stringDOM.firstElementChild;
        const { input, figure, button } = setList(this.entry.children, "localName");

        figure.prepend(this.markerRef);
        this.caption = figure.querySelector(":scope > figCaption");
        this.setProperty("nameMarker");

        input.addEventListener("click", () => { });

        figure.addEventListener("click", () =>
            this.options.actionEntry(this, this.getProperties()));

        button.addEventListener("click", () => {
            this.options.actionEntry(null);
            this.entry.remove()
        });

        return this.entry;
    },
    setProperty: function (property, input) {
        switch (property) {
            case "iconMarker":
                if (this.options._iconName === input)
                    return;

                this.options._iconName = input;
                this.setProperty("nameMarker");

                this._stringDOM.innerHTML = Iconify.getIcon(input).body;
                this.iconRef.setAttribute("d",
                    this._stringDOM.querySelector("path").getAttribute("d"));
                break;
            case "nameMarker":
                const { _markerName, defaultName, _iconName } = this.options;
                this.options._markerName = input || _markerName || "";

                const markerName = this.options._markerName || defaultName || _iconName;

                if (this.caption)
                    this.caption.textContent = markerName;
                break;
            case "translateIcon":
            case "scaleIcon":
                this._parseInput(property.replace(/Icon$/, ""), input, (value) => {
                    const cleaned = value.trim().replace(/[^0-9.-]/g, "");
                    return `${!cleaned || cleaned === "." || cleaned === "-" ? "0" : cleaned}${value.match(/(px|pt|pc|in|cm|mm|Q|em|rem|ex|ch|cap|ic|lh|rlh|vw|vh|vmin|vmax|svw|svh|lvw|lvh|dvw|dvh|%|fr)/g)?.[0] || ""}`
                });
                break;
            case "colorMarker":
            case "colorIcon":
                (property === "colorMarker" ? this.spotRef : this.iconRef).setAttribute("fill",
                    input);
                break;
        }
    },
    handleActive: function (action) {
        if (!this.entry)
            return;
        this.entry.classList[action]("active");
    },
    getProperties: function () {
        return {
            markerID: this.markerRef.id,
            iconName: this.options._iconName.split(":")[1],
            nameMarker: this.options._markerName,
            translateIcon: this.options.transformIcon.translate,
            scaleIcon: this.options.transformIcon.scale,
            colorMarker: this.spotRef.getAttribute("fill"),
            colorIcon: this.iconRef.getAttribute("fill")
        }
    },
    _parseInput: function (type, input, action) {
        const axis = input
            .split(",")
            .map(action);

        const { transformIcon } = this.options;
        transformIcon[type] = axis;
        this.iconRef.style.transform = Object.entries(transformIcon)
            .map(([key, value]) =>
                `${key}(${value})`)
            .join(" ");
    }
});


class MapHandler {
    static #fileReader = new FileReader();
    static #atlas = null;

    static init() {
        /*>---------- [ Map Initialization ] ----------<*/
        MapHandler.#atlas = new L.Atlas(document.main, {
            crs: L.CRS.Simple,
            zoomSnap: 0.5,
            zoomDelta: 0.5,
            maxBoundsViscosity: 1.0,
        }).setView([0, 0], 0);

        /*>---------- [ Sidebar Initialization ] ----------<*/
        const sidebar = new L.Control.Sidebar({
            position: "sideleft",
            autopan: true
        }).addTo(MapHandler.#atlas);

        new L.Control.Sidebar.InfoEntry({
            title: "Map Information",
            iconBtn: false
        }).addTo(sidebar);

        new L.Control.Sidebar.MarkerListEntry({
            title: "Marker Index",
            iconList:
                fetch("https://cdn.jsdelivr.net/npm/@iconify-json/game-icons/icons.json").then((iconList) =>
                    iconList.json()),
            iconBtn: false
        }).addTo(sidebar);

        /*>---------- [ SearchBtn Initialization ] ----------<*/
        L.control.search({
            position: "sideleft_upper",
            autoCollapse: true
        }).addTo(MapHandler.#atlas);

        /*>---------- [ Host Extra Tools ] ----------<*/
        if (document.isHost) {
            /*const delMapPopup = new PopupHandler("delMapPopup", false);*/
            new L.Control.MapBtn({
                position: "bottomright",
                className: "delMap",
                innerMsg: "Delete Map",
                //action: () =>
                //    delMapPopup.reveal()
            }).addTo(MapHandler.#atlas);

            const geomanRef = MapHandler.#atlas.pm;
            geomanRef.addControls({
                position: "topleft"
            });
        }

        /*>---------- [ Zoom Initialization ] ----------<*/
        new L.Control.Zoom({
            position: "topright"
        }).addTo(MapHandler.#atlas);
    }

    //static loadLayer(inputSrc, options) {
    //    const img = new Image();
    //    img.onload = () => {
    //        const bounds = [[0, 0], [-img.height, img.width].map((value) =>
    //            value / Math.pow(2, options.maxNativeZoom))];
    //        MapHandler.#atlas.setMaxBounds(bounds);
    //        MapHandler.#atlas.fitBounds(bounds);

    //        new L.CanvasLayer({
    //            ...options,
    //            minZoom: MapHandler.#atlas.getBoundsZoom(bounds),
    //            bounds,
    //            img
    //        }).addTo(MapHandler.#atlas);
    //    }
    //    img.onerror = (event) => { throw new Error(event.target.error) };
    //    img.src = inputSrc;
    //}

    static async loadLayer({ target }, options) {
        let imgURL = null;
        if (target.files) {
            const file = target.files[0];
            if (!(file && file.type.startsWith("image/"))) {
                target.value = "";
                return alert("No valid file selected.");
            }

            imgURL = await new Promise((resolve, reject) => {
                const reader = MapHandler.#fileReader;
                reader.onload = () => resolve(reader.result);
                reader.onerror = (e) => reject(e);
                reader.readAsDataURL(file);
            });
        }
        else if (target.value) {
            imgURL = target.value.trim();
            if (!(imgURL && /\.(jpeg|jpg|gif|png|webp|bmp|svg)$/i.test(imgURL)))
                return alert("No valid file selected.");
        }

        const img = new Image();
        img.onload = () => {
            const scale = 1 / (2 ** options?.maxNativeZoom || MapHandler.#atlas.options.maxNativeZoom);
            const bounds = [[0, 0], [-img.height * scale, img.width * scale]];
            const atlas = MapHandler.#atlas;

            atlas.setMaxBounds(bounds);
            atlas.fitBounds(bounds); 

            new L.CanvasLayer({
                ...(options || {}),
                bounds,
                img,
                minZoom: atlas.getBoundsZoom(bounds)
            }).addTo(atlas);
        }
        img.onerror = (e) =>
        { throw new Error(e.target.error) };
        img.src = imgURL;
    };
}