L.Atlas = L.Map.extend({
    options: {
        zoomControl: false,
        attributionControl: false,
    },
    initialize: function (id, options) {
        this._mapLayers = {};

        L.Map.prototype.initialize.call(this, id, options);
    },
    getCornerList: function () {
        return this._controlCorners;
    },
    _initControlPos: function () {
        const controlCorners = this._controlCorners = {};
        const prefix = "leaflet-";
        const createElement = ([position, side, parent, type]) => {
            const elementCreated = L.DomUtil.create(type, prefix + position + " " + prefix + side, parent);
            if (type === "div")
                controlCorners[position + side] = elementCreated;
            return elementCreated;
        }

        const leftContent = this._leftContent   = createElement(["content", "left", this._container, "span"]);
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
        Object.values(this._controlCorners).forEach((element) => 
            L.DomUtil.remove(element));
        delete this._controlCorners;

        ["_leftContent", "_rightContent", /*"_topContent", "_bottomContent"*/].forEach((divContent) => {
            L.DomUtil.remove(this[divContent]);
            delete this[divContent];
        });
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
        const {container} = this.options;
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
        const button = L.DomUtil.create("button", className );
        button.innerHTML = innerMsg;
        button.onclick = action;
        return button;
    }
});

L.DivIcon.MarkerEntry = L.DivIcon.extend({
    _stringDOM: document.createElement("span"),
    options: {
        markerName: "",
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

        this.markerRef.id = `${Date.now()}${isString ? "-static" : ""}-marker`
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

        input.addEventListener("click", this._toggleVis = () => { });

        figure.addEventListener("click", this._activeEntry = () => {
            this.options.actionEntry(this);
        });

        button.addEventListener("click", this._deleteEntry = () => {
            activateMarker(null);
            figure.removeEventListener("click", this._activeEntry);
            checkbox.removeEventListener("click", this._toggleVis);
            button.removeEventListener("click", this._deleteEntry);
            this.entry.remove();
        });

        return this.entry;
    },
    setProperty: function (property, input) {
        switch (property) {
            case "iconMarker":
                this.options._iconName = input;
                this._stringDOM.innerHTML = Iconify.getIcon(input).body;
                this.iconRef.setAttribute("d",
                    this._stringDOM.querySelector("path").getAttribute("d"));
                break;
            case "nameMarker":
                const { markerName, defaultName, _iconName } = this.options
                const nameEntry = this.options.markerName = input || markerName || defaultName || _iconName;
                if (this.caption)
                    this.caption.textContent = nameEntry;
                break;
            case "posIcon":
                this._parseInput("translate", input, (pos) =>
                    `${pos.trim().replace(/[^0-9.-]/g, "")}${pos.match(/%/)?.[0] || "px"}`)
                break;
            case "scaleIcon":
                this._parseInput("scale", input, (scale) =>
                    scale.trim().replace(/[^0-9.-]/g, ""));
                break;
            case "colorMarker":
            case "colorIcon":
                (property === "colorMarker" ? this.spotRef : this.iconRef).setAttribute("fill",
                    input);
                break;
        }
    },
    toggleActive: function (action) {
        if (!this.entry)
            return;
       this.entry.classList[action]("active");
    },
    _parseInput: function (type, value, input) {
        const axis = value
            .replace(/,/g, ".")
            .split(":")
            .map(input);

        const transProps = this.options.transformIcon
        transProps[type] = axis;
        this.iconRef.style.transform = Object.entries(transProps)
            .map(([key, value]) =>
                `${key}(${value.length === 1 ? value[0] : value.join(", ")})`)
            .join(" ");
    }
});

class MapHandeler {
    #atlas = null;
    constructor() {
        /*>---------- [ Map Initialization ] ----------<*/
        this.#atlas = new L.Atlas(document.getElementsByTagName("main")[0], {
            crs: L.CRS.Simple,
            zoomSnap: 0.5,
            zoomDelta: 0.5,
            maxBoundsViscosity: 1.0,
        }).setView([0, 0], 0);

        /*>---------- [ Sidebar Initialization ] ----------<*/
        const sidebar = new L.Control.Sidebar({
            position: "sideleft",
            closeButton: false,
            autopan: true
        }).addTo(this.#atlas);

        new L.Control.Sidebar.InfoEntry({
            title: "Map Information"
        }).addTo(sidebar);
        new L.Control.Sidebar.MarkerListEntry({
            title: "Marker Index"
        }).addTo(sidebar);

        /*>---------- [ SearchBtn Initialization ] ----------<*/
        L.control.search({
            position: "sideleft_upper",
            autoCollapse: true
        }).addTo(this.#atlas);

        /*>---------- [ DeleteBtn Initialization ] ----------<*/
        if (isHost) {
            const delMapPopup = new PopupHandler("delMapPopup", false);
            new L.Control.MapBtn({
                position: "bottomright",
                className: "delMap",
                innerMsg: "Delete Map",
                action: () => delMapPopup.reveal()
            }).addTo(this.#atlas);

            /*>---------- [ DeleteBtn Initialization ] ----------<*/
            this.#atlas.pm.addControls({
                position: "topleft"
            });
        }

        /*>---------- [ Zoom Initialization ] ----------<*/
        new L.Control.Zoom({
            position: "topright"
        }).addTo(this.#atlas);
    }

    async deleteMapLayer() {

    }
}