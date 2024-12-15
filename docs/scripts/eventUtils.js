/*>--------------- { EventListeners } ---------------<*/
window.onload = async () => {
    const loadDataPop = new PopDiv("Loading previous session data...");

    const p2pID = new URLSearchParams(window.location.search).get("id")

    mapDB  = await new DataBase();
    mapHdl = await new MapHandeler(!p2pID);
    p2p    = await new P2P(p2pID);

    if (p2pID)
        ["fileInput", "shareBtn"].forEach((id) => document.getElementById(id).classList.add("hide"));

    
    try {
        const savedData = await mapDB.getData("mapData");
        if (savedData) {
            const decompData = fflate.gunzipSync(savedData);
            loadImg(URL.createObjectURL(new Blob([decompData], { type: "image/webp" })));
        }
    }
    catch (error) {
        showError("Error loading previous session data.", error);
    }
    finally {
        loadDataPop.delete();
    }
};

document.getElementById("shareBtn").addEventListener("click", async () => { 
    try {
        const shareURL = `${window.location.origin + window.location.pathname}?id=${window.p2p.getID()}`; 

        if (navigator.share) {
            await navigator.share({
                title: "URL for your Realms' Atlas Spectators",
                url: shareURL,
            });
        }
        else {
            navigator.clipboard.writeText(shareURL);
            alert("URL copied to clipboard!");
        }
    }
    catch (error) {
        showError("Error sharing URL.", error);
    }
});

document.getElementById("uploadImg").addEventListener("change", async function () {
    const file = this.files?.[0];
    if (!file)
        return showError("No file selected.");

    try {
        const arrayBuffer = await file.arrayBuffer();
        const compData = fflate.gzipSync(new Uint8Array(arrayBuffer), { level: 9 });

        mapDB.saveData("mapData", compData);
        p2p.sendData({
            type: "img",
            filename: file.name,
            mimeType: file.type,
            data: compData,
        });

        loadImg(URL.createObjectURL(new Blob([arrayBuffer], { type: "image/webp" })));
    }
    catch (error) {
        showError("Error loading input file.", error);
    }
    finally {
        this.value = "";
    }
})
document.getElementById("imgUrl").addEventListener("change", async function () {
    const url = this.value.trim();
    if (!url)
        return showError("Please, provide a valid image URL.");

    try {
        const compData = fflate.gzipSync(url, { level: 9 });
        await mapDB.saveData("mapData", compData);

        p2p.sendData({
            type: "url",
            data: compData,
        });

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
        const bg = document.createElement("div");
        bg.className = "bgPopup hide";
        document.querySelector("main").appendChild(bg);
        this.#popup = bg;

        switch (id) {
            case "delLayer":
                this.#createDelLayer();
                break;
            case "shareURL":
                break;
            default:
                this.#createMsg(id);
        }
    }

    #createDelLayer() {
        const cont = document.createElement("div");
        cont.className = "delLayer";
        cont.innerHTML =
            `<h2>Are you sure you want to delete this layer?</h2>
            <button id="deleteBtn">Delete</button>
            <button id="cancelBtn">Cancel</button>`;

        this.#popup.appendChild(cont);

        cont.querySelector("#deleteBtn").addEventListener("click", () => mapHdl.deleteLayer());
        cont.querySelector("#cancelBtn").addEventListener("click", () => this.hide());
    }
    #createMsg(msg) {
        const cont = document.createElement("div");
        cont.className = "loadMsg";
        cont.innerHTML =
            `<h2>${msg}</h2>`;

        this.#popup.appendChild(cont);
        this.show();
    }

    show() {
        this.#popup.classList.remove("hide");
    }

    hide() {
        this.#popup.classList.add("hide");
    }

    delete() {
        this.#popup.remove(); 
    }
}

class DataBase {
    #dataBase = null;
    constructor() {
        return (async () => {
            await new Promise((resolve, reject) => {
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
            return this;
        })();
    }

    #accessData(opFunct) {
        return new Promise((resolve, reject) => {
            const transaction = this.#dataBase.transaction("mapData", "readwrite");
            const store = transaction.objectStore("mapData");

            const request = opFunct(store);

            request.onsuccess = (event) => resolve(event.target.result?.data || null);
            request.onerror = (event) => reject(event.target.error)
        });
    }

    saveData(nameObj, data) {
        return this.#accessData((store) => store.put({ nameObj, data }) );
    }

    getData(nameObj) {
        return this.#accessData((store) => store.get(nameObj));
    }

    delData(nameObj) {
        return this.#accessData((store) => store.delete(nameObj));
    }
}

class P2P {
    #connect = [];
    #peerID = null;
    constructor(hostID) {
        const peer = hostID ? new Peer() : new Peer(this.#peerID = crypto.randomUUID());

        peer.on("open", (clientID) => {
            console.log(`Peer ID: ${hostID ? "Client" : "Host"} - ${clientID}`);
            if (hostID) {
                const conn = peer.connect(hostID);
                this.#connect.push(conn);

                conn.on("data", (data) => this.#dataHdl(data));
                conn.on("error", (error) => showError("Connection error.", error));
            }
        })

        peer.on("connection", (conn) => {
            console.log("New client connected:", conn.peer);
            this.#connect.push(conn);

            conn.on("data", (data) => this.#dataHdl(data));
            conn.on("error", (error) => showError("Connection error.", error));

            conn.on("open", async () => this.sendData({ type: "init", data: await mapDB.getData("mapData") }) );
        });
    }

    #dataHdl = (income) => {
        try {
            let decompData = null;
            switch (income.type) {
                case "init":
                    if (!income.data)
                        return console.warn("Receiving null data.")
                case "img":
                    decompData = fflate.gunzipSync(income.data);
                    loadImg(URL.createObjectURL(new Blob([decompData], { type: "image/webp" })));
                    break;
                case "url":
                    decompData = fflate.gunzipSync(income.data);
                    loadImg(decompData);
                    break;
                case "del":
                    mapHdl.deleteLayer();
                    break;
                default:
                    throw new Error("Invalid data type received.");
            }
        }
        catch (error) {
            showError("Error processing incoming data.", error);
        }
    }

    getID() {
        return this.#peerID;
    }

    sendData(data) {
        this.#connect.forEach((peer) => peer.send(data));
    }
}