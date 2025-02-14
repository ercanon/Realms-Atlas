L.Control.Sidebar.BlankEntry = L.Control.extend({
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

    },
    addTo: function (sidebar) {
        const { panel, id, title, tabIcon, iconBtn, actionBtn, disabled, position } = this.options;
        if (sidebar.getEntry(id))
            throw new Error(`Panel with ID "${id}" already exist.`);

        this.remove();
        this._sidebar = sidebar.addEntry(this);

        this._panel = this._panel || (typeof panel === "string" ? L.DomUtil.get(panel) : panel) || L.DomUtil.create("span", "sidebar-panel");
        if (!id && typeof panel === "string")
            this._panel.id = panel;
        else
            this._panel.id = id;

        this._content = L.DomUtil.create("div", "sidebar-panel-content", this._panel);

        if (title) {
            let header = "";
            if (typeof iconBtn === "string")
                header = `<span class="sidebar-panel-close">${iconBtn}</span>`;
            header = `<h1 class="sidebar-panel-header">${title + header}</h1>`;

            this._panel.insertAdjacentHTML("afterbegin", header);
        }

        this._tab = L.DomUtil.create("a", disabled ? "disabled" : "");
        Object.assign(this._tab, {
            innerHTML: tabIcon,
            href: `#${id}`,
            role: "tablist",
            title
        });
        this._tabClick("on");

        const headerBtnList = Array.from(this._panel.querySelectorAll(".sidebar-panel-close"));
        if (headerBtnList.length) {
            this._headerBtn = headerBtnList.at(-1);
            this._closeClick("on", actionBtn);
        }

        this._container = sidebar.getContainer("panel");
        this._container.appendChild(this._panel);
        sidebar.getContainer(position).appendChild(this._tab);

        this.onAdd();

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
        if (L.DomUtil.hasClass(this._container, "collapsed")) {
            this.fire("opening");
            L.DomUtil.removeClass(this._container, "collapsed");
            this._sidebar.panMap("open");
        }

        this.fire("content", this.options.id);
        return this;
    },
    close: function () {
        L.DomUtil.removeClass(this._tab, "active");

        if (!L.DomUtil.hasClass(this._container, "collapsed")) {
            this.fire("closing");
            L.DomUtil.addClass(this._container, "collapsed");
            this._sidebar.panMap("close");
        }

        return this;
    },
    remove: function () {
        if (this._container) {
            L.DomUtil.addClass(this._container, "collapsed")

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
    setId: function (id) {

    },
    setTab: function (tab) {

    },
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
        const { actionBtn } = this.options;
        if (actionBtn)
            actionBtn.forEach((action) =>
                L.DomEvent[actionClick](this._headerBtn, "click", action, this));
    }
});



L.Control.Sidebar.InfoEntry = L.Control.Sidebar.BlankEntry.extend({
    options: {
        tabIcon: `<iconify-icon icon="material-symbols:info-rounded" noobserver></iconify-icon>`
    },
    onAdd: function () {
        this._panel.classList.add("panel-info");

        if (isHost) {
            this._content.insertAdjacentHTML("beforebegin",
                `<textarea placeholder="Write in Markdown(.md)..."></textarea>`);
            const structureList = setList(this._panel.children, "localName");

            structureList.textarea.addEventListener("input", (event) =>
                structureList.div.innerHTML = marked.parse(event.target.value.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, "")));
            structureList.textarea.addEventListener("change", (event) =>
                console.log("Sending Data"));
        }
    }
});

