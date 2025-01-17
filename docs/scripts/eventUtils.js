/*>--------------- { EventListeners } ---------------<*/
document.addEventListener('DOMContentLoaded', async () => {
    //Preload templates
    tmplList = Object.fromEntries(
        [...document.querySelectorAll("template")].map((tmpl) => [tmpl.id, tmpl.content])
    );

    //Start loading initial data
    const loadDataPop = new PopDiv("Loading previous session data...");

    const p2pID = new URLSearchParams(window.location.search).get("id")
    isHost  = !p2pID;

    dataHdl = await new DataHandeler();
    mapHdl  = await new MapHandeler();

    const fileInput = document.getElementById("fileInput");
    if (!isHost)
        [shareBtn, fileInput].forEach((element) => element.classList.add("hide"));
    else
    {
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

        fileInput.querySelector(`:scope > input[type="file"]`).addEventListener("change", async function () {
            const file = this.files?.[0];
            if (!file)
                return showError("No file selected.");

            try {
                const arrayBuffer = await file.arrayBuffer();               
                dataHdl.exec2Send("put", ["maps", "main"], arrayBuffer);
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

class PopDiv {
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
    #popup = new PopDiv("Receiving host data...");

    constructor(hostID) {
        return (async () => {
            if (isHost)
                this.#popup.setState("add");

            //Create Database and load previous data
            await this.#createObjectStore();
            [...this.#dataBase.objectStoreNames].map(async (storeName) => {
                const allData = await this.execData("getAll", [storeName]);
                this.processData(allData);
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
                    this.sendData({ type: "init", data: await dataHdl.getData("maps", "main") });
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
        }
        this.sendData({ type: funcExec, data });
    }

    /*>---------- [ Database ] ----------<*/
    async #createObjectStore(storeName) {
        return new Promise((resolve, reject) => {
            this.#dataBase?.close();
            const request = indexedDB.open("atlasDB", this.#dataBase?.version + 1 || undefined);

            request.onupgradeneeded = (event) => {
                const dataBase = event.target.result;
                const initObjectStore = (storeName) => {
                    if (!dataBase.objectStoreNames.contains(storeName))
                        dataBase.createObjectStore(storeName, { keyPath: "pathID" });
                };

                if (!storeName)
                    ["Maps", "Entries", "Markers"].forEach(initObjectStore);
                else
                    initObjectStore(storeName)
            };

            request.onsuccess = (event) => {
                this.#dataBase = event.target.result;
                resolve();
            };
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async saveData([storeName, pathID], data) {
        if (!data)
            throw new Error("Trying to save empty data."));

        const storedData = await this.#execData("get", storeName, pathID);
        if (typeof storedData === 'object' && typeof data === 'object')
            data = { ...storedData, ...data };
        else
            throw new Error("Data type do not match to previous data.");

        this.#execData((store) => store.put(data, pathID), storeName  );
    }

    async #execData(funcExec, storeName) {
        if (!this.#dataBase.objectStoreNames.contains(storeName))         
            throw new Error("Store database do not exist.");       

        return new Promise((resolve, reject) => {
            const transaction = this.#dataBase.transaction(storeName, "readwrite");
            const store = transaction.objectStore(storeName);
            const request = funcExec(store);

            request.onsuccess = (event) => resolve(event.target.result?.data || null);
            request.onerror = (event) => reject(event.target.error);
        });
    }
    //if(storedData) {
    //    if (typeof storedData === 'object' && typeof data === 'object') {
    //        for (const key in data) {
    //            if (Array.isArray(storedData[key]) && Array.isArray(data[key])) {
    //                storedData[key] = [...new Set([...storedData[key], ...data[key]])];
    //            } else {
    //                storedData[key] = data[key];
    //            }
    //        }
    //    } else {
    //        return reject(new Error("Data type do not match to previous data."));
    //    }
    //}
    async processData() {

    }

    /*>---------- [ P2P Connection ] ----------<*/
    #setupConnection(conn) {
        this.#connect.push(conn);
        conn.on("error", (error) =>
            showError("Connection error.", error));
        conn.on("data", (income) => {
            try {
                this.#popup.setState("add");
                switch (income.funcExec) {
                    case "incoming":
                        this.#popup.setState("remove");
                        break;
                    case "delete":
                        break;
                    default:
                        if (Array.isArray(income.type))
                            this.delData(income.type);
                        else
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
    getID() {
        return this.#peerID;
    }
}

