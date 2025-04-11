/*>--------------- { Web Initialization } ---------------<*/
document.addEventListener('DOMContentLoaded', async () => {
    //Start loading initial data
    const initDataPop = new PopupHandler("Loading previous session data...", true);

    const p2pID = new URLSearchParams(window.location.search).get("id");
    isHost = !p2pID;

    DataHandler.set(p2pID);
    MapHandler.set();

    const shareBtn = document.getElementById("headerShare");
    const dnldDataBtn = document.getElementById("headerDownload");
    const contElms = document.getElementById("imgInput");
    if (!isHost) {
        [shareBtn, dnldDataBtn, contElms].forEach((element) =>
            element.hidden = true);
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
        contElms.querySelector(`:scope > input[type="file"]`).addEventListener("change", async function () {
            const file = this.files?.[0];
            if (!file)
                return showError("No file selected.");

            try {
                const arrayBuffer = await file.arrayBuffer();
                //dataHdl.exec2Send("put", ["maps", "main", "buffer"], arrayBuffer);
                MapHandler.loadLayer(URL.createObjectURL(new Blob([arrayBuffer], { type: "image/webp" })), {
                    tileSize: 256,
                    maxNativeZoom: 4
                });
            }
            catch (error) {
                showError("Error loading input file.", error);
            }
            finally {
                this.value = "";
            }
        })
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

class PopupHandler { //TODO
    static #bgPopup = null;
    #popup = null;
    constructor(type, isVis) {
        if (!PopupHandler.#bgPopup)
            PopupHandler.#bgPopup = document.getElementById("bgPopup");

        this.#popup = L.DomUtil.create("div", "", PopupHandler.#bgPopup);
        this.#popup.hidden = true;
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
                this.#inputEvent([
                    {
                        button: Delete,
                        event: "click",
                        action: () => {
                            MapHandler.deleteMapLayer()
                            this.hide();
                        }
                    },
                    {
                        button: Cancel,
                        event: "click",
                        action: () =>
                            this.hide()
                    }
                ]);
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
    #inputEvent(funcList) {
        funcList.forEach(({ button, event, action }) =>
            L.DomEvent.on(button, event, action, this));
    }

    hide() {
        this.#popup.hidden = true;
        if ([...PopupHandler.#bgPopup.children].every((child) =>
            child.hidden))
            PopupHandler.#bgPopup.hidden = true;
    }
    reveal() {
        PopupHandler.#bgPopup.hidden = this.#popup.hidden = false;
    }
    delete() {
        this.hide();
        this.#popup.remove();
    }
}

class DataHandler { //TODO
    static #dataBase = null;
    static #peerID = null;
    static #connectList = [];
    static #popup = new PopupHandler("Receiving host data...");

    static async set(hostID) {
        if (isHost)
            DataHandler.#popup.reveal();

        //Create Database and load previous data
        await new Promise((resolve, reject) => {
            const request = indexedDB.open("atlasDB");

            request.onupgradeneeded = (event) => {
                const dataBase = event.target.result;
                ["maps", "entries", "markers"].forEach((storeName) => {
                    if (!dataBase.objectStoreNames.contains(storeName))
                        dataBase.createObjectStore(storeName);
                        //.createIndex("ParentID", "parent", { unique: false });
                });
            };

            request.onsuccess = (event) => {
                DataHandler.#dataBase = event.target.result;
                //parse
                resolve();
            };
            request.onerror = (event) => reject(event.target.error);
        });

        //Create P2P connection
        //const peer = new Peer(isHost ? DataHandler.#peerID = crypto.randomUUID() : undefined);
        //peer.on("open", (clientID) => {
        //    console.log(`Peer ID: ${!isHost ? "Client" : "Host"} - ${clientID}`);
        //    if (!isHost) {
        //        const conn = peer.connect(hostID);
        //        DataHandler.#setupConnection(conn);
        //    }
        //});
        //peer.on("connection", (conn) => {
        //    console.log("New client connected:", conn.peer);
        //    DataHandler.#setupConnection(conn);

        //    conn.on("open", async () => {
        //        //DataHandler.sendData({ type: "init", data: await dataHdl.getData("maps", "main") });
        //    });
        //});
    }

    /*>---------- [ Data Handeler ] ----------<*/
    static exec2Send(funcExec, storePath, data) {
        switch (funcExec) {
            case "put":
                DataHandler.saveData(storePath, data);
                break;
            case "delete":
                DataHandler.execData("delete", storePath);
                break;
        }
        DataHandler.sendData({ type: funcExec, data });
    }

    /*>---------- [ Database ] ----------<*/
    static async storeInnerData([storeName, pathID, objNode], data) {
        if (!data)
            throw new Error("Trying to save empty data.");

        const request = await DataHandler.execData("get", [storeName], pathID);
        const storedData = request?.[objNode] || request;
        if (Array.isArray(storedData))
            data = [...storedData, ...(Array.isArray(data) ? data : [data])];
        else if (typeof storedData === "object" && !Array.isArray(storedData))
            data = { ...storedData, ...data };
        else
            throw new Error("New data do not match previous data.");

        DataHandler.execData("put", [storeName], data);
        return data;
    }

    static async execData(funcExec, [storeName, indexName], data) {
        if (typeof funcExec !== "string")
            throw new Error("Function command is not string");

        return new Promise((resolve, reject) => {
            const transaction = DataHandler.#dataBase.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            const request = (indexName ? store.index(indexName) : store)[funcExec](data);

            request.onsuccess = (event) => resolve(event.target.result || null);
            request.onerror = (event) => reject(event.target.error);
        });
    }
    static async clearAllData() {
        await Promise.all(
            [...DataHandler.#dataBase.objectStoreNames].map((storeName) =>
                DataHandler.execData("clear", [storeName]))
        );
    }

    static async processData(storeName, data) {
        switch (storeName) {
            case "maps":
                MapHandler.loadMapImg(URL.createObjectURL(new Blob([data?.buffer], { type: "image/webp" })));
                break;
            case "entries":
                break;
            case "markers":
                break;
        }
    }

    static randomUUIDv4() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);

        array[6] = (array[6] & 0x0f) | 0x40;
        array[8] = (array[8] & 0x3f) | 0x80;

        return [...array].map((byte, i) =>
            [4, 6, 8, 10].includes(i) ? `-${byte.toString(16).padStart(2, '0')}` : byte.toString(16).padStart(2, '0')
        ).join('');
    }

    /*>---------- [ P2P Connection ] ----------<*/
    static #setupConnection(conn) {
        DataHandler.#connectList.push(conn);
        conn.on("error", (error) =>
            showError("Connection error.", error));
        conn.on("data", (income) => {
            try {
                DataHandler.#popup.setState("add");

                const incData = fflate.gunzipSync(income.data);
                switch (income.funcExec) {
                    case "incoming":
                        DataHandler.#popup.setState("remove");
                        DataHandler.processData(incData);
                        break;
                    case "put":
                        break;
                    case "delete":
                        break;
                    default:
                        throw new Error("Invalid data type received.");
                }
            }
            catch (error) {
                showError("Error processing incoming data.", error);
            }
        });
    }

    static sendData(data) {
        const compData = fflate.gzipSync(new Uint8Array(data), { level: 9 });
        DataHandler.#connectList.forEach((peer) => {
            peer.send({ type: "incoming" });
            peer.send(compData);
        });
    }
    static getPeerID() {
        return DataHandler.#peerID;
    }
}