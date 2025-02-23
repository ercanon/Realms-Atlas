/*>--------------- { Web Initialization } ---------------<*/
document.addEventListener('DOMContentLoaded', async () => {
    //Start loading initial data
    const initDataPop = new PopupHandler("Loading previous session data...", true);

    const p2pID = new URLSearchParams(window.location.search).get("id");
    isHost = !p2pID;

/*    dataHdl = await new DataHandeler(p2pID);*/
    mapHdl = await new MapHandeler();

    const shareBtn = document.getElementById("headerShare");
    const dnldDataBtn = document.getElementById("headerDownload");
    const contElms = document.getElementById("imgInput");
    if (!isHost) {
        [shareBtn, dnldDataBtn, contElms].forEach(
            (element) => element.classList.add("hide"));
    }
    else {
        const shareURL = `${window.location.origin + window.location.pathname}?id=`;//dataHdl.getPeerID()
        shareBtn.addEventListener("click", async () => {
            try {
                if (navigator.share)
                    await navigator.share({
                        title: "URL for your Realms' Atlas Spectators",
                        url: shareURL,
                    });
                else
                    navigator.clipboard.writeText(shareURL);
                    alert("URL copied to clipboard!");
            }
            catch (error) {
                showError("Error sharing URL.", error);
            }
        });
        dnldDataBtn.addEventListener("click", async () => { });
    }

    initDataPop.delete();
});


/*>--------------- { Utilities } ---------------<*/
function showError(message, error) {
    console.error(message, error);
    alert(message);
}
function setList(entries, key) {
    return Object.fromEntries([...entries].map(
        typeof key === "string" ? (value) => [value[key], value] : key)
        .filter((value) => value)
    );
}

class PopupHandler {
    static #bgPopup = null;
    #popup = null;
    #functionList = [];
    constructor(type, isVis) {
        if (!PopupHandler.#bgPopup)
            PopupHandler.#bgPopup = document.getElementById("bgPopup");

        this.#popup = L.DomUtil.create("div", "hide", PopupHandler.#bgPopup);
        if(isVis)
            this.reveal();

        switch (type) {
            case "delMapPopup":
                this.#popup.innerHTML =
                    `<h2>Are you sure you want to delete this layer?</h2>
                     <span class="delMapPopup">
                        <button>Delete</button>
                        <button>Cancel</button>
                    </span>`;

                const { Delete, Cancel } = setList(this.#popup.querySelectorAll("button"), "innerText");

                this.#functionList = [
                    {
                        button: Delete,
                        event: "click",
                        action: () => {
                            mapHdl.deleteMapLayer()
                            this.hide();
                        }
                    },
                    {
                        button: Cancel,
                        event: "click",
                        action: () =>
                            this.hide()
                    }
                ];
                this.#inputEvent("on");
                break;
            case "urlPopupTmpl":
                this.#popup.innerHTML =
                    `<h2>URL sharing options</h2>
                     `;
                break;
            default:
                this.#popup.innerHTML = `<h2>Are you sure you want to delete this layer?</h2>`;
        }
    }
    #inputEvent(actionEvent) {
        this.#functionList.forEach(({ button, event, action }) =>
            L.DomEvent[actionEvent](button, event, action, this));
    }

    hide() {
        this.#popup.classList.add("hide");
        if ([...PopupHandler.#bgPopup.children].every((child) =>
            child.classList.contains("hide")))
            PopupHandler.#bgPopup.classList.add("hide");
    }
    reveal() {
        this.#popup.classList.remove("hide");
        PopupHandler.#bgPopup.classList.remove("hide");
    }
    delete() {
        this.hide();
        this.#inputEvent("off");
        this.#popup.remove();
    }
}