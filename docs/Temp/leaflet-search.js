/**
 * Minified by jsDelivr using Terser v5.19.2.
 * Original file: /npm/leaflet-search@4.0.0/dist/leaflet-search.src.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
! function (t) {
    if ("function" == typeof define && define.amd) define(["leaflet"], t);
    else if ("undefined" != typeof module) module.exports = t(require("leaflet"));
    else {
        if (void 0 === window.L) throw "Leaflet must be loaded first";
        t(window.L)
    }
}((function (t) {
    return t.Control.Search = t.Control.extend({
        includes: "1" === t.version[0] ? t.Evented.prototype : t.Mixin.Events,
        options: {
            url: "",
            layer: null,
            sourceData: null,
            jsonpParam: null,
            propertyLoc: "loc",
            propertyName: "title",
            formatData: null,
            filterData: null,
            moveToLocation: null,
            buildTip: null,
            container: "",
            zoom: null,
            minLength: 1,
            initial: !0,
            casesensitive: !1,
            autoType: !0,
            delayType: 400,
            tooltipLimit: -1,
            tipAutoSubmit: !0,
            firstTipSubmit: !1,
            autoResize: !0,
            collapsed: !0,
            autoCollapse: !1,
            autoCollapseTime: 1200,
            textErr: "Location not found",
            textCancel: "Cancel",
            textPlaceholder: "Search...",
            hideMarkerOnCollapse: !1,
            position: "topleft",
            marker: {
                icon: !1,
                animate: !0,
                circle: {
                    radius: 10,
                    weight: 3,
                    color: "#e03",
                    stroke: !0,
                    fill: !1
                }
            }
        },
        _getPath: function (t, e) {
            var i = e.split("."),
                o = i.pop(),
                s = i.length,
                n = i[0],
                r = 1;
            if (s > 0)
                for (;
                    (t = t[n]) && r < s;) n = i[r++];
            if (t) return t[o]
        },
        _isObject: function (t) {
            return "[object Object]" === Object.prototype.toString.call(t)
        },
        initialize: function (e) {
            t.Util.setOptions(this, e || {}), this._inputMinSize = this.options.textPlaceholder ? this.options.textPlaceholder.length : 10, this._layer = this.options.layer || new t.LayerGroup, this._filterData = this.options.filterData || this._defaultFilterData, this._formatData = this.options.formatData || this._defaultFormatData, this._moveToLocation = this.options.moveToLocation || this._defaultMoveToLocation, this._autoTypeTmp = this.options.autoType, this._countertips = 0, this._recordsCache = {}, this._curReq = null
        },
        onAdd: function (e) {
            return this._map = e, this._container = t.DomUtil.create("div", "leaflet-control-search"), this._input = this._createInput(this.options.textPlaceholder, "search-input"), this._tooltip = this._createTooltip("search-tooltip"), this._cancel = this._createCancel(this.options.textCancel, "search-cancel"), this._button = this._createButton(this.options.textPlaceholder, "search-button"), this._alert = this._createAlert("search-alert"), !1 === this.options.collapsed && this.expand(this.options.collapsed), this.options.marker && (this.options.marker instanceof t.Marker || this.options.marker instanceof t.CircleMarker ? this._markerSearch = this.options.marker : this._isObject(this.options.marker) && (this._markerSearch = new t.Control.Search.Marker([0, 0], this.options.marker)), this._markerSearch._isMarkerSearch = !0), this.setLayer(this._layer), e.on({
                resize: this._handleAutoresize
            }, this), this._container
        },
        addTo: function (e) {
            return this.options.container ? (this._container = this.onAdd(e), this._wrapper = t.DomUtil.get(this.options.container), this._wrapper.style.position = "relative", this._wrapper.appendChild(this._container)) : t.Control.prototype.addTo.call(this, e), this
        },
        onRemove: function (t) {
            this._recordsCache = {}, t.off({
                resize: this._handleAutoresize
            }, this)
        },
        setLayer: function (t) {
            return this._layer = t, this._layer.addTo(this._map), this
        },
        showAlert: function (t) {
            var e = this;
            return t = t || this.options.textErr, this._alert.style.display = "block", this._alert.innerHTML = t, clearTimeout(this.timerAlert), this.timerAlert = setTimeout((function () {
                e.hideAlert()
            }), this.options.autoCollapseTime), this
        },
        hideAlert: function () {
            return this._alert.style.display = "none", this
        },
        cancel: function () {
            return this._input.value = "", this._handleKeypress({
                keyCode: 8
            }), this._input.size = this._inputMinSize, this._input.focus(), this._cancel.style.display = "none", this._hideTooltip(), this.fire("search:cancel"), this
        },
        expand: function (e) {
            return e = "boolean" != typeof e || e, this._input.style.display = "block", t.DomUtil.addClass(this._container, "search-exp"), !1 !== e && (this._input.focus(), this._map.on("dragstart click", this.collapse, this)), this.fire("search:expanded"), this
        },
        collapse: function () {
            return this._hideTooltip(), this.cancel(), this._alert.style.display = "none", this._input.blur(), this.options.collapsed && (this._input.style.display = "none", this._cancel.style.display = "none", t.DomUtil.removeClass(this._container, "search-exp"), this.options.hideMarkerOnCollapse && this._map.removeLayer(this._markerSearch), this._map.off("dragstart click", this.collapse, this)), this.fire("search:collapsed"), this
        },
        collapseDelayed: function () {
            var t = this;
            return this.options.autoCollapse ? (clearTimeout(this.timerCollapse), this.timerCollapse = setTimeout((function () {
                t.collapse()
            }), this.options.autoCollapseTime), this) : this
        },
        collapseDelayedStop: function () {
            return clearTimeout(this.timerCollapse), this
        },
        _createAlert: function (e) {
            var i = t.DomUtil.create("div", e, this._container);
            return i.style.display = "none", t.DomEvent.on(i, "click", t.DomEvent.stop, this).on(i, "click", this.hideAlert, this), i
        },
        _createInput: function (e, i) {
            var o = this,
                s = t.DomUtil.create("label", i, this._container),
                n = t.DomUtil.create("input", i, this._container);
            return n.type = "text", n.size = this._inputMinSize, n.value = "", n.autocomplete = "off", n.autocorrect = "off", n.autocapitalize = "off", n.placeholder = e, n.style.display = "none", n.role = "search", n.id = n.role + n.type + n.size, s.htmlFor = n.id, s.style.display = "none", s.value = e, t.DomEvent.disableClickPropagation(n).on(n, "keyup", this._handleKeypress, this).on(n, "paste", (function (t) {
                setTimeout((function (t) {
                    o._handleKeypress(t)
                }), 10, t)
            }), this).on(n, "blur", this.collapseDelayed, this).on(n, "focus", this.collapseDelayedStop, this), n
        },
        _createCancel: function (e, i) {
            var o = t.DomUtil.create("a", i, this._container);
            return o.href = "#", o.title = e, o.style.display = "none", o.innerHTML = "<span>&otimes;</span>", t.DomEvent.on(o, "click", t.DomEvent.stop, this).on(o, "click", this.cancel, this), o
        },
        _createButton: function (e, i) {
            var o = t.DomUtil.create("a", i, this._container);
            return o.href = "#", o.title = e, t.DomEvent.on(o, "click", t.DomEvent.stop, this).on(o, "click", this._handleSubmit, this).on(o, "focus", this.collapseDelayedStop, this).on(o, "blur", this.collapseDelayed, this), o
        },
        _createTooltip: function (e) {
            var i = this,
                o = t.DomUtil.create("ul", e, this._container);
            return o.style.display = "none", t.DomEvent.disableClickPropagation(o).on(o, "blur", this.collapseDelayed, this).on(o, "wheel", (function (e) {
                i.collapseDelayedStop(), t.DomEvent.stopPropagation(e)
            }), this).on(o, "mouseover", (function (t) {
                i.collapseDelayedStop()
            }), this), o
        },
        _createTip: function (e, i) {
            var o;
            if (this.options.buildTip) {
                if ("string" == typeof (o = this.options.buildTip.call(this, e, i))) {
                    var s = t.DomUtil.create("div");
                    s.innerHTML = o, o = s.firstChild
                }
            } else (o = t.DomUtil.create("li", "")).innerHTML = e;
            return t.DomUtil.addClass(o, "search-tip"), o._text = e, this.options.tipAutoSubmit && t.DomEvent.disableClickPropagation(o).on(o, "click", t.DomEvent.stop, this).on(o, "click", (function (t) {
                this._input.value = e, this._handleAutoresize(), this._input.focus(), this._hideTooltip(), this._handleSubmit()
            }), this), o
        },
        _getUrl: function (t) {
            return "function" == typeof this.options.url ? this.options.url(t) : this.options.url
        },
        _defaultFilterData: function (t, e) {
            var i, o, s, n = {};
            if ("" === (t = t.replace(/[.*+?^${}()|[\]\\]/g, ""))) return [];
            i = this.options.initial ? "^" : "", o = this.options.casesensitive ? void 0 : "i", s = new RegExp(i + t, o);
            for (let t in e) s.test(t) && (n[t] = e[t]);
            return n
        },
        showTooltip: function (t) {
            if (this._countertips = 0, this._tooltip.innerHTML = "", this._tooltip.currentSelection = -1, this.options.tooltipLimit)
                for (let e in t) {
                    if (this._countertips === this.options.tooltipLimit) break;
                    this._countertips++, this._tooltip.appendChild(this._createTip(e, t[e]))
                }
            return this._countertips > 0 ? (this._tooltip.style.display = "block", this._autoTypeTmp && this._autoType(), this._autoTypeTmp = this.options.autoType) : this._hideTooltip(), this._tooltip.scrollTop = 0, this._countertips
        },
        _hideTooltip: function () {
            return this._tooltip.style.display = "none", this._tooltip.innerHTML = "", 0
        },
        _defaultFormatData: function (e) {
            var i = this,
                o = this.options.propertyName,
                s = this.options.propertyLoc,
                n = {};
            if (t.Util.isArray(s))
                for (let r in e) n[i._getPath(e[r], o)] = t.latLng(i._getPath(e[r], s[0]), i._getPath(e[r], s[1]));
            else
                for (let r in e) n[i._getPath(e[r], o)] = t.latLng(i._getPath(e[r], s));
            return n
        },
        _recordsFromJsonp: function (e, i) {
            t.Control.Search.callJsonp = i;
            var o = t.DomUtil.create("script", "leaflet-search-jsonp", document.getElementsByTagName("body")[0]),
                s = t.Util.template(this._getUrl(e) + "&" + this.options.jsonpParam + "=L.Control.Search.callJsonp", {
                    s: e
                });
            return o.type = "text/javascript", o.src = s, {
                abort: function () {
                    o.parentNode.removeChild(o)
                }
            }
        },
        _recordsFromAjax: function (e, i) {
            void 0 === window.XMLHttpRequest && (window.XMLHttpRequest = function () {
                try {
                    return new ActiveXObject("Microsoft.XMLHTTP.6.0")
                } catch (t) {
                    try {
                        return new ActiveXObject("Microsoft.XMLHTTP.3.0")
                    } catch (t) {
                        throw new Error("XMLHttpRequest is not supported")
                    }
                }
            });
            var o = t.Browser.ie && !window.atob && document.querySelector ? new XDomainRequest : new XMLHttpRequest,
                s = t.Util.template(this._getUrl(e), {
                    s: e
                });
            return o.open("GET", s), o.onload = function () {
                i(JSON.parse(o.responseText))
            }, o.onreadystatechange = function () {
                4 === o.readyState && 200 === o.status && this.onload()
            }, o.send(), o
        },
        _searchInLayer: function (e, i, o) {
            var s, n = this;
            e instanceof t.Control.Search.Marker || (e instanceof t.Marker || e instanceof t.CircleMarker ? n._getPath(e.options, o) ? ((s = e.getLatLng()).layer = e, i[n._getPath(e.options, o)] = s) : n._getPath(e.feature.properties, o) && ((s = e.getLatLng()).layer = e, i[n._getPath(e.feature.properties, o)] = s) : e instanceof t.Path || e instanceof t.Polyline || e instanceof t.Polygon ? n._getPath(e.options, o) ? ((s = e.getBounds().getCenter()).layer = e, i[n._getPath(e.options, o)] = s) : n._getPath(e.feature.properties, o) && ((s = e.getBounds().getCenter()).layer = e, i[n._getPath(e.feature.properties, o)] = s) : e.hasOwnProperty("feature") ? e.feature.properties.hasOwnProperty(o) && (e.getLatLng && "function" == typeof e.getLatLng ? ((s = e.getLatLng()).layer = e, i[e.feature.properties[o]] = s) : e.getBounds && "function" == typeof e.getBounds && ((s = e.getBounds().getCenter()).layer = e, i[e.feature.properties[o]] = s)) : e instanceof t.LayerGroup && e.eachLayer((function (t) {
                n._searchInLayer(t, i, o)
            })))
        },
        _recordsFromLayer: function () {
            var t = this,
                e = {},
                i = this.options.propertyName;
            return this._layer.eachLayer((function (o) {
                t._searchInLayer(o, e, i)
            })), e
        },
        _autoType: function () {
            var t = this._input.value.length,
                e = this._tooltip.firstChild ? this._tooltip.firstChild._text : "",
                i = e.length;
            if (0 === e.indexOf(this._input.value))
                if (this._input.value = e, this._handleAutoresize(), this._input.createTextRange) {
                    var o = this._input.createTextRange();
                    o.collapse(!0), o.moveStart("character", t), o.moveEnd("character", i), o.select()
                } else this._input.setSelectionRange ? this._input.setSelectionRange(t, i) : this._input.selectionStart && (this._input.selectionStart = t, this._input.selectionEnd = i)
        },
        _hideAutoType: function () {
            var t;
            if ((t = this._input.selection) && t.empty) t.empty();
            else if (this._input.createTextRange) {
                (t = this._input.createTextRange()).collapse(!0);
                var e = this._input.value.length;
                t.moveStart("character", e), t.moveEnd("character", e), t.select()
            } else this._input.getSelection && this._input.getSelection().removeAllRanges(), this._input.selectionStart = this._input.selectionEnd
        },
        _handleKeypress: function (t) {
            var e = this;
            switch (t.keyCode) {
                case 27:
                    this.collapse();
                    break;
                case 13:
                    (1 == this._countertips || this.options.firstTipSubmit && this._countertips > 0) && -1 == this._tooltip.currentSelection && this._handleArrowSelect(1), this._handleSubmit();
                    break;
                case 38:
                    this._handleArrowSelect(-1);
                    break;
                case 40:
                    this._handleArrowSelect(1);
                    break;
                case 8:
                case 45:
                case 46:
                    this._autoTypeTmp = !1;
                    break;
                case 37:
                case 39:
                case 16:
                case 17:
                case 35:
                case 36:
                    break;
                default:
                    this._input.value.length ? this._cancel.style.display = "block" : this._cancel.style.display = "none", this._input.value.length >= this.options.minLength ? (clearTimeout(this.timerKeypress), this.timerKeypress = setTimeout((function () {
                        e._fillRecordsCache()
                    }), this.options.delayType)) : this._hideTooltip()
            }
            this._handleAutoresize()
        },
        searchText: function (e) {
            var i = e.charCodeAt(e.length);
            this._input.value = e, this._input.style.display = "block", t.DomUtil.addClass(this._container, "search-exp"), this._autoTypeTmp = !1, this._handleKeypress({
                keyCode: i
            })
        },
        _fillRecordsCache: function () {
            var e, i = this,
                o = this._input.value;
            this._curReq && this._curReq.abort && this._curReq.abort(), t.DomUtil.addClass(this._container, "search-load"), this.options.layer ? (this._recordsCache = this._recordsFromLayer(), e = this._filterData(this._input.value, this._recordsCache), this.showTooltip(e), t.DomUtil.removeClass(this._container, "search-load")) : (this.options.sourceData ? this._retrieveData = this.options.sourceData : this.options.url && (this._retrieveData = this.options.jsonpParam ? this._recordsFromJsonp : this._recordsFromAjax), this._curReq = this._retrieveData.call(this, o, (function (o) {
                i._recordsCache = i._formatData.call(i, o), e = i.options.sourceData ? i._filterData(i._input.value, i._recordsCache) : i._recordsCache, i.showTooltip(e), t.DomUtil.removeClass(i._container, "search-load")
            })))
        },
        _handleAutoresize: function () {
            var t;
            this._input.style.maxWidth !== this._map._container.offsetWidth && (t = this._map._container.clientWidth, t -= 83, this._input.style.maxWidth = t.toString() + "px"), this.options.autoResize && this._container.offsetWidth + 20 < this._map._container.offsetWidth && (this._input.size = this._input.value.length < this._inputMinSize ? this._inputMinSize : this._input.value.length)
        },
        _handleArrowSelect: function (e) {
            var i = this._tooltip.hasChildNodes() ? this._tooltip.childNodes : [];
            for (let e = 0; e < i.length; e++) t.DomUtil.removeClass(i[e], "search-tip-select");
            if (1 == e && this._tooltip.currentSelection >= i.length - 1) t.DomUtil.addClass(i[this._tooltip.currentSelection], "search-tip-select");
            else if (-1 == e && this._tooltip.currentSelection <= 0) this._tooltip.currentSelection = -1;
            else if ("none" != this._tooltip.style.display) {
                this._tooltip.currentSelection += e, t.DomUtil.addClass(i[this._tooltip.currentSelection], "search-tip-select"), this._input.value = i[this._tooltip.currentSelection]._text;
                var o = i[this._tooltip.currentSelection].offsetTop;
                o + i[this._tooltip.currentSelection].clientHeight >= this._tooltip.scrollTop + this._tooltip.clientHeight ? this._tooltip.scrollTop = o - this._tooltip.clientHeight + i[this._tooltip.currentSelection].clientHeight : o <= this._tooltip.scrollTop && (this._tooltip.scrollTop = o)
            }
        },
        _handleSubmit: function () {
            if (this._hideAutoType(), this.hideAlert(), this._hideTooltip(), "none" == this._input.style.display) this.expand();
            else if ("" === this._input.value) this.collapse();
            else {
                var t = this._getLocation(this._input.value);
                t ? (this.showLocation(t, this._input.value), this.fire("search:locationfound", {
                    latlng: t,
                    text: this._input.value,
                    layer: t.layer ? t.layer : null
                })) : this.showAlert()
            }
        },
        _getLocation: function (t) {
            return !!this._recordsCache.hasOwnProperty(t) && this._recordsCache[t]
        },
        _defaultMoveToLocation: function (t, e, i) {
            this.options.zoom ? this._map.setView(t, this.options.zoom) : this._map.panTo(t)
        },
        showLocation: function (t, e) {
            var i = this;
            return i._map.once("moveend zoomend", (function (e) {
                i._markerSearch && i._markerSearch.addTo(i._map).setLatLng(t)
            })), i._moveToLocation(t, e, i._map), i.options.autoCollapse && i.collapse(), i
        }
    }), t.Control.Search.Marker = t.Marker.extend({
        includes: "1" === t.version[0] ? t.Evented.prototype : t.Mixin.Events,
        options: {
            icon: new t.Icon.Default,
            animate: !0,
            circle: {
                radius: 10,
                weight: 3,
                color: "#e03",
                stroke: !0,
                fill: !1
            }
        },
        initialize: function (e, i) {
            t.setOptions(this, i), !0 === i.icon && (i.icon = new t.Icon.Default), t.Marker.prototype.initialize.call(this, e, i), t.Control.Search.prototype._isObject(this.options.circle) && (this._circleLoc = new t.CircleMarker(e, this.options.circle))
        },
        onAdd: function (e) {
            t.Marker.prototype.onAdd.call(this, e), this._circleLoc && (e.addLayer(this._circleLoc), this.options.animate && this.animate())
        },
        onRemove: function (e) {
            t.Marker.prototype.onRemove.call(this, e), this._circleLoc && e.removeLayer(this._circleLoc)
        },
        setLatLng: function (e) {
            return t.Marker.prototype.setLatLng.call(this, e), this._circleLoc && this._circleLoc.setLatLng(e), this
        },
        _initIcon: function () {
            this.options.icon && t.Marker.prototype._initIcon.call(this)
        },
        _removeIcon: function () {
            this.options.icon && t.Marker.prototype._removeIcon.call(this)
        },
        animate: function () {
            if (this._circleLoc) {
                var t = this._circleLoc,
                    e = parseInt(t._radius / 5),
                    i = this.options.circle.radius,
                    o = 2 * t._radius,
                    s = 0;
                t._timerAnimLoc = setInterval((function () {
                    o -= e += s += .5, t.setRadius(o), o < i && (clearInterval(t._timerAnimLoc), t.setRadius(i))
                }), 200)
            }
            return this
        }
    }), t.Map.addInitHook((function () {
        this.options.searchControl && (this.searchControl = t.control.search(this.options.searchControl), this.addControl(this.searchControl))
    })), t.control.search = function (e) {
        return new t.Control.Search(e)
    }, t.Control.Search
}));
//# sourceMappingURL=/sm/42957fd191abb964d3e0e08b9c8da1d820f1dcb279d6add59cf10149cc52019e.map