/*>--------------- { EventListeners } ---------------<*/
window.onload = async () => {
    const dataLoad = new PopDiv("loadData");

    const params = new URLSearchParams(window.location.search)

    window.p2p = await new P2P(params.get("id"));
    window.mapHandeler = await new MapHandeler(document.getElementById("mapRender"));
    window.mapDB = await new DataBase();

    const transData = await mapDB.getData("mapData");
    if (transData) {
        try {
            const decodeData = new TextDecoder().decode(fflate.gunzipSync(transData));
            await loadImg(decodeData);
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
                title: "Realms' Atlas",
                text: "¡Explore interactive maps in Realms' Atlas!",
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
    const file = this.files[0];
    if (!file)
        return showError("No file selected.");

    try {
        const reader = new FileReader();

        reader.onload = async (event) => {
            const encodeData = new TextEncoder().encode(event.target.result);
            await window.mapDB.saveData("mapData", fflate.gzipSync(encodeData));
            window.p2p.sendData("¡Cargando Mapa!");
            await loadImg(event.target.result);
        }
        reader.onerror = (event) => { throw new Error(event.target.error) };

        reader.readAsDataURL(file);
    }
    catch (error) {
        showError("Error loading input file.", error);
    }
})
document.getElementById("imgUrl").addEventListener("change", async function () {
    const url = this.value.trim();
    if (!url)
        return showError("Please, provide a valid image URL.");

    loadImg(url);
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
            case "loadData":
                this.#createLoadData();
                break;
            default:
                showError("Popup type not valid")
                this.#createBackGround(null);
                break;
        }
    }

    #createBackGround(topPop) {
        const parent = document.createElement("div");
        parent.classList.add("bgPopup");

        parent.appendChild(topPop);
        document.querySelector('main').appendChild(parent);
        this.#popup = parent;
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
        this.#popup.classList.remove("hide");
    }

    hide() {
        this.#popup.classList.add("hide");
    }

    delete() {
        document.querySelector('main').removeChild(this.#popup);
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

            console.log(`Trying to set Host ID: ${this.#peerID}`);
            const peer = new Peer(this.#peerID);

            peer.on('connection', (connection) => {
                console.log("New client: ", connection.peer);
                this.#connect.push(connection);

                connection.on('data', (data) => {
                    
                });
            });
        }
        else {
            console.log("Trying to connect to Host ID: ", idPeer);
            const peer = new Peer();

            peer.on('open', (clientId) => {
                console.log(`Client ID: ${clientId}`);

                const connection = peer.connect(idPeer);
                this.#connect.push(connection);

                connection.on('data', (data) => {
                    
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