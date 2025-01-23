L.Atlas = L.Map.extend({
    options: {
        zoomControl: false,
        attributionControl: false,
        controls: []
    },
    initialize: function (id, options) {
        this._mapLayers = {};

        L.Map.prototype.initialize.call(this, id, options);

        this.options.controls.forEach((control) => this.addControl(control));
    }
});
L.Control.Sidebar = L.Control.extend({
    includes: L.Evented.prototype || L.Mixin.Events,
    options: {
        autopan: false,
        closeButton: true,
        container: null,
        position: "left"
    },
    initialize: function (t, e) {
        if (typeof t === "string") {
            console.warn("This syntax is deprecated. Please use L.control.sidebar({ container }) now.");
            t = { container: t };
        }
        if (typeof t === "object" && t.id) {
            console.warn("This syntax is deprecated. Please use L.control.sidebar({ container }) now.");
            t.container = t.id;
        }
        this._tabitems = [];
        this._panes = [];
        this._closeButtons = [];
        L.setOptions(this, t);
        L.setOptions(this, e);
        return this;
    },
    onAdd: function (map) {
        let container = this._container ||
            (typeof this.options.container === "string" ? L.DomUtil.get(this.options.container) : this.options.container);

        if (!container) {
            container = L.DomUtil.create("div", "leaflet-sidebar collapsed");
            if (typeof this.options.container === "string") {
                container.id = this.options.container;
            }
        }

        this._paneContainer = container.querySelector("div.leaflet-sidebar-content") ||
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
            this._tabitems.push(tab);
        });

        [...this._tabContainerBottom.children].forEach((tab) => {
            tab._sidebar = this;
            tab._id = tab.querySelector("a").hash.slice(1);
            this._tabitems.push(tab);
        });

        [...this._paneContainer.children].forEach((pane) => {
            if (pane.tagName === "DIV" && L.DomUtil.hasClass(pane, "leaflet-sidebar-pane")) {
                this._panes.push(pane);
                const closeButtons = pane.querySelectorAll(".leaflet-sidebar-close");
                if (closeButtons.length) {
                    const closeButton = closeButtons[closeButtons.length - 1];
                    this._closeButtons.push(closeButton);
                    this._closeClick(closeButton, "on");
                }
            }
        });

        this._tabitems.forEach((tab) => this._tabClick(tab, "on"));
        return container;
    },
    onRemove: function () {
        this._tabitems.forEach((tab) => this._tabClick(tab, "off"));
        this._closeButtons.forEach((button) => this._closeClick(button, "off"));

        this._tabitems = [];
        this._panes = [];
        this._closeButtons = [];
        return this;
    },
    addTo: function (map) {
        this.onRemove();
        this._map = map;
        this._container = this.onAdd(map);

        L.DomUtil.addClass(this._container, "leaflet-control");
        L.DomUtil.addClass(this._container, `leaflet-sidebar-${this.getPosition()}`);
        if (L.Browser.touch) {
            L.DomUtil.addClass(this._container, "leaflet-touch");
        }

        L.DomEvent.disableScrollPropagation(this._container);
        L.DomEvent.disableClickPropagation(this._container);
        L.DomEvent.on(this._container, "contextmenu", L.DomEvent.stopPropagation);

        map._container.insertBefore(this._container, map._container.firstChild);
        return this;
    },
    remove: function () {
        if (this._map) {
            this._map._container.removeChild(this._container);
        }
        this.onRemove();
        this._map = null;
        return this;
    },
    open: function (id) {
        const tab = this._getTab(id);
        if (L.DomUtil.hasClass(tab, "disabled")) return this;

        this._panes.forEach((pane) => {
            if (pane.id === id) {
                L.DomUtil.addClass(pane, "active");
            } else {
                L.DomUtil.removeClass(pane, "active");
            }
        });

        this._tabitems.forEach((item) => {
            const link = item.querySelector("a");
            if (link.hash === `#${id}`) {
                L.DomUtil.addClass(item, "active");
            } else {
                L.DomUtil.removeClass(item, "active");
            }
        });

        if (L.DomUtil.hasClass(this._container, "collapsed")) {
            this.fire("opening");
            L.DomUtil.removeClass(this._container, "collapsed");
            if (this.options.autopan) this._panMap("open");
        }

        this.fire("content", { id });
        return this;
    },
    close: function () {
        this._tabitems.forEach((item) => L.DomUtil.removeClass(item, "active"));

        if (!L.DomUtil.hasClass(this._container, "collapsed")) {
            this.fire("closing");
            L.DomUtil.addClass(this._container, "collapsed");
            if (this.options.autopan) this._panMap("close");
        }

        return this;
    },
    _tabClick: function (tab, action) {
        const link = tab.querySelector("a");
        if (link.hasAttribute("href") && link.getAttribute("href")[0] === "#") {
            if (action === "on") {
                L.DomEvent.on(link, "click", L.DomEvent.preventDefault, tab)
                    .on(link, "click", this.onTabClick, tab);
            } else {
                L.DomEvent.off(link, "click", this.onTabClick, tab);
            }
        }
    },
    _getTab: function (id) {
        const tab = this._tabitems.find((item) => item._id === id);
        if (!tab) throw new Error(`Tab "${id}" not found`);
        return tab;
    },
    _panMap: function (action) {
        const offset = parseInt(L.DomUtil.getStyle(this._container, "max-width"), 10) / 2;
        const panOffset = action === "open" && this.options.position === "left" || action === "close" && this.options.position === "right" ? offset : -offset;
        this._map.panBy([panOffset, 0], { duration: 0.5 });
    },
    onTabClick: function (event) {
        const link = event.currentTarget;
        const tabId = link.hash.slice(1);
        const tab = this._getTab(tabId);
        if (L.DomUtil.hasClass(tab, "active")) {
            this.close();
        } else if (!L.DomUtil.hasClass(tab, "disabled")) {
            this.open(tabId);
        }
    },
    _closeClick: function (button, action) {
        if (action === "on") {
            L.DomEvent.on(button, "click", this.close, this);
        } else {
            L.DomEvent.off(button, "click", this.close);
        }
    }
})

L.Control.MapBtn = L.Control.extend({
    options: {
        classList: null,
        innerMsg: null,
        funcExec: null
    },
    onAdd: function () {
        const { classList, innerMsg, funcExec } = this.options;
        const button = L.DomUtil.create("button", classList );
        button.innerHTML = innerMsg;
        button.onclick = funcExec;
        return button;
    }
});
class MapHandeler {
    static #map = null;
    constructor() {
        /*>---------- [ Map Initialization ] ----------<*/
        const main = document.getElementsByTagName("main")[0];
        MapHandeler.#map = new L.Atlas(
            main.appendChild(document.createElement("span")), {
            crs: L.CRS.Simple,
            zoomSnap: 0.5,
            zoomDelta: 0.5,
            maxBoundsViscosity: 1.0,
            controls: [
                new L.Control.Sidebar({
                    position: "left",
                    closeButton: false,
                    autopan: true
                }),
                new L.Control.Zoom({
                    position: "topright"
                }),
                isHost ?
                new L.Control.MapBtn({
                    position: "bottomright",
                    classList: "deleteMap",
                    innerMsg: "Delete Map",
                    funcExec: () => {
                        //this.#delLayerPop.setState("remove");
                    }
                }) : undefined
            ]
        }).setView([0, 0], 0);
    }
}