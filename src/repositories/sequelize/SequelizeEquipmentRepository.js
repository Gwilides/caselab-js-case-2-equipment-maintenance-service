import { Op } from 'sequelize';
import crypto from 'node:crypto';
import { EquipmentRepository } from '../interfaces/EquipmentRepository.js';
import { sequelize, Equipment, EquipmentPassport, Site } from '../../db/models/index.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

function parseDateBoundary(dateStr, isEndOfDay = false) {
  if (!dateStr) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + (isEndOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z'));
  }
  return new Date(dateStr);
}

const ALLOWED_SORT_FIELDS = [
  'id',
  'name',
  'type',
  'serialNumber',
  'status',
  'installedAt',
  'createdAt',
  'updatedAt'
];

export class SequelizeEquipmentRepository extends EquipmentRepository {
  async findAll({ filter = {}, sort = {}, pagination = {} } = {}) {
    const where = {};

    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.type) {
      where.type = filter.type;
    }

    if (filter.installedFrom && filter.installedTo) {
      where.installedAt = {
        [Op.gte]: parseDateBoundary(filter.installedFrom, false),
        [Op.lte]: parseDateBoundary(filter.installedTo, true)
      };
    } else if (filter.installedFrom) {
      where.installedAt = {
        [Op.gte]: parseDateBoundary(filter.installedFrom, false)
      };
    } else if (filter.installedTo) {
      where.installedAt = {
        [Op.lte]: parseDateBoundary(filter.installedTo, true)
      };
    }

    if (filter.search) {
      const q = `%${filter.search}%`;
      where[Op.or] = [{ name: { [Op.iLike]: q } }, { serialNumber: { [Op.iLike]: q } }];
    }

    const sortBy = ALLOWED_SORT_FIELDS.includes(sort.sortBy) ? sort.sortBy : 'createdAt';
    const sortOrder = sort.sortOrder && sort.sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const page = Math.max(1, parseInt(pagination.page || 1, 10));
    const limit = Math.min(100, Math.max(1, parseInt(pagination.limit || 10, 10)));
    const offset = (page - 1) * limit;

    const { rows, count } = await Equipment.findAndCountAll({
      where,
      order: [[sortBy, sortOrder]],
      limit,
      offset,
      include: [
        {
          model: EquipmentPassport,
          as: 'passport',
          attributes: ['id', 'manufacturer', 'model', 'powerRating', 'lastInspectionDate']
        },
        {
          model: Site,
          as: 'site',
          attributes: ['id', 'name', 'code', 'region']
        }
      ],
      distinct: true
    });

    return {
      items: rows.map((row) => row.toJSON()),
      total: count
    };
  }

  async findById(id) {
    if (!isValidUUID(id)) return null;

    const item = await Equipment.findByPk(id, {
      include: [
        {
          model: EquipmentPassport,
          as: 'passport',
          attributes: ['id', 'manufacturer', 'model', 'powerRating', 'lastInspectionDate']
        },
        {
          model: Site,
          as: 'site',
          attributes: ['id', 'name', 'code', 'region', 'lat', 'lon']
        }
      ]
    });

    return item ? item.toJSON() : null;
  }

  async findBySerialNumber(serialNumber) {
    if (!serialNumber || typeof serialNumber !== 'string') return null;
    const item = await Equipment.findOne({
      where: {
        serialNumber: {
          [Op.iLike]: serialNumber
        }
      },
      include: [
        {
          model: EquipmentPassport,
          as: 'passport',
          attributes: ['id', 'manufacturer', 'model', 'powerRating', 'lastInspectionDate']
        }
      ]
    });

    return item ? item.toJSON() : null;
  }

  async create(equipmentData) {
    return await sequelize.transaction(async (t) => {
      const created = await Equipment.create(
        {
          id: equipmentData.id || crypto.randomUUID(),
          siteId: equipmentData.siteId || null,
          name: equipmentData.name,
          type: equipmentData.type,
          serialNumber: equipmentData.serialNumber,
          location: equipmentData.location,
          status: equipmentData.status || 'operational',
          installedAt: equipmentData.installedAt || null
        },
        { transaction: t }
      );

      // Если переданы данные паспорта — создаем паспорт оборудования (1:1)
      if (equipmentData.passport) {
        await EquipmentPassport.create(
          {
            id: crypto.randomUUID(),
            equipmentId: created.id,
            manufacturer: equipmentData.passport.manufacturer || 'Не указан',
            model: equipmentData.passport.model || created.type,
            powerRating: equipmentData.passport.powerRating || 100.0,
            lastInspectionDate:
              equipmentData.passport.lastInspectionDate ||
              (created.installedAt ? String(created.installedAt).slice(0, 10) : '2025-01-01')
          },
          { transaction: t }
        );
      }

      const reloaded = await Equipment.findByPk(created.id, {
        include: [
          {
            model: EquipmentPassport,
            as: 'passport'
          },
          {
            model: Site,
            as: 'site'
          }
        ],
        transaction: t
      });

      return reloaded ? reloaded.toJSON() : created.toJSON();
    });
  }

  async update(id, updates) {
    if (!isValidUUID(id)) return null;

    return await sequelize.transaction(async (t) => {
      const item = await Equipment.findByPk(id, { transaction: t });
      if (!item) return null;

      const safeUpdates = { ...updates };
      delete safeUpdates.id;
      delete safeUpdates.createdAt;

      await item.update(safeUpdates, { transaction: t });

      if (updates.passport) {
        let passport = await EquipmentPassport.findOne({
          where: { equipmentId: id },
          transaction: t
        });
        if (passport) {
          await passport.update(updates.passport, { transaction: t });
        } else {
          await EquipmentPassport.create(
            {
              id: crypto.randomUUID(),
              equipmentId: id,
              ...updates.passport
            },
            { transaction: t }
          );
        }
      }

      const reloaded = await Equipment.findByPk(id, {
        include: [
          {
            model: EquipmentPassport,
            as: 'passport'
          },
          {
            model: Site,
            as: 'site'
          }
        ],
        transaction: t
      });

      return reloaded ? reloaded.toJSON() : item.toJSON();
    });
  }

  async delete(id) {
    if (!isValidUUID(id)) return false;

    const deletedCount = await Equipment.destroy({
      where: { id }
    });
    return deletedCount > 0;
  }
}

export default SequelizeEquipmentRepository;
