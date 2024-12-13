/*>--------------- { EventListeners } ---------------<*/
window.onload = async () => {
    const dataLoad = new PopDiv("Loading previous session data...");

    const params = new URLSearchParams(window.location.search)

    mapDB = await new DataBase();
    mapHandeler = await new MapHandeler();
    p2p = await new P2P(params.get("id"));

    const savedData = await mapDB.getData("mapData");
    if (savedData) {
        try {
            const decompressedData = fflate.gunzipSync(savedData);
            const blob = new Blob([decompressedData], { type: "image/webp" })
            loadImg(URL.createObjectURL(blob));
        }
        catch (error) {
            showError("Error loading file from previous session.", error);
        }
    }
    
    dataLoad.delete();
};

document.getElementById("shareBtn").addEventListener("click", async () => { 
    const shareURL = `${window.location.origin + window.location.pathname}?id=${window.p2p.getID()}`; 

    try {
        if (navigator.share) {
            await navigator.share({
                title: "Realms' Atlas Spectator",
                url: shareURL,
            });
        }
        else
            navigator.clipboard.writeText(shareURL);
    }
    catch (error) {
        showError("Could not share the url.", error);
    }
});

document.getElementById("uploadImg").addEventListener("change", async function () {
    const file = this.files?.[0];
    if (!file)
        return showError("No file selected.");

    try {
        const arrayBuffer = await file.arrayBuffer();
        const compressedData = fflate.gzipSync(new Uint8Array(arrayBuffer), { level: 9 });
        await mapDB.saveData("mapData", compressedData);

        p2p.sendData({
            type: "img",
            filename: file.name,
            mimeType: file.type,
            data: compressedData,
        });

        const blob = new Blob([arrayBuffer], { type: "image/webp" })
        await loadImg(URL.createObjectURL(blob));
    }
    catch (error) {
        showError("Error loading input file.", error);
    }
    this.value = "";
})
document.getElementById("imgUrl").addEventListener("change", async function () {
    const url = this.value.trim();
    if (!url)
        return showError("Please, provide a valid image URL.");

    try {
        loadImg(url);
    }
    catch (error) {
        showError("Error loading image URL.", error);
    }
})



/*>--------------- { Utilities } ---------------<*/
function showError(message, error = null) {
    console.error(message, error);
    alert(message);
}

class PopDiv {
    #popup = null;
    constructor(id) {
        switch (id) {
            case "delLayer":
                this.#createDelLayer();
                break;
            default:
                this.#createMsg(id);
                break;
        }
    }

    #createBackGround(topPop) {
        const parent = document.createElement("div");
        parent.id = "bgPopup";

        parent.appendChild(topPop);
        document.querySelector("main").appendChild(parent);
        this.#popup = parent;
    }
    #createDelLayer() {
        const popup = document.createElement("div");
        popup.id = "delLayer";
        popup.innerHTML =
            `<h2>Are you sure you want to delete this layer?</h2>
            <button id="deleteBtn" onclick="mapHandeler.deleteLayer()">Delete</button>
            <button id="cancelBtn" onclick="mapHandeler.closePopup()">Cancel</button>`;

        this.#createBackGround(popup);
        this.hide();
    }
    #createMsg(msg) {
        const popup = document.createElement("div");
        popup.id = "loadMsg";
        popup.innerHTML =
            `<h2>${msg}</h2>`;

        this.#createBackGround(popup);
        this.show();
    }

    show() {
        this.#popup.classList.remove("hide");
    }

    hide() {
        this.#popup.classList.add("hide");
    }

    delete() {
        document.querySelector("main").removeChild(this.#popup);
    }
}

class DataBase {
    #dataBase = null;
    constructor() {
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
                this.#dataBase = event.target.result;
                resolve();
            }
            request.onerror = (event) => reject(event.target.error);
        });
    }

    saveData(nameObj, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.#dataBase.transaction("mapData", "readwrite");
            const store = transaction.objectStore("mapData");

            const request = store.put({ nameObj, data });

            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }

    getData(nameObj) {
        return new Promise((resolve, reject) => {
            const transaction = this.#dataBase.transaction("mapData", "readonly");
            const store = transaction.objectStore("mapData");

            const request = store.get(nameObj);

            request.onsuccess = (event) => resolve(event.target.result?.data || null);

            request.onerror = (event) => reject(event.target.error)
        });
    }

    delData(nameObj) {
        return new Promise((resolve, reject) => {
            const transaction = this.#dataBase.transaction("mapData", "readwrite");
            const store = transaction.objectStore("mapData");

            const request = store.delete(nameObj);

            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }
}

class P2P {
    #connect = [];
    #peerID = null;
    constructor(idPeer) {
        this.#createPeer(idPeer);
    }

    #createPeer(idPeer) {
        if (!idPeer) {
            this.#peerID = crypto.randomUUID();

            console.log(`Setting the Host ID: ${this.#peerID}`);
            const peer = new Peer(this.#peerID);

            peer.on("connection", async (connection) => {
                console.log("New client: ", connection.peer);
                this.#connect.push(connection);
                this.sendData({ type: "init", data: mapDB.getData("mapData") });

                connection.on("data", async (incmg) => {

                });
            });
        }
        else {
            console.log("Connecting to Host ID: ", idPeer);
            const peer = new Peer();

            peer.on("open", (clientId) => {
                console.log(`Client ID: ${clientId}`);

                const connection = peer.connect(idPeer);
                this.#connect.push(connection);

                connection.on("data", async (incmg) => {
                    switch (incmg.type) {
                        case "init":
                        case "img":
                            const decompressedData = fflate.gunzipSync(incmg.data);
                            const blob = new Blob([decompressedData], { type: "image/webp" });
                            loadImg(URL.createObjectURL(blob));
                            break;
                        default:
                            throw new Error("Received invalid data");
                            break;
                    }
                });
            });
        }
    }

    getID() {
        return this.#peerID;
    }

    sendData(data) {
        this.#connect.forEach((peer) => peer.send(data));
    }
}