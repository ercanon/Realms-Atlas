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
        const topContent = this._topContent = createElement(["content", "top", this._container, "span"]);
        const bottomContent = this._bottomContent = createElement(["content", "bottom", this._container, "span"]);

        [["side", "top", topContent, "div"],     ["side", "bottom", bottomContent, "div"],
         ["left", "top", topContent, "div"],     ["left", "bottom", bottomContent, "div"],
         ["right", "top", topContent, "div"],    ["right", "bottom", bottomContent, "div"],
         ["side", "left", leftContent, "div"],   ["side", "right", rightContent, "div"],
         ["top", "left", leftContent, "div"],    ["top", "right", rightContent, "div"],
         ["bottom", "left", leftContent, "div"], ["bottom", "right", rightContent, "div"]].forEach((element) =>
            createElement(element));
    },
    _clearControlPos() {
        Object.values(this._controlCorners).forEach((element) => 
            L.DomUtil.remove(element));
        delete this._controlCorners;

        L.DomUtil.remove(this._leftContent);
        L.DomUtil.remove(this._rightContent);
        delete this._leftContent;
        delete this._rightContent;
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
        if (prop instanceof L.Control.EntrySidebar)
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
L.Control.EntrySidebar = L.Control.extend({
    includes: L.Evented.prototype || L.Mixin.Events,
    options: {
        panel: null,
        id: "",
        title: "",
        tabIcon: true, //TODO
        iconBtn: true, //TODO
        actionBtn: [this.close],
        position: "top",
        disabled: false
    },
    initialize: function (options) {
        L.setOptions(this, options);

        const { id, actionBtn } = options;
        if (actionBtn) {
            this.options.actionBtn = [actionBtn].map((action) => {
                if (typeof this[action] === "function")
                    return this[action];
                return action;
            }).filter((action) => action !== null);
        }

        let title = options.title;
        if (title) {
            if (title[0] === "<")
                this.options.title = title = title.slice(1);
            if (!id)
                this.options.id = `${title.replace(/ /g, "_")}-panel`
        }

        return this;
    },
    onAdd: function () {
        const { panel, id, title, tabIcon, iconBtn, actionBtn, disabled } = this.options;

        const contentPanel = this._panel || (typeof panel === "string" ? L.DomUtil.get(panel) : panel) || L.DomUtil.create("div", "leaflet-sidebar-panel");
        if (!id && typeof panel === "string")
            contentPanel.id = panel;
        else
            contentPanel.id = id;

        if (title) {
            let header = "";
            if (typeof iconBtn === "string")
                header = `<span class="leaflet-sidebar-close">${iconBtn}</span>`;
            header = `<h1 class="leaflet-sidebar-header">${title + header}</h1>`;

            contentPanel.insertAdjacentHTML("afterbegin", header);
        }

        this._tab = L.DomUtil.create("a", disabled ? "disabled" : "");
        Object.assign(this._tab, {
            innerHTML: tabIcon,
            href: `#${id}`,
            role: "tablist",
            title
        });
        this._tabClick("on");

        const headerBtnList = Array.from(contentPanel.querySelectorAll(".leaflet-sidebar-close"));
        if (headerBtnList.length) {
            this._headerBtn = headerBtnList.at(-1);
            this._closeClick("on", actionBtn);
        }

        return contentPanel;
    },
    addTo: function (sidebar) {
        const { id, position } = this.options;
        if (sidebar.getEntry(id))
            throw new Error(`Panel with ID "${id}" already exist.`);

        this.remove();
        this._sidebar = sidebar.addEntry(this);
        this._panel = this.onAdd();

        this._panelContainer = sidebar.getContainer("panel");
        this._panelContainer.appendChild(this._panel);
        sidebar.getContainer(position).appendChild(this._tab);

        return this;
    },
    open: function () {
        if (L.DomUtil.hasClass(this._tab, "disabled"))
            return this;

        const activeEntry = this._sidebar.getEntry(".active");
        if (activeEntry) {
            [activeEntry._tab, activeEntry._panel].forEach((entry) =>
            L.DomUtil.removeClass(entry, "active"))
        }

        [this._tab, this._panel].forEach((entry) =>
            L.DomUtil.addClass(entry, "active"))
        if (L.DomUtil.hasClass(this._panelContainer, "collapsed")) {
            this.fire("opening");
            L.DomUtil.removeClass(this._panelContainer, "collapsed");
            this._sidebar.panMap("open");
        }

        this.fire("content", this.options.id);
        return this;
    },
    close: function () {
        L.DomUtil.removeClass(this._tab, "active");

        if (!L.DomUtil.hasClass(this._panelContainer, "collapsed")) {
            this.fire("closing");
            L.DomUtil.addClass(this._panelContainer, "collapsed");
            this._sidebar.panMap("close");
        }

        return this;
    },
    remove: function () {
        if (this._panelContainer) {
            L.DomUtil.addClass(this._panelContainer, "collapsed")

            this._tabClick("off");
            this._tab?.remove();

            this._closeClick("off");
            this._panel?.remove();
        }

        return this;
    },
    enable: function () {
        L.DomUtil.removeClass(this._tab, "disabled");
        return this;
    },
    disable: function () {
        L.DomUtil.addClass(this._tab, "disabled");
        return this;
    },
    //changeIdPanel: function (newId) {

    //},
    onTabClick: function () {
        if (L.DomUtil.hasClass(this._tab, "active"))
            this.close();
        else if (!L.DomUtil.hasClass(this._tab, "disabled"))
            this.open();
    },
    _tabClick: function (action) {
        const tab = this._tab;
        if (tab.hasAttribute("href") && tab.getAttribute("href")[0] === "#")
            L.DomEvent[action](tab, "click", L.DomEvent.preventDefault, this)
                      [action](tab, "click", this.onTabClick, this);
    },
    _closeClick: function (actionClick) {
        const {actionBtn} = this.options;
        if (actionBtn)
            actionBtn.forEach((action) =>
                L.DomEvent[actionClick](this._headerBtn, "click", action, this));
    }
});

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

        new L.Control.EntrySidebar({
            title: "Token Information",
            tabIcon: `<iconify-icon icon="material-symbols:add-location" noobserver></iconify-icon>`,
            iconBtn: `<iconify-icon icon="material-symbols:close-rounded" noobserver></iconify-icon>`,
            actionBtn: "remove"
        }).addTo(sidebar);
        new L.Control.EntrySidebar({
            title: "Information",
            tabIcon: `<iconify-icon icon="material-symbols:add-location" noobserver></iconify-icon>`,
            iconBtn: `<iconify-icon icon="material-symbols:close-rounded" noobserver></iconify-icon>`,
            actionBtn: "remove"
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
                position: "topleft",
                drawMarker: true,
                drawPolygon: true,
                drawPolyline: true,
                drawCircle: true,
                editMode: true,
                dragMode: true,
                cutPolygon: true,
                removalMode: true,
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