L.Control.Sidebar.MarkerListEntry = L.Control.Sidebar.BlankEntry.extend({
    options: {
        tabIcon: `<iconify-icon icon="material-symbols:file-map-stack-rounded" noobserver></iconify-icon>`,
        staticMarker: {}
    },
    onAdd: function () {
        this._panel.classList.add("panel-markers");

        if (isHost) {
            this._content.insertAdjacentHTML("beforebegin",
                `<span>
                    <div class="panel-markers-editor">
                        <figure>
                            <figcaption></figcaption>
                        </figure>
                        <span>
                            <label for="colorMarker">Marker Color<br></label>
                            <input type="color" id="colorMarker">
                        </span>
                        <span>
                            <label for="colorIcon">Icon Color<br></label>
                            <input type="color" id="colorIcon" value="#ffffff">
                        </span>
                        <span>
                            <label for="scaleIcon">Icon Scale (X:Y)<br></label>
                            <input type="text" id="scaleIcon" placeholder="Ex: 10 : 20" value=".4">
                        </span>
                        <span>
                            <label for="posIcon">Icon Position (X:Y)<br></label>
                            <input type="text" id="posIcon" title="Icon Position (X:Y)" placeholder="Ex: 10% : 20" value="0 : -45%">
                        </span>                    
                        <input type="text" id="nameMarker" placeholder="Marker Name">
                    </div>
                    <div class="panel-markers-dropdown hide">
                        <input type="text" placeholder="Search icons...">
                        <span></span>
                    </div>
                </span>`
            );
            this._content.insertAdjacentHTML("afterend",
                `<button class="panel-markers-btnEntry"> </button>`
            );

            /*>---------- [ Create Spot ] ----------<*/
            const markerEditor = this._panel.querySelector(".panel-markers-editor");
            const iconMarker = markerEditor.querySelector(":scope > figure");
            const iconName = iconMarker.querySelector(":scope > figcaption");
            const markerControls = setList(markerEditor.querySelectorAll("input"), "id");
            const dropdownIcon = this._panel.querySelector(".panel-markers-dropdown");
            const dropdownGrid = dropdownIcon.querySelector(":scope > span");

            const spotName = "spots:plain-marker";
            Iconify.addIcon(spotName, {
                body: `<path fill="currentColor" d="M256 17.108c-75.73 0-137.122 61.392-137.122 137.122.055 23.25 6.022 46.107 11.58 56.262L256 494.892l119.982-274.244h-.063c11.27-20.324 17.188-43.18 17.202-66.418C393.122 78.5 331.73 17.108 256 17.108z"></path>`,
                width: 512,
                height: 512
            });
            this.options.staticMarker = this.activeMarker = new L.DivIcon.MarkerEntry(spotName, markerControls, {
                structureEntry:
                    `<div class="markerEntry">
                       <input type="checkbox" checked>
                       <figure>
                           <figcaption></figcaption>
                       </figure>
                       <button> </button>
                    </div>`,
                actionEntry: (marker) => {
                    this.activeMarker?.toggleActive("remove");

                    if (!marker || this.activeMarker === marker)
                        this.activeMarker = this.options.staticMarker;
                    else {
                        marker.toggleActive("add");
                        this.activeMarker = marker;
                    }

                    this._markerPreviewRef?.setAttribute("href", `#${this.activeMarker.markerRef.id}`)
                }
            });
            markerEditor.prepend(this.activeMarker.markerRef);

            iconMarker.prepend(this.activeMarker.createIcon());
            this._markerPreviewRef = markerEditor.querySelector("use");

            /*>---------- [ EventListener Controlers ] ----------<*/
            Object.entries(markerControls).forEach(([id, control]) => {
                control.addEventListener("input", (event) =>
                    this.activeMarker.setProperty(id, event.target.value));
                control.addEventListener("change", (event) => { });
            });
            iconMarker.addEventListener("click", () =>
                dropdownIcon.classList.toggle("hide"));
            dropdownIcon.addEventListener("mouseleave", () =>
                dropdownIcon.classList.add("hide"));

            /*>---------- [ Dropdown List ] ----------<*/
            const createFigure = (prefixedName, initName) => {
                const figure = L.DomUtil.create("figure", "", dropdownGrid);
                figure.appendChild(Iconify.renderSVG(prefixedName, {
                    height: "unset"
                }));

                const nameFig = L.DomUtil.create("figcaption", "", figure);
                const name = prefixedName.split(":")[1];
                nameFig.textContent = name;

                figure.addEventListener("click", () => {
                    this.activeMarker.setProperty("iconMarker", prefixedName);

                    iconName.textContent = name;
                    dropdownIcon.classList.add("hide");
                });

                if (prefixedName.includes(initName))
                    figure.click();
            };
            fetch("https://cdn.jsdelivr.net/npm/@iconify-json/game-icons/icons.json")
                .then((response) =>
                    response.json())
                .then((data) => {
                    Iconify.addIcon(`${data.prefix}:none`, {
                        body: `<path fill="none" d=""/>`,
                        width: 512,
                        height: 512
                    });
                    Iconify.addCollection(data);

                    Iconify.listIcons("", data.prefix).forEach((iconName) =>
                        createFigure(iconName, "none"));
                })
                .catch((error) =>
                    console.error("Error loading icons", error));

            dropdownIcon.querySelector(`:scope > input[type="text"]`).addEventListener("input", (event) => {
                const textInput = event.target.value.toLowerCase();
                [...dropdownGrid.children].forEach(async (icon) =>
                    icon.classList.toggle("hide", !icon.querySelector("figcaption").textContent.toLowerCase().includes(textInput)));
            });

            /*>---------- [ Marker Btn Handeler ] ----------<*/
            this._panel.querySelector(".panel-markers-btnEntry").addEventListener("click", () =>
                this._content.appendChild(new L.DivIcon.MarkerEntry(this.activeMarker).createEntry()));
        }
    }
});

L.Control.Sidebar.MapListEntry = L.Control.Sidebar.BlankEntry.extend({});

L.Control.Sidebar.Settings = L.Control.Sidebar.BlankEntry.extend({});