/*>--------------- { Web Initialization } ---------------<*/
document.addEventListener("DOMContentLoaded", async () => {
    document.main = document.body.getElementsByTagName("main")[0];
    window.urlSearch = new URLSearchParams(window.location.hash.substring(1));
    DataHandler.dataURL = window.urlSearch.get("dataURL");

    /*>---------- [ Initialize Global Components ] ----------<*/
    //PopupHandler.preparePopup(document.getElementById("popupInfo"));

    /*>---------- [ Initialize Client ] ----------<*/
    const elemList = Object.fromEntries(
        Array.from(document.querySelectorAll("[init-hdl]"))
            .map(elem => [elem.id, elem])
    );

    if (DataHandler.dataURL) {
        for (const elem of Object.values(elemList))
            elem.remove()

            //TODO
        DataHandler.parseData(JSON.parse(content), document.main);
        return;
    }

    /*>---------- [ Initialize Components ] ----------<*/
    const {
        bgPopup,
        dataLink,
        dataShare,
        dataSave,
        dataClear
    } = elemList;
    //DataHandler.setDataBase(document.main);

    /*>---------- [ Initialize Header Buttons ] ----------<*/
    dataLink.addEventListener("click", async () => {
        DataHandler.clientToken = google.accounts.oauth2.initTokenClient({
            client_id: "593386581690-5379pr9d4kjra7mfuk68dpmqd9ifpobr.apps.googleusercontent.com",
            scope: "https://www.googleapis.com/auth/drive.file",
            callback: (tokenResponse) => {
                DataHandler.accessToken = tokenResponse.access_token;

                dataLink.hidden = true;
                dataShare.hidden = false;
                dataSave.hidden = false;
            },
        });

        DataHandler.clientToken.requestAccessToken();
    });
    dataShare.addEventListener("click", async () => {

    });
    dataSave.addEventListener("click", async () => { //TODO
        const { accessToken, clientToken } = DataHandler;

        await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!accessToken || res.status === 401) {
            clientToken.requestAccessToken({ prompt: 'none' });
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                Authorization: `Bearer ${accessToken}`,
            },
        });
    });
    //dataClear.addEventListener("click", () => {
    //    popupClear.action = async () => {
    //        document.main.innerHTML = "";
    //        await DataHandler.clearAllData();
    //        StructureHandler.createStruct({ currentTarget: document.main });
    //        btnMode({ currentTarget: toggleMode, reset: true });
    //    }
    //    popupClear.hidden = false;
    //});
});

class PopupHandler {
    //static #popupInfo = null;

    //static preparePopup(popup) {
    //    popup.addEventListener("mousedown", (event) => {
    //        if (event.target === popup) {
    //            popup.hidden = true;
    //            requestAnimationFrame(() =>
    //                PopupHandler.#popupInfo.client = null);
    //        }
    //    });

    //    const textEdit = popup.firstElementChild;
    //    const textResult = popup.querySelector("section > span");
    //    textEdit.addEventListener("input", (event) =>
    //        textResult.innerHTML = DataHandler.parseMD(event.currentTarget.value));
    //    textEdit.addEventListener("change", async (event) => {
    //        const { client } = PopupHandler.#popupInfo || {};
    //        if (client) {
    //            DataHandler.storeInnerData([client.localName, client.id], { rawMD: event.currentTarget.value });
    //            client.rawMD = event.currentTarget.value;
    //        }
    //    });

    //    PopupHandler.#popupInfo = popup.lastElementChild;
    //}
    //static async openPopup(event) {
    //    const { currentTarget } = event;
    //    if (!currentTarget.draggable) {
    //        const { children, style, parentNode, previousElementSibling } = PopupHandler.#popupInfo;

    //        const getTitleMatch = (attribute, target) =>
    //            attribute.innerText = target.querySelector(`.${target.localName}-title`)?.value || "";

    //        const [entryTitle, sectionTitle, textResult] = children;
    //        const section = currentTarget.closest("section.dynStruct");
    //        const colorVar = "--sectionColor";

    //        if (!previousElementSibling)
    //            textResult.innerHTML = DataHandler.parseMD(currentTarget.rawMD);
    //        else {
    //            PopupHandler.#popupInfo.client = currentTarget;
    //            previousElementSibling.value = currentTarget.rawMD || "";
    //            previousElementSibling.dispatchEvent(new Event("input"));
    //        }

