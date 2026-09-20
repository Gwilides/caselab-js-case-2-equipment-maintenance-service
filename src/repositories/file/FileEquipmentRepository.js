import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { EquipmentRepository } from '../interfaces/EquipmentRepository.js';

export class FileEquipmentRepository extends EquipmentRepository {
  constructor(filePath) {
    super();
    this.filePath = filePath;
    this._cache = null;
    this._initPromise = null;
  }

  async _ensureInitialized() {
    if (this._cache !== null) return;
    if (this._initPromise) return this._initPromise;

    this._initPromise = (async () => {
      try {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        const content = await fs.readFile(this.filePath, 'utf-8');
        this._cache = content.trim().length > 0 ? JSON.parse(content) : [];
      } catch (err) {
        if (err.code === 'ENOENT') {
          this._cache = [];
          await this._persist();
        } else {
          throw err;
        }
      }
    })();

    await this._initPromise;
  }

  async _persist() {
    const tempFile = `${this.filePath}.tmp.${Date.now()}_${crypto.randomUUID()}`;
    await fs.writeFile(tempFile, JSON.stringify(this._cache, null, 2), 'utf-8');
    await fs.rename(tempFile, this.filePath);
  }

  async findAll({ filter = {}, sort = {}, pagination = {} } = {}) {
    await this._ensureInitialized();

    let items = [...this._cache];

    if (filter.status) {
      items = items.filter((item) => item.status === filter.status);
    }
    if (filter.type) {
      items = items.filter((item) => item.type === filter.type);
    }
    if (filter.installedFrom) {
      const fromTime = new Date(filter.installedFrom).getTime();
      items = items.filter(
        (item) => item.installedAt && new Date(item.installedAt).getTime() >= fromTime
      );
    }
    if (filter.installedTo) {
      const toTime = new Date(filter.installedTo).getTime();
      items = items.filter(
        (item) => item.installedAt && new Date(item.installedAt).getTime() <= toTime
      );
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      items = items.filter(
        (item) => item.name.toLowerCase().includes(q) || item.serialNumber.toLowerCase().includes(q)
      );
    }

    // Сортировка
    const sortBy = sort.sortBy || 'createdAt';
    const sortOrder = sort.sortOrder === 'asc' ? 1 : -1;

    items.sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];
      if (valA < valB) return -1 * sortOrder;
      if (valA > valB) return 1 * sortOrder;
      return 0;
    });

    const total = items.length;
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;
    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit);

    return {
      items: paginatedItems.map((item) => ({ ...item })),
      total
    };
  }

  async findById(id) {
    await this._ensureInitialized();
    const item = this._cache.find((e) => e.id === id);
    return item ? { ...item } : null;
  }

  async findBySerialNumber(serialNumber) {
    await this._ensureInitialized();
    const item = this._cache.find(
      (e) => e.serialNumber.toLowerCase() === serialNumber.toLowerCase()
    );
    return item ? { ...item } : null;
  }

  async create(equipment) {
    await this._ensureInitialized();
    const entity = { ...equipment };
    this._cache.push(entity);
    await this._persist();
    return { ...entity };
  }

  async update(id, updates) {
    await this._ensureInitialized();
    const index = this._cache.findIndex((e) => e.id === id);
    if (index === -1) return null;

    const existing = this._cache[index];
    const updated = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: updates.updatedAt || new Date().toISOString()
    };

    this._cache[index] = updated;
    await this._persist();
    return { ...updated };
  }

  async delete(id) {
    await this._ensureInitialized();
    const index = this._cache.findIndex((e) => e.id === id);
    if (index === -1) return false;

    this._cache.splice(index, 1);
    await this._persist();
    return true;
  }
}

export default FileEquipmentRepository;
