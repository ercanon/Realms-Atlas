/*>--------------- { Web Initialization } ---------------<*/
document.addEventListener("DOMContentLoaded", async () => {
    document.main = document.body.getElementsByTagName("main")[0];
    window.urlSearch = new URLSearchParams(window.location.hash.substring(1));
    document.isHost = Boolean(window.urlSearch.get("dataURL"));

    /*>---------- [ Initialize Components ] ----------<*/
    MapHandler.init();

    /*>---------- [ Initialize Client ] ----------<*/
    const elemList = Object.fromEntries(
        Array.from(document.querySelectorAll("[init-hdl]"))
            .map(elem => [elem.id, elem])
    );

    if (document.isHost) {
        for (const elem of Object.values(elemList))
            elem.remove()

        //TODO
        DataHandler.parseData(JSON.parse(content), document.main);
        return;
    }

    /*>---------- [ Initialize Header Buttons ] ----------<*/
    const {
        dataShare,
        dataSave,
        dataClear,
        fileInput
    } = elemList;
    dataShare.addEventListener("click", async () => { //TODO

    });
    dataSave.addEventListener("click", async () => { //TODO

    });
    dataClear.addEventListener("click", () => { //TODO
        //popupClear.action = async () => {
        //    document.main.innerHTML = "";
        //    await DataHandler.clearAllData();
        //    StructureHandler.createStruct({ currentTarget: document.main });
        //    btnMode({ currentTarget: toggleMode, reset: true });
        //}
        //popupClear.hidden = false;

        LinkPopup();
    });

    /*>---------- [ Initialize Main ] ----------<*/
    //DataHandler.setDataBase(document.main);
    
    const [title, inputImg, inputURL] = [...fileInput.children];
    inputImg.addEventListener("change", MapHandler.loadLayer);
    inputURL.addEventListener("change", MapHandler.loadLayer);

    /*>---------- [ Initialize Google Drive ] ----------<*/
    //const LinkPopup = () =>
    //    new PopupHandler({
    //        type: "driveLink",
    //        classBtn: "iconBtn",
    //        titleText: "Sign in to Google Drive to manage savestates",
    //        func: [PopupHandler.setupDrivePopup]
    //    });
    //LinkPopup();
});

class PopupHandler {
    #bg = null;

    constructor(options) {
        const { type, classBtn, titleText, func } = options;
        this.#bg = L.DomUtil.create(
            "div",
            "bgPopup",
            document.body);
        this.#bg.role = type;
        this.#bg.style.setProperty("--columnLen", Math.min(func.length, 4));

        const title = L.DomUtil.create(
            "h1",
            "",
            this.#bg);
        title.innerText = titleText || "";

        for (const f of func) {
            const btn = L.DomUtil.create(
                "button",
                classBtn,
                this.#bg);
            btn.addEventListener("click", () => f(this));
        }
    }

    static #parserDOM = document.createRange();

    static async setupDrivePopup(popup) {
        if (!DataHandler.checkLinkState())
            await DataHandler.driveLink();

        let folder = await DataHandler.findFolder({ name: "Realms' Atlas" });
        popup.#bg.innerHTML = "<h3>Unnamed folders will not be saved!</h3>";
        if (!folder)
            folder = await DataHandler.createFolder("Realms' Atlas");
        else {
            const folderArray = await DataHandler.findFolder({ parentID: folder.id });
            for (const f of folderArray)
                popup.#bg.append(PopupHandler.#setSavEntry(popup, { folderID: f.id, folderName: f.name }));
        }

        const addSavEntry = L.DomUtil.create(
            "button",
            "iconBtn",
            popup.#bg);
        addSavEntry.id = "addSavEntry";
        addSavEntry.addEventListener("click", () =>
            popup.#bg.insertBefore(PopupHandler.#setSavEntry(popup, { parentID: folder.id }), addSavEntry));
    }
    static #setSavEntry(popup, { folderID, folderName = "", parentID }) {
        const newDOM = PopupHandler.#parserDOM.createContextualFragment(
            `<span class="savEntry">
                <input type="text" placeholder="Input name">
                <i hidden>Saved!</i>
                <button class="iconBtn"></button>
            </span>
            <hr>`);

        const fInput = newDOM.querySelector("input");
        const italicText = fInput.nextElementSibling;
        fInput.value = folderName;
        fInput.addEventListener("change", async (e) => {
            try {
                if (!e.target.value) {
                    e.target.value = folderName;
                    return alert("Invalid name!");
                }

                folderName = e.target.value.trim();
                if (!folderID) {
                    console.log(`Creating folder in Realms' Atlas Drive folder`);
                    folderID = (await DataHandler.createFolder(folderName, parentID)).id;
                    await DataHandler.makeFolderPublic(folderID);
                }
                await DataHandler.renameFolder(folderID, folderName);

                italicText.hidden = false;
                italicText.addEventListener("animationend", () =>
                    italicText.hidden = true, { once: true });
            } catch (error) {
                console.error(error);
                alert("Error renaming the folder");
            }
        });
        fInput.addEventListener("dblclick", async (e) => {
            //TODO: Load & rasterize content;

            DataHandller.getShareLink();
            popup.#bg.remove();
        });
        const savEntry = newDOM.firstElementChild;
        savEntry.lastElementChild.addEventListener("click", async () => {
            try {
                console.warn(`Deleting folder in Realms' Atlas Drive folder`);
                if (folderID)
                    await DataHandler.deleteFolder(folderID)

                savEntry.nextElementSibling.remove();
                savEntry.remove();
            } catch (error) {
                console.error(error);
                alert("Error deleting the folder");
            }
        });

        return newDOM;
    }
}

class DataHandler {
    /*>--------------- { IndexDb } ---------------<*/ //TODO
    static #dataBase = null;
    static #dbOrder = { section: 1, article: 2, div: 3 };

