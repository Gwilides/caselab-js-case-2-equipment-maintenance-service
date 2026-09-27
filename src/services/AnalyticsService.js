import { QueryTypes } from 'sequelize';
import { sequelize, Site } from '../db/models/index.js';
import { NotFoundError, ValidationError } from '../errors/index.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

const SORT_COLUMNS = {
  totalRequests: 'COUNT(DISTINCT r.id)',
  closedRequests: "COUNT(DISTINCT CASE WHEN r.status = 'done' THEN r.id END)",
  totalHours: 'COALESCE(SUM(ra.hours), 0)',
  equipmentName: 'e.name',
  serialNumber: 'e.serial_number',
  lastMaintenanceDate:
    "MAX(CASE WHEN r.status = 'done' THEN COALESCE(r.closed_at, r.updated_at) END)"
};

export class AnalyticsService {
  /**
   * Сводка по площадке: количество заявок по статусам и приоритетам,
   * общее число оборудования и среднее время закрытия заявок.
   * @param {string} siteId
   */
  async getSiteSummary(siteId) {
    if (!isValidUUID(siteId)) {
      throw new NotFoundError(`Площадка с id "${siteId}"`);
    }

    const site = await Site.findByPk(siteId);
    if (!site) {
      throw new NotFoundError(`Площадка с id "${siteId}"`);
    }

    // 1. Общее число оборудования на площадке
    const [equipmentStats] = await sequelize.query(
      `
      SELECT COUNT(id)::int as count 
      FROM equipment 
      WHERE site_id = :siteId AND deleted_at IS NULL
    `,
      {
        replacements: { siteId },
        type: QueryTypes.SELECT
      }
    );
    const equipmentCount = equipmentStats ? equipmentStats.count : 0;

    // 2. Распределение заявок по статусам
    const statusRows = await sequelize.query(
      `
      SELECT r.status, COUNT(r.id)::int as count
      FROM maintenance_requests r
      JOIN equipment e ON r.equipment_id = e.id
      WHERE e.site_id = :siteId 
        AND r.deleted_at IS NULL 
        AND e.deleted_at IS NULL
      GROUP BY r.status
    `,
      {
        replacements: { siteId },
        type: QueryTypes.SELECT
      }
    );

    const requestsByStatus = {
      new: 0,
      in_progress: 0,
      done: 0,
      rejected: 0
    };
    let totalRequests = 0;
    for (const row of statusRows) {
      if (row.status in requestsByStatus) {
        requestsByStatus[row.status] = row.count;
      }
      totalRequests += row.count;
    }

    // 3. Распределение заявок по приоритетам
    const priorityRows = await sequelize.query(
      `
      SELECT r.priority, COUNT(r.id)::int as count
      FROM maintenance_requests r
      JOIN equipment e ON r.equipment_id = e.id
      WHERE e.site_id = :siteId 
        AND r.deleted_at IS NULL 
        AND e.deleted_at IS NULL
      GROUP BY r.priority
    `,
      {
        replacements: { siteId },
        type: QueryTypes.SELECT
      }
    );

    const requestsByPriority = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };
    for (const row of priorityRows) {
      if (row.priority in requestsByPriority) {
        requestsByPriority[row.priority] = row.count;
      }
    }

    // 4. Среднее время закрытия заявок (от created_at до closed_at) в секундах
    const [timeStats] = await sequelize.query(
      `
      SELECT 
        AVG(EXTRACT(EPOCH FROM (COALESCE(r.closed_at, r.updated_at) - r.created_at)))::float as avg_seconds
      FROM maintenance_requests r
      JOIN equipment e ON r.equipment_id = e.id
      WHERE e.site_id = :siteId
        AND r.status = 'done'
        AND r.deleted_at IS NULL
        AND e.deleted_at IS NULL
    `,
      {
        replacements: { siteId },
        type: QueryTypes.SELECT
      }
    );

    const avgSeconds = timeStats && timeStats.avg_seconds !== null ? timeStats.avg_seconds : null;
    const averageCompletionTimeHours =
      avgSeconds !== null ? Number((avgSeconds / 3600).toFixed(2)) : null;

