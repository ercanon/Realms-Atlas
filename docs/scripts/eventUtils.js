/*>--------------- { EventListeners } ---------------<*/
document.addEventListener('DOMContentLoaded', async () => {
    //Preload templates
    tmplList = Object.fromEntries(
        [...document.querySelectorAll("template")].map((tmpl) => [tmpl.id, tmpl.content])
    );

    //Start loading initial data
    const loadDataPop = new PopupInit("Loading previous session data...");

    const p2pID = new URLSearchParams(window.location.search).get("id");
    isHost  = !p2pID;

    dataHdl = await new DataHandeler(p2pID);
    mapHdl  = await new MapHandeler();

    const fileInput = document.getElementById("fileInput");
    const shareBtn = document.getElementById("shareBtn");
    if (!isHost)
        [shareBtn, fileInput].forEach((element) => element.classList.add("hide"));
    else
    {
        const shareURL = `${window.location.origin + window.location.pathname}?id=${dataHdl.getPeerID()}`;
        shareBtn.addEventListener("click", async () => {
            try {
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

        fileInput.querySelector(`:scope > input[type="file"]`).addEventListener("change", async function () {
            const file = this.files?.[0];
            if (!file)
                return showError("No file selected.");

            try {
                const arrayBuffer = await file.arrayBuffer();               
                dataHdl.exec2Send("put", ["maps", "main", "buffer"], arrayBuffer);
                mapHdl.loadMapImg(URL.createObjectURL(new Blob([arrayBuffer], { type: "image/webp" })));
            }
            catch (error) {
                showError("Error loading input file.", error);
            }
            finally {
                this.value = "";
            }
        })
    }
    
    loadDataPop.delete();
});



/*>--------------- { Utilities } ---------------<*/
function showError(message, error = null) {
    console.error(message, error);
    alert(message);
}

class PopupInit {
    #popup = null;
    constructor(type) {
        this.#popup = tmplList.popupTemplate.cloneNode(true).querySelector(".bgPopup");

        switch (type) {
            case "delLayer":
                const contDiv = this.#fillContent(
                    "Are you sure you want to delete this layer?",
                    "delLayer"
                );
                this.setState("add");

                const deleteBtn = document.createElement("button");
                deleteBtn.innerHTML = "Delete";
                deleteBtn.classList.add("deleteBtn");

                const cancelBtn = document.createElement("button");
                cancelBtn.innerHTML = "Cancel";
                cancelBtn.classList.add("cancelBtn");

                contDiv.append(deleteBtn, cancelBtn);

                deleteBtn.addEventListener("click", () =>
                    mapHdl.deleteMapLayer());
                cancelBtn.addEventListener("click", () =>
                    this.setState("add"));
                break;
            case "shareURL":
                break;
            default:
                this.#fillContent(type);
        }
        document.body.querySelector("main")?.appendChild(this.#popup);
    }
    #fillContent(msg, tag = "") {
        const innerDiv = this.#popup.querySelector(":scope > div");
        if (tag)
            innerDiv.classList.add(tag);
        innerDiv.querySelector(":scope > h2").innerHTML = msg;
        return innerDiv;
    }

    setState(state) {
        this.#popup.classList[state]("hide");
    }

    delete() {
        this.#popup.remove(); 
    }
}

class DataHandeler {
    #dataBase = null;
    #peerID = null;
    #connect = [];
    #popup = new PopupInit("Receiving host data...");

    constructor(hostID) {
        return (async () => {
            if (isHost)
                this.#popup.setState("add");

            //Create Database and load previous data
            await new Promise((resolve, reject) => {
                const request = indexedDB.open("atlasDB");

                request.onupgradeneeded = (event) => {
                    const dataBase = event.target.result;
                    ["maps", "entries", "markers"].forEach((storeName) => {
                        if (!dataBase.objectStoreNames.contains(storeName))
                            dataBase.createObjectStore(storeName);
                    });
                };

                request.onsuccess = (event) => {
                    this.#dataBase = event.target.result;
                    resolve();
                };
                request.onerror = (event) => reject(event.target.error);
            });
            [...this.#dataBase.objectStoreNames].map((storeName) => {
                this.#execData("getAll", [storeName]).then((allData) => {
                    allData.forEach((pathData) =>
                        this.processData(storeName, pathData));
                });
            });

            //Create P2P connection
            const peer = new Peer(isHost ? this.#peerID = crypto.randomUUID() : undefined);
            peer.on("open", (clientID) => {
                console.log(`Peer ID: ${!isHost ? "Client" : "Host"} - ${clientID}`);
                if (!isHost) {
                    const conn = peer.connect(hostID);
                    this.#setupConnection(conn);
                }
            });
            peer.on("connection", (conn) => {
                console.log("New client connected:", conn.peer);
                this.#setupConnection(conn);

                conn.on("open", async () => {
                    //this.sendData({ type: "init", data: await dataHdl.getData("maps", "main") });
                });
            });

            return this;
        })();
    }

    /*>---------- [ Data Handeler ] ----------<*/
    exec2Send(funcExec, storePath, data) {
        switch (funcExec) {
            case "put":
                this.saveData(storePath, data);
                break;
            case "delete":
                this.#execData("delete", storePath);
                break;
        }
        this.sendData({ type: funcExec, data });
    }

    /*>---------- [ Database ] ----------<*/
    async saveData([storeName, pathID, objNode], data) {
        if (!data)
            throw new Error("Trying to save empty data.");

        const storedData = await this.#execData("get", [storeName, pathID]) || {};
        const arrayData = storedData[objNode];
        if (Array.isArray(arrayData) && Array.isArray(data))
            data = [...arrayData, ...data];
        else if (typeof storedData === 'object' && typeof data === 'object')
            data = { ...storedData, [objNode]: data };
        else
            throw new Error("Data type do not match to previous data.");

        this.#execData("put", [storeName, data], pathID); //pathID and Data must be switched for "put" to work
    }

    async #execData(funcExec, [storeName, pathID], data) {
        return new Promise((resolve, reject) => {            
            const transaction = this.#dataBase.transaction(storeName, "readwrite");
            const request = transaction.objectStore(storeName)[funcExec](pathID, data);

            request.onsuccess = (event) => resolve(event.target.result || null);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async processData(storeName, data) {
        switch (storeName) {
            case "maps":
                mapHdl.loadMapImg(URL.createObjectURL(new Blob([data?.buffer], { type: "image/webp" })));
                break;
            case "entries":
                break;
            case "markers":
                break;
        }
    }

    /*>---------- [ P2P Connection ] ----------<*/
    #setupConnection(conn) {
        this.#connect.push(conn);
        conn.on("error", (error) =>
            showError("Connection error.", error));
        conn.on("data", (income) => {
            try {
                this.#popup.setState("add");

                const incData = fflate.gunzipSync(income.data);
                switch (income.funcExec) {
                    case "incoming":
                        this.#popup.setState("remove");
                        this.processData(incData);
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

    sendData(data) {
        const compData = fflate.gzipSync(new Uint8Array(data), { level: 9 });
        this.#connect.forEach((peer) => {
            peer.send({ type: "incoming" });
            peer.send(compData);
        });
    }
    getPeerID() {
        return this.#peerID;
    }
}

