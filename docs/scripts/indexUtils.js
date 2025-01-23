/*>--------------- { Web Initialization } ---------------<*/
document.addEventListener('DOMContentLoaded', async () => {
    //Start loading initial data
    const initDataPop = new PopupHandler("Loading previous session data...", true);

    const p2pID = new URLSearchParams(window.location.search).get("id");
    isHost = !p2pID;

/*    dataHdl = await new DataHandeler(p2pID);*/
    mapHdl = await new MapHandeler();

    const bannerElms = document.body.querySelector("header > span");
    const contElms = document.body.querySelector("main > span");
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

function setList(entries) {
    return Object.fromEntries(entries.map(
        (value) => [value, document.getElementById(value)]));
}

class PopupHandler {
    static #bgPopup = null;
    static #tmplPopup = null;
    #popup = null;
    constructor(type, isVis) {
        if (!PopupHandler.#bgPopup) {
                PopupHandler.#bgPopup = document.getElementById("bgPopup");
                PopupHandler.#tmplPopup = Object.fromEntries(
                    [...document.getElementById("contPopupTmpl").content.children].map(
                    (template) => [template.className, template]));
        }

        this.#popup = document.createElement("div");
        this.#popup.classList.add("hide");
        PopupHandler.#bgPopup.appendChild(this.#popup);

        if(isVis)
            this.reveal();
        switch (type) {
            case "delMapPopup":
                this.#fillTitle("Are you sure you want to delete this layer?");
                this.#popup.appendChild(PopupHandler.#tmplPopup.delMapPopup.cloneNode(true));

                this.#popup.querySelector(`button:contains("Delete")`).addEventListener("click", () =>
                    mapHdl.deleteMapLayer());
                this.#popup.querySelector(`button:contains("Cancel")`).addEventListener("click", () =>
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
    #fillTitle(title) {
        this.#popup.innerHTML = `<h2>${title}</h2>`;
    }

    hide() {
        this.#popup.classList.add("hide");
        if ([...PopupHandler.#bgPopup.children].every(
            (child) => child.classList.contains("hide")))
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