    static async setDataBase() {
        await new Promise((resolve, reject) => {
            const request = indexedDB.open("conductDB");

            request.onupgradeneeded = (event) => {
                const dataBase = event.target.result;
                for (const storeName of Object.keys(DataHandler.#dbOrder)) {
                    if (!dataBase.objectStoreNames.contains(storeName))
                        dataBase.createObjectStore(storeName, { keyPath: "id" })
                            .createIndex("ParentID", "parent", { unique: false });
                }
            };

            request.onsuccess = async (event) => {
                DataHandler.#dataBase = event.target.result;
                DataHandler.parseData(await DataHandler.exportFile(), document.getElementsByClassName("addStructBtn")[0]);
                resolve();
            };
            request.onerror = (event) =>
                reject(event.target.error);
        });
    }

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

    /*>--------------- { Google Drive  } ---------------<*/
    static #MIME_TYPE = {
        folder: "application/vnd.google-apps.folder",
        file: "",
    };

    static #clientToken = null;
    static #accessToken = null;
    static #dataURL = null;

    static async driveLink() {
        return new Promise((resolve, reject) => {
            DataHandler.#clientToken = google.accounts.oauth2.initTokenClient({
                client_id: "593386581690-5379pr9d4kjra7mfuk68dpmqd9ifpobr.apps.googleusercontent.com",
                scope: "https://www.googleapis.com/auth/drive.file",
                callback: (tokenResponse) => {
                    if (tokenResponse.access_token) {
                        DataHandler.#accessToken = tokenResponse.access_token;
                        resolve(tokenResponse.access_token);
                    }
                    else
                        reject(new Error("Cannot access token"));
                },
            });

            DataHandler.#clientToken.requestAccessToken();
        });
    }
    static checkLinkState() {
        return Boolean(DataHandler.#clientToken);
    }

    static async fetchDrive(url, options = {}, forceRequest = false) {
        let accessToken = DataHandler.#accessToken;

        if (!accessToken || forceRequest)
            DataHandler.#accessToken = accessToken = await DataHandler.#clientToken.requestAccessToken({ prompt: 'none' });

        let res = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!forceRequest && res.status === 401)
            res = await DataHandler.fetchDrive(url, options, true);
        return res;
    }
    static async findFolder({ name, parentID }) {
        let query = [`mimeType="${DataHandler.#MIME_TYPE["folder"]}"`, `trashed=false`]
        if (name)
            query.push(`name="${name}"`);
        if (parentID)
            query.push(`"${parentID}" in parents`);      

        let res = await DataHandler.fetchDrive(
            `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query.join(" and "))}`);

        const data = await res.json();
        const folder = data.files ?? [];

        if (name) {
            if (folder.length > 1)
                console.warn(`Multiple "${name}" folders. Using the first one.`);
            return folder[0];
        }
        if (!name && parentID)
            return folder || [];
        return null;
    }

    static async createFolder(name, parentID = null) {
        const res = await DataHandler.fetchDrive(
            "https://www.googleapis.com/drive/v3/files",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    mimeType: DataHandler.#MIME_TYPE["folder"],
                    ...(parentID && { parents: [parentID] }),
                }),
            }
        );

        return res.json();
    }
    static async deleteFolder(folderID) {
        const res = await DataHandler.fetchDrive(
            `https://www.googleapis.com/drive/v3/files/${folderID}`,
            { method: "DELETE" }
        );

        if (!res.ok) {
            const error = await res.text();
            throw new Error(`Cannot delete folder: ${error}`);
        }
        return true;
    }
    static async renameFolder(folderID, name) {
        if (!name)
            throw new Error("Invalid folder name.");

        const res = await DataHandler.fetchDrive(
            `https://www.googleapis.com/drive/v3/files/${folderID}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            }
        );

        if (!res.ok) {
            const error = await res.json();
            throw new Error(
                `Folder cannot be renamed: ${error.error?.message}`
            );
        }

        const updated = await res.json();
        return updated;
    }

    static async makeFolderPublic(folderID) {
        const res = await DataHandler.fetchDrive(
            `https://www.googleapis.com/drive/v3/files/${folderID}/permissions`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "anyone",
                    role: "reader",
                }),
            }
        );

        if (!res.ok) {
            const error = await res.json();
            throw new Error(
                `Cannot change permissions: ${error.error?.message}`
            );
        }

        const permission = await res.json();
        return permission;
    }
    static async getShareLink(folderID) {
        const res = await DataHandler.fetchDrive(
            `https://www.googleapis.com/drive/v3/files/${folderID}?fields=webViewLink`
        );

        if (!res.ok)
            throw new Error("Share Link cannot be obtained.");

        const data = await res.json();
        if (!data.webViewLink)
            throw new Error("The file has not webViewLink");

        return DataHandler.#dataURL = data.webViewLink;
    }


    /*>--------------- { Utils  } ---------------<*/
    //static async parseData(dataDOM, target, needStoring = false) {
    //    const orderedKeys = Object.entries(dataDOM)
    //        .sort(([keyA], [keyB]) =>
    //            (DataHandler.#dbOrder[keyA] || 99) - (DataHandler.#dbOrder[keyB] || 99));

    //    target = { main: target };
    //    for (const [storeName, data] of orderedKeys) {
    //        const structList = {};
    //        for (const storeData of data.sort((a, b) =>
    //            Number(a.order) - Number(b.order))) {
    //            const currentTarget = target[storeData.parent];
    //            if (currentTarget) {
    //                structList[storeData.id] = StructureHandler.createStruct({ currentTarget, storeData });
    //                if (needStoring)
    //                    await DataHandler.execData("put", [storeName], storeData);
    //            }
    //        }
    //        target = structList;
    //    }
    //}
    //static async exportFile() {
    //    return Object.assign({}, ...await Promise.all(
    //        [...DataHandler.#dataBase.objectStoreNames].map(async (storeName) =>
    //            ({ [storeName]: await DataHandler.execData("getAll", [storeName]) }))
    //    ));
    //}
    //static compressData({ id, ...data }) {
    //    const compressed = fflate.deflateSync(fflate.strToU8(JSON.stringify(data)));
    //    const base64 = btoa(String.fromCharCode(...compressed))
    //        .replace(/\+/g, "-")
    //        .replace(/\//g, "_")
    //        .replace(/=+$/, "");
    //    return `${id}=${base64}&`;
    //}

    //static hasSameNodes(target) {
    //    const targetKeys = Object.keys(target);
    //    const storeNames = [...DataHandler.#dataBase.objectStoreNames];

    //    return targetKeys.length <= storeNames.length && targetKeys.every((key) =>
    //        storeNames.includes(key));
    //}
    static parseMD(data) {
        return marked.parse(data.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, ""));
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
}