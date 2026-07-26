import { withStore, requestToPromise } from "./db.js";

/**
 * BaseRepository — operasi CRUD generik di atas satu object store.
 * Repository spesifik (Student, Class, dst) meng-extend class ini.
 */
export class BaseRepository {
  constructor(storeName) {
    this.storeName = storeName;
  }

  async getAll() {
    return withStore(this.storeName, "readonly", (store) =>
      requestToPromise(store.getAll())
    );
  }

  async getById(id) {
    return withStore(this.storeName, "readonly", (store) =>
      requestToPromise(store.get(id))
    );
  }

  async getByIndex(indexName, value) {
    return withStore(this.storeName, "readonly", (store) =>
      requestToPromise(store.index(indexName).getAll(value))
    );
  }

  async add(record) {
    return withStore(this.storeName, "readwrite", (store) => {
      store.add(record);
      return record;
    });
  }

  async put(record) {
    return withStore(this.storeName, "readwrite", (store) => {
      store.put(record);
      return record;
    });
  }

  async remove(id) {
    return withStore(this.storeName, "readwrite", (store) => {
      store.delete(id);
      return id;
    });
  }
}
