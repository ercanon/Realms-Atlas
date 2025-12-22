L.Control.Sidebar.BlankEntry = L.Control.extend({
    includes: L.Evented.prototype || L.Mixin.Events,
    options: {
        panel: null,
        id: "",
        title: "",
        editTitle: false,
        iconTab: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' d='M5 15q-.425 0-.712-.288T4 14v-1H3q-.425 0-.712-.288T2 12t.288-.712T3 11h1v-1q0-.425.288-.712T5 9t.713.288T6 10v1h1q.425 0 .713.288T8 12t-.288.713T7 13H6v1q0 .425-.288.713T5 15m9 6V3h6q.825 0 1.413.588T22 5v14q0 .825-.587 1.413T20 21zm-8 0q-.825 0-1.412-.587T4 19v-1.1q0-.4.3-.663T5 17q2.075 0 3.538-1.45T10 12T8.537 8.45T5 7q-.4 0-.7-.25T4 6.1V5q0-.825.588-1.412T6 3h6v18z'/%3E%3C/svg%3E")`,
        disabledTab: false,
        iconBtn: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' d='M6.325 12.85q-.225-.15-.337-.375T5.874 12t.113-.475t.337-.375l8.15-5.175q.125-.075.263-.112T15 5.825q.4 0 .7.288t.3.712v10.35q0 .425-.3.713t-.7.287q-.125 0-.262-.038t-.263-.112z'/%3E%3C/svg%3E")`,
        actionBtn: ["close"],
        position: "top"
    },
    initialize: function (options) {
        L.setOptions(this, options);

        const actionBtn = this.options.actionBtn;
        if (actionBtn)
            this.options.actionBtn = actionBtn.reduce((array, action) => {
                if (action in L.Control.Sidebar.BlankEntry.prototype)
                    array.push(this[action]);
                return array;
            }, []);

        return this;
    },
    onAdd: function () {

    },
    addTo: function (sidebar) {
        const { panel, id, title, editTitle, iconTab, iconBtn, actionBtn, disabled, position } = this.options;
        if (id && sidebar.getEntry(id))
            throw new Error(`Panel with ID "${id}" already exist.`);

        this.remove();
        this._sidebar = sidebar.addEntry(this);

        this._panel = this._panel || (typeof panel === "string" ? L.DomUtil.get(panel) : panel) || L.DomUtil.create("section", "sidebar-panel");
        if (!id && typeof panel === "string")
            this._panel.id = panel;
        else
            this._panel.id = id || `${(title || Date.now().toString()).replace(/ /g, "_")}-panel`;

        if (title) {
            const header = L.DomUtil.create("span", "sidebar-panel-header", this._panel);
            this._titleInput = L.DomUtil.create("input", "", header);
            Object.assign(this._titleInput, {
                type: "type",
                disabled: !editTitle,
                value: title
            });
            this._titleSubmit("on");

            if (iconBtn) {
                this._headerBtn = L.DomUtil.create("button", "", header);
                this._headerBtn.style.setProperty("webkit-mask-image", iconBtn);
                this._headerBtn.style.setProperty("mask-image", iconBtn);
                this._headerBtnClick("on", actionBtn);
            }
        }

        this._content = L.DomUtil.create("div", "sidebar-panel-content", this._panel);

        this._tab = L.DomUtil.create("a", disabled ? "disabled" : "");
        Object.assign(this._tab, {
            href: `#${this._panel.id}`,
            role: "tablist",
            title
        });
        this._tab.style.setProperty("--mask-url", iconTab);
        this._tabClick("on");

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

            this._titleSubmit("off");
            this._headerBtnClick("off");
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
        if (!this.options.id) {
            const titleId = `${id.target.value.replace(/ /g, "_")}-panel`;
            this._panel.id = this.options.id || titleId;
            this._tab.href = `#${titleId}`;
        }
    },
    setTab: function (tab) {

    },
    onTabClick: function () {
        if (L.DomUtil.hasClass(this._tab, "active"))
            this.close();
        else if (!L.DomUtil.hasClass(this._tab, "disabled"))
            this.open();
    },
    _tabClick: function (actionClick) {
        const tab = this._tab;
        if (tab.hasAttribute("href") && tab.getAttribute("href")[0] === "#")
            L.DomEvent[actionClick](tab, "click", L.DomEvent.preventDefault, this)
            [actionClick](tab, "click", this.onTabClick, this);
    },
    _headerBtnClick: function (actionClick) {
        const actionBtn = this.options.actionBtn;
        if (actionBtn)
            actionBtn.forEach((action) =>
                L.DomEvent[actionClick](this._headerBtn, "click", action, this));
    },
    _titleSubmit: function (actionChange) {
        L.DomEvent[actionChange](this._titleInput, "change", this.setId, this);
    }
});



