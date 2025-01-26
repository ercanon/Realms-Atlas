/*>--------------- { Web Initialization } ---------------<*/
document.addEventListener('DOMContentLoaded', async () => {
    PopupHandler.initialize();

    //Start loading initial data
    const initDataPop = new PopupHandler("Loading previous session data...", true);

    const p2pID = new URLSearchParams(window.location.search).get("id");
    isHost = !p2pID;

/*    dataHdl = await new DataHandeler(p2pID);*/
    mapHdl = await new MapHandeler();

    const bannerElms = document.body.querySelector("header > span");
    const contElms = document.body.querySelector("main > div");
    if (!isHost) {
        [bannerElms, contElms].forEach(
            (element) => element.classList.add("hide"));
    }
    else {
        const shareURL = `${window.location.origin + window.location.pathname}?id=`;//dataHdl.getPeerID()
        bannerElms.querySelector(":scope > button").addEventListener("click", async () => {
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
        bannerElms.querySelector(":scope > iconify-icon").addEventListener("click", async () => { });
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
        (value) => [value[key], value]));
}

class PopupHandler {
    static #bgPopup = null;
    static #tmplPopup = null;
    #popup = null;
    constructor(type, isVis) {
        this.#popup = L.DomUtil.create("div", "hide", PopupHandler.#bgPopup);

        if(isVis)
            this.reveal();
        switch (type) {
            case "delMapPopup":
                this.#fillTitle("Are you sure you want to delete this layer?");
                this.#popup.appendChild(PopupHandler.#tmplPopup.delMapPopup.cloneNode(true));

                const { Delete, Cancel } = setList(this.#popup.querySelectorAll("button"), "innerText");

                Delete.addEventListener("click", () => {
                    mapHdl.deleteMapLayer()
                    this.hide();
                });
                Cancel.addEventListener("click", () =>
                    this.hide());
                break;
            case "urlPopupTmpl":
                this.#fillTitle("URL sharing options");
                this.#popup.appendChild(PopupHandler.#tmplPopup.urlPopupTmpl.cloneNode(true));
                break;
            default:
                this.#fillTitle(type);
        }
    }
    static initialize() {
        PopupHandler.#bgPopup = document.getElementById("bgPopup");
        PopupHandler.#tmplPopup = setList(document.getElementById("contPopupTmpl").content.children, "className")
    }
    #fillTitle(title) {
        this.#popup.innerHTML = `<h2>${title}</h2>`;
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
        this.#popup.remove();
    }
}