    //        style.setProperty(colorVar, section.style.getPropertyValue(colorVar));
    //        getTitleMatch(sectionTitle, section);
    //        getTitleMatch(entryTitle, currentTarget);

    //        parentNode.hidden = false;
    //    }
    //}
}

class DataHandler {
    //static #dataBase = null;
    //static #dbOrder = { section: 1, article: 2, div: 3 };
    static dataURL = null;
    static clientToken = null;

    //static async setDataBase() {
    //    await new Promise((resolve, reject) => {
    //        const request = indexedDB.open("conductDB");

    //        request.onupgradeneeded = (event) => {
    //            const dataBase = event.target.result;
    //            for (const storeName of Object.keys(DataHandler.#dbOrder)) {
    //                if (!dataBase.objectStoreNames.contains(storeName))
    //                    dataBase.createObjectStore(storeName, { keyPath: "id" })
    //                        .createIndex("ParentID", "parent", { unique: false });
    //            }
    //        };

    //        request.onsuccess = async (event) => {
    //            DataHandler.#dataBase = event.target.result;
    //            DataHandler.parseData(await DataHandler.exportFile(), document.getElementsByClassName("addStructBtn")[0]);
    //            resolve();
    //        };
    //        request.onerror = (event) =>
    //            reject(event.target.error);
    //    });
    //}

    //static async storeInnerData([storeName, pathID, objNode], data) {
    //    if (!data)
    //        throw new Error("Trying to save empty data.");

    //    const request = await DataHandler.execData("get", [storeName], pathID);
    //    const storedData = request?.[objNode] || request;
    //    if (Array.isArray(storedData))
    //        data = [...storedData, ...(Array.isArray(data) ? data : [data])];
    //    else if (typeof storedData === "object" && !Array.isArray(storedData))
    //        data = { ...storedData, ...data };
    //    else
    //        throw new Error("New data do not match previous data.");

    //    DataHandler.execData("put", [storeName], data);
    //    return data;
    //}
    //static async execData(funcExec, [storeName, indexName], data) {
    //    if (typeof funcExec !== "string")
    //        throw new Error("Function command is not string");

    //    return new Promise((resolve, reject) => {
    //        const transaction = DataHandler.#dataBase.transaction(storeName, "readwrite");
    //        const store = transaction.objectStore(storeName);
    //        const request = (indexName ? store.index(indexName) : store)[funcExec](data);

    //        request.onsuccess = (event) => resolve(event.target.result || null);
    //        request.onerror = (event) => reject(event.target.error);
    //    });
    //}
    //static async clearAllData() {
    //    await Promise.all(
    //        [...DataHandler.#dataBase.objectStoreNames].map((storeName) =>
    //            DataHandler.execData("clear", [storeName]))
    //    );
    //}

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
    ////static compressData({ id, ...data }) {
    ////    const compressed = fflate.deflateSync(fflate.strToU8(JSON.stringify(data)));
    ////    const base64 = btoa(String.fromCharCode(...compressed))
    ////        .replace(/\+/g, "-")
    ////        .replace(/\//g, "_")
    ////        .replace(/=+$/, "");
    ////    return `${id}=${base64}&`;
    ////}

    //static parseMD(data) {
    //    return marked.parse(data.replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, ""));
    //}
    //static hasSameNodes(target) {
    //    const targetKeys = Object.keys(target);
    //    const storeNames = [...DataHandler.#dataBase.objectStoreNames];

    //    return targetKeys.length <= storeNames.length && targetKeys.every((key) =>
    //        storeNames.includes(key));
    //}
    //static randomUUIDv4() {
    //    const array = new Uint8Array(16);
    //    crypto.getRandomValues(array);

    //    array[6] = (array[6] & 0x0f) | 0x40;
    //    array[8] = (array[8] & 0x3f) | 0x80;

    //    return [...array].map((byte, i) =>
    //        [4, 6, 8, 10].includes(i) ? `-${byte.toString(16).padStart(2, '0')}` : byte.toString(16).padStart(2, '0')
    //    ).join('');
    //}
}