/*>--------------- { EventListeners } ---------------<*/
document.addEventListener('DOMContentLoaded', async () => {
    tmplList = Object.fromEntries(
        [...document.querySelectorAll("template")].map((templ) => [templ.id, templ.content])
    );

    const loadDataPop = new PopDiv("Loading previous session data...");

    //// Import the functions you need from the SDKs you need
    //import { initializeApp } from "firebase/app";
    //import { getAnalytics } from "firebase/analytics";
    //// TODO: Add SDKs for Firebase products that you want to use
    //// https://firebase.google.com/docs/web/setup#available-libraries

    //// Your web app's Firebase configuration
    //// For Firebase JS SDK v7.20.0 and later, measurementId is optional
    //const firebaseConfig = {
    //    apiKey: "AIzaSyDe4BlhhKgw_6AhbhaWDYm_K6gYFZjpXw8",
    //    authDomain: "realms-atlas.firebaseapp.com",
    //    projectId: "realms-atlas",
    //    storageBucket: "realms-atlas.firebasestorage.app",
    //    messagingSenderId: "152043716829",
    //    appId: "1:152043716829:web:d71f9a3b3da320b7f09b34",
    //    measurementId: "G-MS41MYB512"
    //};

    //// Initialize Firebase
    //const app = initializeApp(firebaseConfig);
    //const analytics = getAnalytics(app);

    const p2pID = new URLSearchParams(window.location.search).get("id")
    isHost  = !p2pID;

    storeDB = await new DataBase();
    mapHdl  = await new MapHandeler();
    p2p     = await new P2P(p2pID);

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
                const compData = fflate.gzipSync(new Uint8Array(arrayBuffer), { level: 9 });

                storeDB.saveData("mapData", compData);
                p2p.sendData({
                    type: "img",
                    filename: file.name,
                    mimeType: file.type,
                    data: compData,
                });

                mapHdl.loadMapImg(URL.createObjectURL(new Blob([arrayBuffer], { type: "image/webp" })));
            }
            catch (error) {
                showError("Error loading input file.", error);
            }
            finally {
                this.value = "";
            }
        })
        fileInput.querySelector(`:scope > input[type="text"]`).addEventListener("change", async function () {
            const url = this.value.trim();
            if (!url)
                return showError("Please, provide a valid image URL.");

            try {
                const compData = fflate.gzipSync(url, { level: 9 });
                await storeDB.saveData("mapData", compData);

                p2p.sendData({
                    type: "url",
                    data: compData,
                });

                mapHdl.loadMapImg(url);
            }
            catch (error) {
                showError("Error loading image URL.", error);
            }
        })
    }
    
    try {
        if (isHost) {
            const savedData = await storeDB.getData("mapData");
            if (savedData) {
                const decompData = fflate.gunzipSync(savedData);
                mapHdl.loadMapImg(URL.createObjectURL(new Blob([decompData], { type: "image/webp" })));
            }
        }
    }
    catch (error) {
        showError("Error loading previous session data.", error);
    }
    finally {
        loadDataPop.delete();
    }
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

class DataBase {
    #dataBase = null;
    constructor() {
        return (async () => {
            await new Promise((resolve, reject) => {
                const request = indexedDB.open("storeDB", 1);

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
        const peer = !isHost ? new Peer() : new Peer(this.#peerID = crypto.randomUUID());

        peer.on("open", (clientID) => {
            console.log(`Peer ID: ${!isHost ? "Client" : "Host"} - ${clientID}`);
            if (!isHost) {
                const conn = peer.connect(hostID);
                this.#connect.push(conn);

                conn.on("data", (data) => this.#dataHdl(data));
                conn.on("error", (error) => showError("Connection error.", error));
            }
        })

        peer.on("connection", (conn) => {
            console.log("New client connected:", conn.peer);
            this.#connect.push(conn);

            conn.on("data", (data) =>
                this.#dataHdl(data));
            conn.on("error", (error) =>
                showError("Connection error.", error));

            conn.on("open", async () =>
                this.sendData({ type: "init", data: await storeDB.getData("mapData") }));
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
                    mapHdl.loadMapImg(URL.createObjectURL(new Blob([decompData], { type: "image/webp" })));
                    break;
                case "url":
                    decompData = fflate.gunzipSync(income.data);
                    mapHdl.loadMapImg(decompData);
                    break;
                case "del":
                    mapHdl.deleteMapLayer();
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