L.Control.Sidebar.InfoEntry = L.Control.Sidebar.BlankEntry.extend({
    options: {
        iconTab: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' d='M12 17q.425 0 .713-.288T13 16v-4q0-.425-.288-.712T12 11t-.712.288T11 12v4q0 .425.288.713T12 17m0-8q.425 0 .713-.288T13 8t-.288-.712T12 7t-.712.288T11 8t.288.713T12 9m0 13q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22'/%3E%3C/svg%3E")`
    },
    onAdd: function () {
        this._panel.classList.add("panel-info");

        if (document.isHost) {
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
        iconTab: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23000' d='M8 18q-.825 0-1.412-.587T6 16V4q0-.825.588-1.412T8 2h12q.825 0 1.413.588T22 4v12q0 .825-.587 1.413T20 18zm-4 4q-.825 0-1.412-.587T2 20V7q0-.425.288-.712T3 6t.713.288T4 7v13h13q.425 0 .713.288T18 21t-.288.713T17 22zm10-12q-.425 0-.712-.288T13 9t.288-.712T14 8t.713.288T15 9t-.288.713T14 10m0 5q2.025-1.725 3.013-3.187T18 9.1q0-1.875-1.213-2.988T14 5t-2.787 1.113T10 9.1q0 1.25.988 2.713T14 15'/%3E%3C/svg%3E")`,
        iconList: null
    },
    onAdd: function () {
        this._panel.classList.add("panel-markers");

        if (document.isHost) {
            this._content.insertAdjacentHTML("beforebegin",
                `<div class="panel-markers-editor">
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
                        <label for="scaleIcon">Icon Scale (X,Y)<br></label>
                        <input type="text" id="scaleIcon" placeholder="Ex: 10 , 20" value=".4">
                    </span>
                    <span>
                        <label for="translateIcon">Icon Position (X,Y)<br></label>
                        <input type="text" id="translateIcon" placeholder="Ex: 10% , 20px" value="0 , -45%">
                    </span>                    
                    <input type="text" id="nameMarker" placeholder="Marker Name">
                </div>
                <div class="panel-markers-dropdown" hidden>
                    <input type="text" placeholder="Search icons...">
                    <span></span>
                </div>`
            );
            this._content.insertAdjacentHTML("afterend",
                `<button class="panel-markers-btnEntry"></button>`);

            /*>---------- [ Create Spot ] ----------<*/
            const [banner, markerEditor, dropdownIcon, content, markerBtnEntry] = Object.values(setList(this._panel.children, "className"));
            const iconMarker = markerEditor.firstElementChild;
            const iconName = iconMarker.lastElementChild;
            const markerControls = setList(markerEditor.querySelectorAll("input"), "id");
            const dropdownGrid = dropdownIcon.lastElementChild;

            const spotName = "spots:plain-marker";
            Iconify.addIcon(spotName, {
                body: `<path fill="currentColor" d="M256 17.108c-75.73 0-137.122 61.392-137.122 137.122.055 23.25 6.022 46.107 11.58 56.262L256 494.892l119.982-274.244h-.063c11.27-20.324 17.188-43.18 17.202-66.418C393.122 78.5 331.73 17.108 256 17.108z"></path>`,
                width: 512,
                height: 512
            });
            const markerRefEditor = this.activeMarker = new L.DivIcon.MarkerEntry(spotName, markerControls, {
                structureEntry:
                    `<span class="markerEntry">
                       <input type="checkbox" checked>
                       <figure>
                           <figcaption></figcaption>
                       </figure>
                       <button> </button>
                    </span>`,
                actionEntry: (markerInst, markerProps) => {
                    this.activeMarker?.handleActive("remove");

                    if (!markerInst || this.activeMarker === markerInst) {
                        this.activeMarker = markerRefEditor;
                        markerProps = this.activeMarker.getProperties();
                    }
                    else {
                        markerInst.handleActive("add");
                        this.activeMarker = markerInst;
                    }

                    Object.entries(markerProps).forEach(([control, value]) => {
                        const inputControl = markerControls[control];
                        if (inputControl)
                            inputControl.value = value;
                    });
                    iconName.textContent = markerProps.iconName;
                    this._markerPreviewRef?.setAttribute("href", `#${markerProps.markerID}`);
                }
            });
            markerEditor.prepend(markerRefEditor.markerRef);

            iconMarker.prepend(this.activeMarker.createIcon());
            this._markerPreviewRef = markerEditor.querySelector("use");

            /*>---------- [ EventListener Controlers ] ----------<*/
            Object.entries(markerControls).forEach(([id, control]) => {
                control.addEventListener("input", (event) =>
                    this.activeMarker.setProperty(id, event.target.value));
                control.addEventListener("change", (event) => { });
            });
            iconMarker.addEventListener("click", (event) => {
                if (!dropdownIcon.style.transform)
                    dropdownIcon.style.transform = `translateY(${iconMarker.getBoundingClientRect().bottom - 110}px)`;
                dropdownIcon.hidden = !dropdownIcon.hidden
            });
            dropdownIcon.addEventListener("mouseleave", () =>
                dropdownIcon.hidden = true);

            /*>---------- [ Dropdown List ] ----------<*/
            this.options.iconList.then((list) => {
                Iconify.addIcon(`${list.prefix}:none`, {
                    body: `<path fill="none" d=""/>`,
                    width: 512,
                    height: 512
                });
                Iconify.addCollection(list);
                Iconify.listIcons("", list.prefix).forEach((prefixedName) => {
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
                        dropdownIcon.hidden = true;
                    });

                    if (prefixedName.includes("none"))
                        figure.click();
                });
            });

            dropdownIcon.firstElementChild.addEventListener("input", (event) => {
                const textInput = event.target.value.toLowerCase();
                [...dropdownGrid.children].forEach(async (icon) =>
                    icon.hidden = !icon.querySelector("figcaption").textContent.toLowerCase().includes(textInput));
            });

            /*>---------- [ Marker Btn Handeler ] ----------<*/
            markerBtnEntry.addEventListener("click", () =>
                this._content.appendChild(new L.DivIcon.MarkerEntry(this.activeMarker).createEntry()));
        }
    }
});

L.Control.Sidebar.MapListEntry = L.Control.Sidebar.BlankEntry.extend({});

L.Control.Sidebar.Settings = L.Control.Sidebar.BlankEntry.extend({});