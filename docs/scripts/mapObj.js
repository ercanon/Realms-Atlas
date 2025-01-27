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
    getCornerContainer: function () {
        return this._controlContainer;
    }
});
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
        let container = this._container ||
        (typeof this.options.container === "string" ? L.DomUtil.get(this.options.container) : this.options.container);

        if (!container) {
            container = L.DomUtil.create("div", "leaflet-sidebar");
            if (typeof this.options.container === "string") 
                container.id = this.options.container;
        }

        const tabContainers = container.querySelectorAll("nav.leaflet-sidebar-tabs, div.leaflet-sidebar-tabs > nav");
        this._tabContainerTop = tabContainers[0] || null;
        this._tabContainerBottom = tabContainers[1] || null;

        if (!this._tabContainerTop) {
            const tabDiv = L.DomUtil.create("div", "leaflet-sidebar-tabs", container);
            tabDiv.setAttribute("role", "tablist");
            this._tabContainerTop = L.DomUtil.create("nav", "", tabDiv);
        }
        if (!this._tabContainerBottom) 
            this._tabContainerBottom = L.DomUtil.create("nav", "", this._tabContainerTop.parentNode);

        this._panelContainer = container.querySelector("div.leaflet-sidebar-content") ||
            L.DomUtil.create("div", "leaflet-sidebar-content collapsed", container);

        const panelList = Object.fromEntries([...this._panelContainer.children]
            .filter((panel) => panel.tagName === "div" && L.DomUtil.hasClass(panel, "leaflet-sidebar-panel"))
            .map((panel) => [panel.id, panel])
        );
        [...this._tabContainerTop.children, ...this._tabContainerBottom.children].forEach((tab) => {
            if (panelList[tab.hash.slice(1)]) 
                this._entries.push(panelList)
        });

        return container;
    },
    onRemove: function () {
        this._entries.forEach((item) =>
            item.remove());

        this._entries = [];
        return this;
    },
    addTo: function (map) {
        this.onRemove();
        this._map = map;
        this._container = this.onAdd();
        const position = this.getPosition();

        L.DomUtil.addClass(this._container, "leaflet-control");
        L.DomUtil.addClass(this._container, `leaflet-sidebar-${position}`);
        if (L.Browser.touch)
            L.DomUtil.addClass(this._container, "leaflet-touch");

        L.DomEvent.disableScrollPropagation(this._container);
        L.DomEvent.disableClickPropagation(this._container);
        L.DomEvent.on(this._container, "contextmenu", L.DomEvent.stopPropagation);

        const sideControl = L.DomUtil.create("div", `leaflet-${position}`, map.getCornerContainer());
        const cornerList = map.getCornerList();
        Object.entries(cornerList).forEach(([posKey, corner]) => {
            if (posKey.includes(position)) {
                sideControl.innerHTML += corner.innerHTML;
                delete cornerList[posKey];
                corner.remove();
            }
        });
        cornerList[position] = sideControl;

        sideControl.appendChild(this._container);
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
        const { id, panel, actionBtn } = options;
        let title = options.title;

        if (actionBtn) {
            this.options.actionBtn = actionBtn.map((action) => {
                if (typeof this[action] === "function")
                    return this[action];
                else if (typeof action === "function")
                    return action;
                return null;
            }).filter((action) => action !== null);
        }

        if (title) {
            if (title[0] === "<")
                this.options.title = title = title.slice(1);
            if (!id)
                this.options.id = `${title.replace(/ /g, "_")}-panel`
        }
        this._panel = panel instanceof HTMLElement ? panel : L.DomUtil.create("div", "leaflet-sidebar-panel");
        this._panel.id = id;

        return this;
    },
    addTo: function (sidebar) {
        const { id, title, tabIcon, iconBtn, actionBtn, position, disabled } = this.options;
        if (sidebar.getEntry(id))
            throw new Error(`Panel with ID "${id}" already exist.`);

        this._sidebar = sidebar;
        sidebar.addEntry(this);
        this._panelContainer = sidebar.getContainer("panel");
        this._panelContainer.appendChild(this._panel);

        this._tab = L.DomUtil.create("a", disabled ? "disabled" : "", sidebar.getContainer(position));
        Object.assign(this._tab, {
            innerHTML: tabIcon,
            href: `#${id}`,
            role: "tablist",
            title
        });
        this._tabClick("on");

        if (title) {
            let header = "";
            if (typeof iconBtn === "string")
                header = `<span class="leaflet-sidebar-close">${iconBtn}</span>`;
            header = `<h1 class="leaflet-sidebar-header">${title + header}</h1>`;

            this._panel.insertAdjacentHTML("afterbegin", header);
        }

        const headerBtnList = Array.from(this._panel.querySelectorAll(".leaflet-sidebar-close"));
        if (headerBtnList.length) {
            this.headerBtn = headerBtnList.at(-1);
            this._closeClick("on", actionBtn);
        }

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
        this.close();

        this._tabClick("off");
        this._tab.remove();

        this._closeClick("off");
        this._panel.remove();

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
    _closeClick: function (action) {
        const actionArray = this.options.actionBtn;
        if (Array.isArray(actionArray) && actionArray.length) {
            actionArray.forEach((actionPanel) =>
                L.DomEvent[action](this.headerBtn, "click", actionPanel, this));
        }
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
        const main = document.getElementsByTagName("main")[0];
        /*>---------- [ Map Initialization ] ----------<*/
        this.#atlas = new L.Atlas(L.DomUtil.create("span", "", main), {
            crs: L.CRS.Simple,
            zoomSnap: 0.5,
            zoomDelta: 0.5,
            maxBoundsViscosity: 1.0,
        }).setView([0, 0], 0);

        /*>---------- [ SearchBtn Initialization ] ----------<*/
        L.control.search({
            position: "topleft",
            autoCollapse: true
        }).addTo(this.#atlas);

        /*>---------- [ Sidebar Initialization ] ----------<*/
        const sidebar = new L.Control.Sidebar({
            position: "left",
            closeButton: false,
            autopan: true,
            defaultBtn: false
        }).addTo(this.#atlas);

        new L.Control.EntrySidebar({
            title: "Token Information",
            tabIcon: `<iconify-icon icon="material-symbols:add-location" noobserver></iconify-icon>`,
            iconBtn: `<iconify-icon icon="material-symbols:close-rounded" noobserver></iconify-icon>`,
            actionBtn: ["remove"]
        }).addTo(sidebar);
        new L.Control.EntrySidebar({
            title: "Information",
            tabIcon: `<iconify-icon icon="material-symbols:add-location" noobserver></iconify-icon>`,
            iconBtn: `<iconify-icon icon="material-symbols:close-rounded" noobserver></iconify-icon>`,
            actionBtn: ["remove"]
        }).addTo(sidebar);


        /*>---------- [ DeleteBtn Initialization ] ----------<*/
        if (isHost) {
            const delMapPopup = new PopupHandler("delMapPopup", false);
            new L.Control.MapBtn({
                position: "bottomright",
                className: "delMap",
                innerMsg: "Delete Map",
                action: () => delMapPopup.reveal()
            }).addTo(this.#atlas);
        }

        /*>---------- [ Zoom Initialization ] ----------<*/
        new L.Control.Zoom({
            position: "topright"
        }).addTo(this.#atlas);
    }

    async deleteMapLayer() {

    }
}