/*>--------------- { EventListeners } ---------------<*/
window.onload = async () => {
    const dataLoad = new PopDiv("loadData");

    window.mapHandeler = await new MapHandeler(document.getElementById("mapRender"));
    window.mapDB = await new DataBase();

    const transData = await mapDB.getData("mapData");
    if (transData)
        await loadImg(transData);
    
    dataLoad.delete();
};

document.getElementById("shareBtn").addEventListener("click", async () => {
    const shareURL = `${window.location.origin}?data=${await window.mapDB.getData("mapData")}`;
    try {
        if (navigator.share) {
            await navigator.share({
                title: "Realms' Atlas",
                text: "¡Explore interactive maps in Realms' Atlas!",
                url: shareURL,
            });
        }
        else
            navigator.clipboard.writeText(shareURL);
    }
    catch (error) {
        return showError("Could not share the url.", error);
    }
});

document.getElementById("uploadImg").addEventListener("change", async function () {
    const file = this.files[0];
    if (!file)
        return showError("No file selected.");

    const reader = new FileReader();

    reader.onload = (event) => loadImg(event.target.result);
    reader.onerror = (event) => { return showError("An error occurred while reading the file.", event.target.error); }
    reader.readAsDataURL(file);
})
document.getElementById("imgUrl").addEventListener("change", async function () {
    const url = this.value.trim();
    if (!url)
        return showError("Please, provide a valid image URL.");

    try {
        const response = await fetch(url, { method: "HEAD" });
        if (!response.ok)
            return showError(`Failed to fetch image from URL: ${response.statusText}`);

        const contentType = response.headers.get("Content-Type");
        if (!contentType || !contentType.startsWith("image/"))
            return showError("The URL does not point to a valid image.");

        loadImg(url);
    }
    catch (error) {
        return showError("An error occurred while fetching the image.", error);
    }
})



/*>--------------- { Utilities } ---------------<*/
function showError(message, error = null) {
    console.error(message, error);
    alert(message);
}

class PopDiv {
    constructor(id) {
        this.popup = null;

        switch (id) {
            case "delLayer":
                this.#createDelLayer();
                break;
            case "loadData":
                this.#createLoadData();
                break;
            default:
                showError("Popup type not valid")
                break;
        }
    }

    #createBackGround(topPop) {
        const parent = document.createElement("div");
        parent.classList.add("bgPopup");

        parent.appendChild(topPop);
        document.querySelector('main').appendChild(parent);
        this.popup = parent;
    }
    #createDelLayer() {
        const popup = document.createElement("div");
        popup.id = "delLayer";
        popup.innerHTML =
            `<h2>Are you sure you want to delete this layer?</h2>
            <button id="deleteBtn" onclick="window.mapHandeler.deleteLayer()">Delete</button>
            <button id="cancelBtn" onclick="window.mapHandeler.closePopup()">Cancel</button>`;

        this.#createBackGround(popup);
        this.hide();
    }
    #createLoadData() {
        const popup = document.createElement("div");
        popup.id = "loadData";
        popup.innerHTML =
            `<h2>Loading previous session data...</h2>`;

        this.#createBackGround(popup);
        this.show();
    }

    show() {
        this.popup.classList.remove("hide");
    }

    hide() {
        this.popup.classList.add("hide");
    }

    delete() {
        const main = document.querySelector('main');

        if (this.popup && main.contains(this.popup))
            main.removeChild(this.popup);
    }
}

class DataBase {
    constructor() {
        this.dataBase = null;
        return (async () => {
            await this.#initDB();
            return this;
        })();
    }

    async #initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open("mapDB", 1);

            request.onupgradeneeded = (event) => {
                const dataBase = event.target.result;
                if (!dataBase.objectStoreNames.contains("mapData"))
                    dataBase.createObjectStore("mapData", { keyPath: "nameObj" });
                //store.createIndex("nombreIndex", "nombre", { unique: false });
            };

            request.onsuccess = (event) => {
                this.dataBase = event.target.result;
                resolve();
            }
            request.onerror = (event) => reject(event.target.error);
        });
    }

    saveData(nameObj, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.dataBase.transaction("mapData", "readwrite");
            const store = transaction.objectStore("mapData");

            const request = store.put({ nameObj, data });

            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }

    getData(nameObj) {
        return new Promise((resolve, reject) => {
            const transaction = this.dataBase.transaction("mapData", "readonly");
            const store = transaction.objectStore("mapData");

            const request = store.get(nameObj);

            request.onsuccess = (event) => resolve(event.target.result?.data || null);

            request.onerror = (event) => reject(event.target.error)
        });
    }

    delData(nameObj) {
        return new Promise((resolve, reject) => {
            const transaction = this.dataBase.transaction("mapData", "readwrite");
            const store = transaction.objectStore("mapData");

            const request = store.delete(nameObj);

            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }
}