    return {
      site: {
        id: site.id,
        name: site.name,
        code: site.code,
        region: site.region,
        lat: site.lat,
        lon: site.lon
      },
      equipmentCount,
      totalRequests,
      requestsByStatus,
      requestsByPriority,
      averageCompletionTimeHours,
      averageCompletionTimeSeconds: avgSeconds !== null ? Math.round(avgSeconds) : null
    };
  }

  /**
   * Аналитический отчёт по нагрузке на оборудование (прямой SQL запрос с JOIN, GROUP BY и HAVING).
   * @param {object} options
   */
  async getEquipmentLoadReport({
    minRequests = 0,
    startDate,
    endDate,
    siteId,
    limit = 20,
    offset = 0,
    sortBy = 'totalRequests',
    sortOrder = 'desc'
  } = {}) {
    const parsedMinRequests = Math.max(0, parseInt(minRequests || 0, 10));
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit || 20, 10)));
    const parsedOffset = Math.max(0, parseInt(offset || 0, 10));

    // Проверка сортировки по белому списку
    const sortFieldSql = SORT_COLUMNS[sortBy] || SORT_COLUMNS.totalRequests;
    const sortDirectionSql = sortOrder && String(sortOrder).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const replacements = {
      minRequests: parsedMinRequests,
      limit: parsedLimit,
      offset: parsedOffset
    };

    let dateWhereRequest = '';
    if (startDate) {
      dateWhereRequest += ' AND r.created_at >= :startDate';
      replacements.startDate = new Date(startDate);
    }
    if (endDate) {
      dateWhereRequest += ' AND r.created_at <= :endDate';
      replacements.endDate = /^\d{4}-\d{2}-\d{2}$/.test(endDate)
        ? new Date(`${endDate}T23:59:59.999Z`)
        : new Date(endDate);
    }

    let siteWhereEquipment = '';
    if (siteId) {
      if (!isValidUUID(siteId)) {
        throw new ValidationError([{ field: 'siteId', message: 'Некорректный UUID площадки' }]);
      }
      siteWhereEquipment = ' AND e.site_id = :siteId';
      replacements.siteId = siteId;
    }

    // Запрос агрегированных данных отчёта
    const sql = `
      SELECT 
        e.id AS "equipmentId",
        e.name AS "equipmentName",
        e.serial_number AS "serialNumber",
        e.type AS "equipmentType",
        e.status AS "equipmentStatus",
        s.name AS "siteName",
        COUNT(DISTINCT r.id)::int AS "totalRequests",
        COUNT(DISTINCT CASE WHEN r.status = 'done' THEN r.id END)::int AS "closedRequests",
        COALESCE(SUM(ra.hours), 0)::float AS "totalHours",
        MAX(CASE WHEN r.status = 'done' THEN COALESCE(r.closed_at, r.updated_at) END) AS "lastMaintenanceDate"
      FROM equipment e
      LEFT JOIN sites s ON e.site_id = s.id AND s.deleted_at IS NULL
      LEFT JOIN maintenance_requests r ON e.id = r.equipment_id 
        AND r.deleted_at IS NULL
        ${dateWhereRequest}
      LEFT JOIN request_assignees ra ON r.id = ra.request_id
      WHERE e.deleted_at IS NULL
        ${siteWhereEquipment}
      GROUP BY e.id, e.name, e.serial_number, e.type, e.status, s.name
      HAVING COUNT(DISTINCT r.id) >= :minRequests
      ORDER BY ${sortFieldSql} ${sortDirectionSql}
      LIMIT :limit OFFSET :offset;
    `;

    // Запрос общего количества групп для пагинации
    const countSql = `
      SELECT COUNT(*)::int as count
      FROM (
        SELECT e.id
        FROM equipment e
        LEFT JOIN maintenance_requests r ON e.id = r.equipment_id 
          AND r.deleted_at IS NULL
          ${dateWhereRequest}
        WHERE e.deleted_at IS NULL
          ${siteWhereEquipment}
        GROUP BY e.id
        HAVING COUNT(DISTINCT r.id) >= :minRequests
      ) AS groups;
    `;

    const [rows, [countResult]] = await Promise.all([
      sequelize.query(sql, { replacements, type: QueryTypes.SELECT }),
      sequelize.query(countSql, { replacements, type: QueryTypes.SELECT })
    ]);

    const total = countResult ? countResult.count : 0;
    const page = Math.floor(parsedOffset / parsedLimit) + 1;
    const totalPages = Math.ceil(total / parsedLimit) || 1;

    return {
      items: rows,
      pagination: {
        total,
        page,
        limit: parsedLimit,
        totalPages
      }
    };
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
