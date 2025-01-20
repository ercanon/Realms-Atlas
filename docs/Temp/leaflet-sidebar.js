L.Control.Sidebar = L.Control.extend({
    includes: L.Evented ? L.Evented.prototype : L.Mixin.Events,
    options: {
        autopan: !1,
        closeButton: !0,
        container: null,
        position: "left"
    },
    initialize: function (t, e) {
        return "string" == typeof t && (console.warn("this syntax is deprecated. please use L.control.sidebar({ container }) now"), t = {
            container: t
        }), "object" == typeof t && t.id && (console.warn("this syntax is deprecated. please use L.control.sidebar({ container }) now"), t.container = t.id), this._tabitems = [], this._panes = [], this._closeButtons = [], L.setOptions(this, t), L.setOptions(this, e), this
    },
    onAdd: function (t) {
        var e, i, s, o, n;
        for ((n = (n = this._container) || (this._container || "string" == typeof this.options.container ? L.DomUtil.get(this.options.container) : this.options.container)) || (n = L.DomUtil.create("div", "leaflet-sidebar collapsed"), "string" == typeof this.options.container && (n.id = this.options.container)), this._paneContainer = n.querySelector("div.leaflet-sidebar-content"), null === this._paneContainer && (this._paneContainer = L.DomUtil.create("div", "leaflet-sidebar-content", n)), s = n.querySelectorAll("ul.leaflet-sidebar-tabs, div.leaflet-sidebar-tabs > ul"), this._tabContainerTop = s[0] || null, this._tabContainerBottom = s[1] || null, null === this._tabContainerTop && ((o = L.DomUtil.create("div", "leaflet-sidebar-tabs", n)).setAttribute("role", "tablist"), this._tabContainerTop = L.DomUtil.create("ul", "", o)), null === this._tabContainerBottom && (o = this._tabContainerTop.parentNode, this._tabContainerBottom = L.DomUtil.create("ul", "", o)), e = 0; e < this._tabContainerTop.children.length; e++)(i = this._tabContainerTop.children[e])._sidebar = this, i._id = i.querySelector("a").hash.slice(1), this._tabitems.push(i);
        for (e = 0; e < this._tabContainerBottom.children.length; e++)(i = this._tabContainerBottom.children[e])._sidebar = this, i._id = i.querySelector("a").hash.slice(1), this._tabitems.push(i);
        for (e = 0; e < this._paneContainer.children.length; e++)
            if ("DIV" === (i = this._paneContainer.children[e]).tagName && L.DomUtil.hasClass(i, "leaflet-sidebar-pane")) {
                this._panes.push(i);
                var a = i.querySelectorAll(".leaflet-sidebar-close");
                a.length && (this._closeButtons.push(a[a.length - 1]), this._closeClick(a[a.length - 1], "on"))
            } for (e = 0; e < this._tabitems.length; e++) this._tabClick(this._tabitems[e], "on");
        return n
    },
    onRemove: function (t) {
        for (var e = 0; e < this._tabitems.length; e++) this._tabClick(this._tabitems[e], "off");
        for (e = 0; e < this._closeButtons.length; e++) this._closeClick(this._closeButtons[e], "off");
        return this._tabitems = [], this._panes = [], this._closeButtons = [], this
    },
    addTo: function (t) {
        return this.onRemove(), this._map = t, this._container = this.onAdd(t), L.DomUtil.addClass(this._container, "leaflet-control"), L.DomUtil.addClass(this._container, "leaflet-sidebar-" + this.getPosition()), L.Browser.touch && L.DomUtil.addClass(this._container, "leaflet-touch"), L.DomEvent.disableScrollPropagation(this._container), L.DomEvent.disableClickPropagation(this._container), L.DomEvent.on(this._container, "contextmenu", L.DomEvent.stopPropagation), t._container.insertBefore(this._container, t._container.firstChild), this
    },
    removeFrom: function (t) {
        return console.warn("removeFrom() has been deprecated, please use remove() instead as support for this function will be ending soon."), this._map._container.removeChild(this._container), this.onRemove(t), this
    },
    open: function (t) {
        var e, i, s;
        if (s = this._getTab(t), L.DomUtil.hasClass(s, "disabled")) return this;
        for (e = 0; e < this._panes.length; e++)(i = this._panes[e]).id === t ? L.DomUtil.addClass(i, "active") : L.DomUtil.hasClass(i, "active") && L.DomUtil.removeClass(i, "active");
        for (e = 0; e < this._tabitems.length; e++)(i = this._tabitems[e]).querySelector("a").hash === "#" + t ? L.DomUtil.addClass(i, "active") : L.DomUtil.hasClass(i, "active") && L.DomUtil.removeClass(i, "active");
        return this.fire("content", {
            id: t
        }), L.DomUtil.hasClass(this._container, "collapsed") && (this.fire("opening"), L.DomUtil.removeClass(this._container, "collapsed"), this.options.autopan && this._panMap("open")), this
    },
    close: function () {
        var t;
        for (t = 0; t < this._tabitems.length; t++) {
            var e = this._tabitems[t];
            L.DomUtil.hasClass(e, "active") && L.DomUtil.removeClass(e, "active")
        }
        return L.DomUtil.hasClass(this._container, "collapsed") || (this.fire("closing"), L.DomUtil.addClass(this._container, "collapsed"), this.options.autopan && this._panMap("close")), this
    },
    addPanel: function (t) {
        var e, i, s, o, n;
        return i = L.DomUtil.create("li", t.disabled ? "disabled" : ""), (s = L.DomUtil.create("a", "", i)).href = "#" + t.id, s.setAttribute("role", "tab"), s.innerHTML = t.tab, i._sidebar = this, i._id = t.id, i._button = t.button, t.title && "<" !== t.title[0] && (i.title = t.title), "bottom" === t.position ? this._tabContainerBottom.appendChild(i) : this._tabContainerTop.appendChild(i), this._tabitems.push(i), t.pane && ("string" == typeof t.pane ? (e = L.DomUtil.create("DIV", "leaflet-sidebar-pane", this._paneContainer), n = "", t.title && (n += '<h1 class="leaflet-sidebar-header">' + t.title), this.options.closeButton && (n += '<span class="leaflet-sidebar-close"><i class="fa fa-caret-' + this.options.position + '"></i></span>'), t.title && (n += "</h1>"), e.innerHTML = n + t.pane) : (e = t.pane, this._paneContainer.appendChild(e)), e.id = t.id, this._panes.push(e), (o = e.querySelectorAll(".leaflet-sidebar-close")).length && (this._closeButtons.push(o[o.length - 1]), this._closeClick(o[o.length - 1], "on"))), this._tabClick(i, "on"), this
    },
    removePanel: function (t) {
        var e, i, s, o, n;
        for (e = 0; e < this._tabitems.length; e++)
            if (this._tabitems[e]._id === t) {
                s = this._tabitems[e], this._tabClick(s, "off"), s.remove(), this._tabitems.splice(e, 1);
                break
            } for (e = 0; e < this._panes.length; e++)
            if (this._panes[e].id === t) {
                for (n = (o = this._panes[e]).querySelectorAll(".leaflet-sidebar-close"), i = 0; i < n.length; i++) this._closeClick(n[i], "off");
                o.remove(), this._panes.splice(e, 1);
                break
            } return this
    },
    enablePanel: function (t) {
        var e = this._getTab(t);
        return L.DomUtil.removeClass(e, "disabled"), this
    },
    disablePanel: function (t) {
        var e = this._getTab(t);
        return L.DomUtil.addClass(e, "disabled"), this
    },
    onTabClick: function (t) {
        L.DomUtil.hasClass(this, "active") ? this._sidebar.close() : L.DomUtil.hasClass(this, "disabled") || ("string" == typeof this._button ? window.location.href = this._button : "function" == typeof this._button ? this._button(t) : this._sidebar.open(this.querySelector("a").hash.slice(1)))
    },
    _tabClick: function (t, e) {
        var i = t.querySelector("a");
        i.hasAttribute("href") && "#" === i.getAttribute("href")[0] && ("on" === e ? L.DomEvent.on(t.querySelector("a"), "click", L.DomEvent.preventDefault, t).on(t.querySelector("a"), "click", this.onTabClick, t) : L.DomEvent.off(t.querySelector("a"), "click", this.onTabClick, t))
    },
    onCloseClick: function () {
        this.close()
    },
    _closeClick: function (t, e) {
        "on" === e ? L.DomEvent.on(t, "click", this.onCloseClick, this) : L.DomEvent.off(t, "click", this.onCloseClick)
    },
    _getTab: function (t) {
        for (var e = 0; e < this._tabitems.length; e++)
            if (this._tabitems[e]._id === t) return this._tabitems[e];
        throw Error('tab "' + t + '" not found')
    },
    _panMap: function (t) {
        var e = Number.parseInt(L.DomUtil.getStyle(this._container, "max-width")) / 2;
        ("open" === t && "left" === this.options.position || "close" === t && "right" === this.options.position) && (e *= -1), this._map.panBy([e, 0], {
            duration: .5
        })
    }
}), L.control.sidebar = function (t, e) {
    return new L.Control.Sidebar(t, e)
};