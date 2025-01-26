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
        defaultBtn: true,
        position: "left"
    },

    initialize: function (options) {
        this._tabs = [];
        this._panels = [];
        this._bannerBtns = [];
        L.setOptions(this, options);
        return this;
    },
    onAdd: function () {
        let container = this._container ||
            (typeof this.options.container === "string" ? L.DomUtil.get(this.options.container) : this.options.container);

        if (!container) {
            container = L.DomUtil.create("div", "leaflet-sidebar collapsed");
            if (typeof this.options.container === "string") 
                container.id = this.options.container;
        }

        this._panelContainer = container.querySelector("div.leaflet-sidebar-content") ||
            L.DomUtil.create("div", "leaflet-sidebar-content", container);

        const tabContainers = container.querySelectorAll("ul.leaflet-sidebar-tabs, div.leaflet-sidebar-tabs > ul");
        this._tabContainerTop = tabContainers[0] || null;
        this._tabContainerBottom = tabContainers[1] || null;

        if (!this._tabContainerTop) {
            const tabDiv = L.DomUtil.create("div", "leaflet-sidebar-tabs", container);
            tabDiv.setAttribute("role", "tablist");
            this._tabContainerTop = L.DomUtil.create("ul", "", tabDiv);
        }
        if (!this._tabContainerBottom) {
            const parentDiv = this._tabContainerTop.parentNode;
            this._tabContainerBottom = L.DomUtil.create("ul", "", parentDiv);
        }

        [...this._tabContainerTop.children].forEach((tab) => {
            tab._sidebar = this;
            tab._id = tab.querySelector("a").hash.slice(1);
            this._tabs.push(tab);
        });

        [...this._tabContainerBottom.children].forEach((tab) => {
            tab._sidebar = this;
            tab._id = tab.querySelector("a").hash.slice(1);
            this._tabs.push(tab);
        });

        [...this._panelContainer.children].forEach((panel) => {
            if (panel.tagName === "div" && L.DomUtil.hasClass(panel, "leaflet-sidebar-panel")) {
                this._panels.push(panel);
                const bannerBtns = panel.querySelectorAll(".leaflet-sidebar-close");
                if (bannerBtns.length) {
                    const btn = Array.from(bannerBtns.at(-1));
                    btn._id = panel.id;
                    this._bannerBtns.push(btn);
                    this._closeClick(btn, "on");
                }
            }
        });

        this._tabs.forEach((tab) => this._tabClick(tab, "on"));
        return container;
    },
    onRemove: function () {
        this._tabs.forEach((tab) =>
            this._tabClick(tab, "off"));
        this._bannerBtns.forEach((button) =>
            this._closeClick(button, "off"));

        this._tabs = [];
        this._panels = [];
        this._bannerBtns = [];
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
            this.removePanel(id);
        else {
            this._map?._container.removeChild(this._container);
            this.onRemove();
            this._map = null;
        }

        return this;
    },
    open: function (id) {
        const tab = this._getElement(id, this._tabs);
        if (L.DomUtil.hasClass(tab, "disabled"))
            return this;

        this._panels.forEach((panel) => {
            if (panel.id === id)
                L.DomUtil.addClass(panel, "active");
            else 
                L.DomUtil.removeClass(panel, "active");
        });

        this._tabs.forEach((item) => {
            const link = item.querySelector("a");
            if (link.hash === `#${id}`) 
                L.DomUtil.addClass(item, "active");
            else 
                L.DomUtil.removeClass(item, "active");
        });

        if (L.DomUtil.hasClass(this._container, "collapsed")) {
            this.fire("opening");
            L.DomUtil.removeClass(this._container, "collapsed");
            if (this.options.autopan)
                this._panMap("open");
        }

        this.fire("content", { id });
        return this;
    },
    close: function (id) {
        const tab = this._getElement(id, this._tabs);
        if (tab)
            L.DomUtil.removeClass(tab, "active");

        if (!L.DomUtil.hasClass(this._container, "collapsed")) {
            this.fire("closing");
            L.DomUtil.addClass(this._container, "collapsed");
            if (this.options.autopan)
                this._panMap("close");
        }

        return this;
    },

    addPanel: function ({ id, title, tabIcon, iconBtn, actionBtn, disabled, panel, position = "top" }) {
        id = id || `${title?.replace(/ /g, "_")}-panel`
        if (this._getElement(id, this._tabs))
            throw new Error(`Panel con ID "${id}" ya existe.`);

        const tabItem = L.DomUtil.create("li", disabled ? "disabled" : "", position === "top" ? this._tabContainerTop : this._tabContainerBottom);
        tabItem.innerHTML = `<a href="#${id}" role="tab">${tabIcon}</a>`;
        tabItem._id = id;
        tabItem._sidebar = this;
        if (title && title[0] !== "<")
            tabItem.title = title;

        this._tabClick(tabItem, "on");
        this._tabs.push(tabItem);

        if (!(panel instanceof HTMLElement))
            panel = L.DomUtil.create("div", "leaflet-sidebar-panel", this._panelContainer);
        if (title) {
            iconBtn = iconBtn || this.options.defaultBtn;
            let banner = "";
            if (typeof iconBtn === "string")
                banner = `<span class="leaflet-sidebar-close">${iconBtn}</span>`;
            if (title)
                banner = `<h1 class="leaflet-sidebar-header">${title + banner}</h1>`;

            panel.insertAdjacentHTML("afterbegin", banner);
        }

        this._panelContainer.appendChild(panel);
        panel.id = id;
        this._panels.push(panel);

        const bannerBtns = Array.from(panel.querySelectorAll(".leaflet-sidebar-close"));
        if (bannerBtns.length) {
            const btn = bannerBtns.at(-1);
            btn._id = id;
            const dataBtn = { btn, actions: actionBtn };
            this._bannerBtns.push(dataBtn);
            this._closeClick(dataBtn, "on", actionBtn);
        }

        return panel;
    },
    removePanel: function (id) {
        const tab = this._getElement(id, this._tabs);
        if (tab) {
            id = tab._id;
            L.DomEvent.off(tab.querySelector("a"), "click", this.onTabClick, tab);
            tab.remove();
            delete this._tabs[id];
        }

        const panel = this._getElement(id, this._panels);
        if (panel) {
            panel.remove();
            delete this._panels[id];
        }

        return this;
    },
    enablePanel: function (id) {
        const tab = this._getElement(id, this._tabs);
        L.DomUtil.removeClass(tab, "disabled");
        return this;
    },
    disablePanel: function (id) {
        const tab = this._getElement(id, this._tabs);
        L.DomUtil.addClass(tab, "disabled");
        return this;
    },
    //changeIdPanel: function (newId) {

    //},
    onTabClick: function (event) {
        const tabId = event.currentTarget.hash.slice(1);
        if (L.DomUtil.hasClass(this, "active"))
            this._sidebar.close(tabId);
        else if (!L.DomUtil.hasClass(this, "disabled"))
            this._sidebar.open(tabId);
    },
    _tabClick: function (tab, action) {
        const link = tab.querySelector("a");
        if (link.hasAttribute("href") && link.getAttribute("href")[0] === "#")
            L.DomEvent[action](link, "click", L.DomEvent.preventDefault, tab)
                      [action](link, "click", this.onTabClick, tab);
    },
    _closeClick: function ({ btn, actions = [this.close] }, action) {
        if (Array.isArray(actions) && actions.length)
            actions.forEach((f) => L.DomEvent[action](btn, "click", f, this));
    },
    _getElement: function (id, list) {
        if (id instanceof HTMLElement)
            id = id.id;
        else if (id instanceof PointerEvent)
            id = id.currentTarget._id;

        return list.find((item) => item._id === id);
    },
    _panMap: function (action) {
        const offset = parseInt(L.DomUtil.getStyle(this._container, "max-width"), 10) / 2;
        const panOffset = action === "open" && this.options.position === "left" || action === "close" && this.options.position === "right" ? offset : -offset;
        this._map.panBy([panOffset, 0], { duration: 0.5 });
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

        sidebar.addPanel({
            title: "Token Information",
            tabIcon: `<i class="fa-solid fa-location-pin"></i>`,
            iconBtn: `<i class="fa-solid fa-xmark"></i>`,
            actionBtn: [sidebar.close, sidebar.removePanel]
        });
        sidebar.addPanel({
            title: "Information",
            tabIcon: `<i class="fa-solid fa-location-pin"></i>`,
            iconBtn: `<i class="fa-solid fa-xmark"></i>`,
            actionBtn: [sidebar.close, sidebar.removePanel]
        });


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