class DataBase {
    constructor(nameDB) {
        this.nameDB = nameDB;
        this.dataBase = null;
        this.initDB();
    }

    async initDB(nameStore = '') {
        this.dataBase = await new Promise((resolve, reject) => {
            const request = indexedDB.open(this.nameDB, (this.dataBase?.version ?? 0) + 1);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
            if (nameStore !== null && nameStore !== '') {
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(nameStore))
                        db.createObjectStore(nameStore, { keyPath: 'id' });
                };
            }
        });
    }

    async addStore(nameStore) {
        this.dataBase.close();
        await this.initDB(nameStore);
    }

    async saveTile(zxy, nameStore, blob) {
        return new Promise((resolve, reject) => {
            const transaction = this.dataBase.transaction([nameStore], 'readwrite');
            const store = transaction.objectStore(nameStore);
            const id = `${zxy[0]}/${zxy[1]}/${zxy[2]}`;
            const request = store.put({ id, blob });

            request.onsuccess = resolve;
            request.onerror = reject;
        });
    }

    async getTile(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.dataBase.transaction([TILE_STORE], 'readonly');
            const store = transaction.objectStore(TILE_STORE);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result ? request.result.blob : null);
            request.onerror = reject;
        });
    }
}