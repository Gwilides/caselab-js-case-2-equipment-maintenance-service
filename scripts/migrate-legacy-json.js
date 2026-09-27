import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import env from '../src/config/env.js';
import {
  sequelize,
  Site,
  Equipment,
  EquipmentPassport,
  MaintenanceRequest,
  RequestStatusHistory
} from '../src/db/models/index.js';

export async function migrateLegacyJson() {
  console.info('[Legacy Migration] Запуск миграции данных из JSON файлов Кейса 2 в PostgreSQL...');

  const dataDir = path.resolve(process.cwd(), env.dataDir);
  const equipmentFile = path.join(dataDir, 'equipment.json');
  const requestsFile = path.join(dataDir, 'requests.json');

  let legacyEquipment = [];
  let legacyRequests = [];

  try {
    const rawEq = await fs.readFile(equipmentFile, 'utf-8');
    legacyEquipment = rawEq.trim() ? JSON.parse(rawEq) : [];
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    console.info(`[Legacy Migration] Файл ${path.join(env.dataDir, 'equipment.json')} не найден, пропускаем оборудование.`);
  }

  try {
    const rawReq = await fs.readFile(requestsFile, 'utf-8');
    legacyRequests = rawReq.trim() ? JSON.parse(rawReq) : [];
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    console.info(`[Legacy Migration] Файл ${path.join(env.dataDir, 'requests.json')} не найден, пропускаем заявки.`);
  }

  if (legacyEquipment.length === 0 && legacyRequests.length === 0) {
    console.info('[Legacy Migration] Нет данных для переноса (файлы пусты или отсутствуют).');
    return { equipmentImported: 0, requestsImported: 0 };
  }

  return await sequelize.transaction(async (t) => {
    // Получаем или создаем дефолтную площадку для старого оборудования
    let defaultSite = await Site.findOne({
      where: { code: 'SITE-LEGACY-DEFAULT' },
      transaction: t
    });
    if (!defaultSite) {
      defaultSite = await Site.create(
        {
          id: crypto.randomUUID(),
          name: 'Основная база (Legacy Data)',
          code: 'SITE-LEGACY-DEFAULT',
          region: 'Центральный федеральный округ',
          lat: 55.7558,
          lon: 37.6173
        },
        { transaction: t }
      );
    }

    let equipmentImported = 0;
    const knownEquipmentIds = new Set();

    for (const eq of legacyEquipment) {
      const existing = await Equipment.findOne({
        where: { serialNumber: eq.serialNumber },
        transaction: t
      });

      const eqId = eq.id || crypto.randomUUID();
      knownEquipmentIds.add(eqId);

      if (!existing) {
        await Equipment.create(
          {
            id: eqId,
            siteId: defaultSite.id,
            name: eq.name,
            type: eq.type,
            serialNumber: eq.serialNumber,
            location: eq.location || { lat: 55.7558, lon: 37.6173 },
            status: eq.status || 'operational',
            installedAt: eq.installedAt || new Date().toISOString(),
            createdAt: eq.createdAt || new Date().toISOString(),
            updatedAt: eq.updatedAt || new Date().toISOString()
          },
          { transaction: t }
        );

        // Создаем технический паспорт по умолчанию
        await EquipmentPassport.create(
          {
            id: crypto.randomUUID(),
            equipmentId: eqId,
            manufacturer: 'Завод энергетического машиностроения',
            model: eq.type,
            powerRating: 1000.0,
            lastInspectionDate: (eq.installedAt || '2025-01-01').slice(0, 10)
          },
          { transaction: t }
        );

        equipmentImported++;
      } else {
        knownEquipmentIds.add(existing.id);
      }
    }

    let requestsImported = 0;
    for (const req of legacyRequests) {
      const existing = await MaintenanceRequest.findByPk(req.id, { transaction: t });
      if (!existing) {
        // Проверяем, существует ли указанное оборудование
        const equipmentExists =
          knownEquipmentIds.has(req.equipmentId) ||
          (await Equipment.findByPk(req.equipmentId, { transaction: t }));

        if (equipmentExists) {
          const createdReq = await MaintenanceRequest.create(
            {
              id: req.id || crypto.randomUUID(),
              equipmentId: req.equipmentId,
              title: req.title,
              description: req.description || '',
              priority: req.priority,
              status: req.status || 'new',
              plannedAt: req.plannedAt || null,
              author: 'Импорт из Кейса 2',
              closedAt: req.status === 'done' ? req.updatedAt || new Date().toISOString() : null,
              createdAt: req.createdAt || new Date().toISOString(),
              updatedAt: req.updatedAt || new Date().toISOString()
            },
            { transaction: t }
          );

          // Добавляем запись в журнал истории
          await RequestStatusHistory.create(
            {
              id: crypto.randomUUID(),
              requestId: createdReq.id,
              fromStatus: null,
              toStatus: req.status || 'new',
              author: 'Импорт из Кейса 2',
              comment: 'Миграция архивных данных из JSON хранилища',
              createdAt: req.createdAt || new Date().toISOString()
            },
            { transaction: t }
          );

          requestsImported++;
        }
      }
    }

    console.info(
      `[Legacy Migration] Успешно перенесено: ${equipmentImported} оборудования, ${requestsImported} заявок.`
    );
    return { equipmentImported, requestsImported };
  });
}

if (process.argv[1] && process.argv[1].endsWith('migrate-legacy-json.js')) {
  migrateLegacyJson()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Legacy Migration] Ошибка при миграции JSON данных:', err);
      process.exit(1);
    });
}

export default migrateLegacyJson;
