import fs from 'node:fs/promises';
import path from 'node:path';
import { RequestRepository } from '../interfaces/RequestRepository.js';

export class FileRequestRepository extends RequestRepository {
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
        this._cache = JSON.parse(content);
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
    // ponytail: atomic write via temp file prevents corrupted JSON
    const tempFile = `${this.filePath}.tmp.${Date.now()}`;
    await fs.writeFile(tempFile, JSON.stringify(this._cache, null, 2), 'utf-8');
    await fs.rename(tempFile, this.filePath);
  }

  async findAll({ filter = {}, sort = {}, pagination = {} } = {}) {
    await this._ensureInitialized();

    let items = [...this._cache];

    if (filter.status) {
      items = items.filter((item) => item.status === filter.status);
    }
    if (filter.priority) {
      items = items.filter((item) => item.priority === filter.priority);
    }
    if (filter.equipmentId) {
      items = items.filter((item) => item.equipmentId === filter.equipmentId);
    }
    if (filter.createdFrom) {
      const fromTime = new Date(filter.createdFrom).getTime();
      items = items.filter((item) => new Date(item.createdAt).getTime() >= fromTime);
    }
    if (filter.createdTo) {
      const toTime = new Date(filter.createdTo).getTime();
      items = items.filter((item) => new Date(item.createdAt).getTime() <= toTime);
    }
    if (filter.plannedFrom) {
      const fromTime = new Date(filter.plannedFrom).getTime();
      items = items.filter((item) => item.plannedAt && new Date(item.plannedAt).getTime() >= fromTime);
    }
    if (filter.plannedTo) {
      const toTime = new Date(filter.plannedTo).getTime();
      items = items.filter((item) => item.plannedAt && new Date(item.plannedAt).getTime() <= toTime);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      items = items.filter(
        (item) => item.title.toLowerCase().includes(q) || (item.description && item.description.toLowerCase().includes(q))
      );
    }

    // Сортировка
    const sortBy = sort.sortBy || 'createdAt';
    const sortOrder = sort.sortOrder === 'asc' ? 1 : -1;

    items.sort((a, b) => {
      const valA = a[sortBy] || '';
      const valB = b[sortBy] || '';
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
    const item = this._cache.find((r) => r.id === id);
    return item ? { ...item } : null;
  }

  async findByEquipmentId(equipmentId, options = {}) {
    return this.findAll({
      ...options,
      filter: {
        ...(options.filter || {}),
        equipmentId
      }
    });
  }

  async hasActiveRequestsForEquipment(equipmentId) {
    await this._ensureInitialized();
    return this._cache.some(
      (r) => r.equipmentId === equipmentId && (r.status === 'new' || r.status === 'in_progress')
    );
  }

  async create(request) {
    await this._ensureInitialized();
    const entity = { ...request };
    this._cache.push(entity);
    await this._persist();
    return { ...entity };
  }

  async update(id, updates) {
    await this._ensureInitialized();
    const index = this._cache.findIndex((r) => r.id === id);
    if (index === -1) return null;

    const existing = this._cache[index];
    const updated = {
      ...existing,
      ...updates,
      id: existing.id,
      equipmentId: existing.equipmentId,
      createdAt: existing.createdAt,
      updatedAt: updates.updatedAt || new Date().toISOString()
    };

    this._cache[index] = updated;
    await this._persist();
    return { ...updated };
  }

  async delete(id) {
    await this._ensureInitialized();
    const index = this._cache.findIndex((r) => r.id === id);
    if (index === -1) return false;

    this._cache.splice(index, 1);
    await this._persist();
    return true;
  }
}

export default FileRequestRepository;
