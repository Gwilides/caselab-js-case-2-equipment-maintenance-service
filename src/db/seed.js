import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  sequelize,
  Site,
  Equipment,
  EquipmentPassport,
  Technician,
  MaintenanceRequest,
  RequestStatusHistory,
  RequestAssignee,
  SparePart,
  RequestPart
} from './models/index.js';

export async function seedUp() {
  console.info('[Seeds] Наполнение базы данных демонстрационными данными...');

  return await sequelize.transaction(async (t) => {
    // 1. Площадки (Sites) - 2 площадки
    const siteNorthId = '11111111-1111-4111-8111-111111111111';
    const siteSouthId = '22222222-2222-4222-8222-222222222222';

    await Site.bulkCreate(
      [
        {
          id: siteNorthId,
          name: 'Ветропарк «Северный»',
          code: 'SITE-NORTH-01',
          region: 'Мурманская область',
          lat: 68.9705,
          lon: 33.075
        },
        {
          id: siteSouthId,
          name: 'Солнечная электростанция «Южная»',
          code: 'SITE-SOUTH-02',
          region: 'Краснодарский край',
          lat: 45.0355,
          lon: 38.9753
        }
      ],
      { transaction: t }
    );

    // 2. Специалисты (Technicians) - 5 специалистов
    const techIds = [
      'aaaa1111-1111-4aaa-8aaa-111111111111',
      'aaaa2222-2222-4aaa-8aaa-222222222222',
      'aaaa3333-3333-4aaa-8aaa-333333333333',
      'aaaa4444-4444-4aaa-8aaa-444444444444',
      'aaaa5555-5555-4aaa-8aaa-555555555555'
    ];

    await Technician.bulkCreate(
      [
        {
          id: techIds[0],
          fullName: 'Иванов Алексей Петрович',
          specialization: 'Ведущий инженер-электротехник',
          employeeId: 'TECH-101'
        },
        {
          id: techIds[1],
          fullName: 'Смирнова Елена Сергеевна',
          specialization: 'Инженер АСУ ТП',
          employeeId: 'TECH-102'
        },
        {
          id: techIds[2],
          fullName: 'Кузнецов Дмитрий Иванович',
          specialization: 'Слесарь-механик 6 разряда',
          employeeId: 'TECH-103'
        },
        {
          id: techIds[3],
          fullName: 'Попов Максим Сергеевич',
          specialization: 'Электромонтёр высоковольтных сетей',
          employeeId: 'TECH-104'
        },
        {
          id: techIds[4],
          fullName: 'Васильев Роман Олегович',
          specialization: 'Техник вибродиагностического контроля',
          employeeId: 'TECH-105'
        }
      ],
      { transaction: t }
    );

    // 3. Запчасти (Spare Parts) - 5 наименований
    const partIds = [
      'bbbb1111-1111-4bbb-8bbb-111111111111',
      'bbbb2222-2222-4bbb-8bbb-222222222222',
      'bbbb3333-3333-4bbb-8bbb-333333333333',
      'bbbb4444-4444-4bbb-8bbb-444444444444',
      'bbbb5555-5555-4bbb-8bbb-555555555555'
    ];

    await SparePart.bulkCreate(
      [
        {
          id: partIds[0],
          name: 'Предохранитель высоковольтный ПВ-10',
          code: 'SP-FUSE-10',
          stockQuantity: 45,
          unit: 'шт'
        },
        {
          id: partIds[1],
          name: 'Подшипник главного вала SKF-6204',
          code: 'SP-BRG-6204',
          stockQuantity: 12,
          unit: 'шт'
        },
        {
          id: partIds[2],
          name: 'Плата контроллера инвертора PLC-300',
          code: 'SP-PLC-300',
          stockQuantity: 8,
          unit: 'шт'
        },
        {
          id: partIds[3],
          name: 'Фильтр масляной системы МФ-200',
          code: 'SP-FLT-200',
          stockQuantity: 30,
          unit: 'шт'
        },
        {
          id: partIds[4],
          name: 'Датчик вибрации пьезоэлектрический ДВ-05',
          code: 'SP-SNS-DV05',
          stockQuantity: 20,
          unit: 'шт'
        }
      ],
      { transaction: t }
    );

    // 4. Оборудование (Equipment) - 6 единиц с паспортами
    const eqIds = [
      'cccc1111-1111-4ccc-8ccc-111111111111',
      'cccc2222-2222-4ccc-8ccc-222222222222',
      'cccc3333-3333-4ccc-8ccc-333333333333',
      'cccc4444-4444-4ccc-8ccc-444444444444',
      'cccc5555-5555-4ccc-8ccc-555555555555',
      'cccc6666-6666-4ccc-8ccc-666666666666'
    ];

    await Equipment.bulkCreate(
      [
        {
          id: eqIds[0],
          siteId: siteNorthId,
          name: 'Ветрогенератор ВЭУ-01',
          type: 'turbine',
          serialNumber: 'SN-WT-001',
          location: { lat: 68.971, lon: 33.076 },
          status: 'operational',
          installedAt: '2023-04-10T00:00:00.000Z'
        },
        {
          id: eqIds[1],
          siteId: siteNorthId,
          name: 'Ветрогенератор ВЭУ-02',
          type: 'turbine',
          serialNumber: 'SN-WT-002',
          location: { lat: 68.972, lon: 33.078 },
          status: 'maintenance',
          installedAt: '2023-04-12T00:00:00.000Z'
        },
        {
          id: eqIds[2],
          siteId: siteNorthId,
          name: 'Трансформатор силовой ТДНС-16000',
          type: 'transformer',
          serialNumber: 'SN-TR-001',
          location: { lat: 68.9705, lon: 33.075 },
          status: 'operational',
          installedAt: '2023-02-15T00:00:00.000Z'
        },
        {
          id: eqIds[3],
          siteId: siteSouthId,
          name: 'Инвертор сетевой СЭС-01',
          type: 'inverter',
          serialNumber: 'SN-INV-001',
          location: { lat: 45.0356, lon: 38.9754 },
          status: 'operational',
          installedAt: '2023-06-20T00:00:00.000Z'
        },
        {
          id: eqIds[4],
          siteId: siteSouthId,
          name: 'Инвертор сетевой СЭС-02',
          type: 'inverter',
          serialNumber: 'SN-INV-002',
          location: { lat: 45.0358, lon: 38.9756 },
          status: 'repair',
          installedAt: '2023-06-21T00:00:00.000Z'
        },
        {
          id: eqIds[5],
          siteId: siteSouthId,
          name: 'Трекер позиционирования панелей ТСП-01',
          type: 'tracker',
          serialNumber: 'SN-TRK-001',
          location: { lat: 45.036, lon: 38.976 },
          status: 'operational',
          installedAt: '2023-07-05T00:00:00.000Z'
        }
      ],
      { transaction: t }
    );

    // Паспорта оборудования (1:1)
    await EquipmentPassport.bulkCreate(
      [
        {
          id: crypto.randomUUID(),
          equipmentId: eqIds[0],
          manufacturer: 'Vestas Wind Systems',
          model: 'V112-3.3 MW',
          powerRating: 3300.0,
          lastInspectionDate: '2026-05-12'
        },
        {
          id: crypto.randomUUID(),
          equipmentId: eqIds[1],
          manufacturer: 'Vestas Wind Systems',
          model: 'V112-3.3 MW',
          powerRating: 3300.0,
          lastInspectionDate: '2026-06-18'
        },
        {
          id: crypto.randomUUID(),
          equipmentId: eqIds[2],
          manufacturer: 'Сименс Энергетика',
          model: 'ТДНС-16000/110',
          powerRating: 16000.0,
          lastInspectionDate: '2026-03-10'
        },
        {
          id: crypto.randomUUID(),
          equipmentId: eqIds[3],
          manufacturer: 'SMA Solar Technology',
          model: 'Sunny Central 2500-EV',
          powerRating: 2500.0,
          lastInspectionDate: '2026-04-15'
        },
        {
          id: crypto.randomUUID(),
          equipmentId: eqIds[4],
          manufacturer: 'SMA Solar Technology',
          model: 'Sunny Central 2500-EV',
          powerRating: 2500.0,
          lastInspectionDate: '2026-02-28'
        },
        {
          id: crypto.randomUUID(),
          equipmentId: eqIds[5],
          manufacturer: 'Soltec Power Holdings',
          model: 'SF7 Single-Axis Tracker',
          powerRating: 15.0,
          lastInspectionDate: '2026-07-01'
        }
      ],
      { transaction: t }
    );

    // 5. Заявки на техническое обслуживание (20 штук в разных статусах)
    const requestSeeds = [
      // eqIds[0]: ВЭУ-01 (4 заявки: 2 done, 1 in_progress, 1 new)
      {
        id: 'dddd1001-1001-4ddd-8ddd-111111111001',
        equipmentId: eqIds[0],
        title: 'Замена смазочного масла в редукторе ВЭУ-01',
        description: 'Регламентная замена синтетического масла VG 320',
        priority: 'high',
        status: 'done',
        plannedAt: '2026-08-01T10:00:00.000Z',
        createdAt: '2026-07-28T09:15:00.000Z',
        closedAt: '2026-08-02T16:30:00.000Z',
        author: 'Диспетчер Север'
      },
      {
        id: 'dddd1002-1002-4ddd-8ddd-111111111002',
        equipmentId: eqIds[0],
        title: 'Инспекция состояния лопастей гондолы',
        description: 'Оптическая проверка кромок лопастей на микротрещины',
        priority: 'medium',
        status: 'done',
        plannedAt: '2026-08-15T08:00:00.000Z',
        createdAt: '2026-08-10T11:00:00.000Z',
        closedAt: '2026-08-16T14:45:00.000Z',
        author: 'Инженер Системы'
      },
      {
        id: 'dddd1003-1003-4ddd-8ddd-111111111003',
        equipmentId: eqIds[0],
        title: 'Калибровка датчиков скорости и направления ветра',
        description: 'Поверка анемометров и флюгеров на метеомачте ВЭУ-01',
        priority: 'low',
        status: 'in_progress',
        plannedAt: '2026-09-25T09:00:00.000Z',
        createdAt: '2026-09-22T14:20:00.000Z',
        author: 'Служба АСУ'
      },
      {
        id: 'dddd1004-1004-4ddd-8ddd-111111111004',
        equipmentId: eqIds[0],
        title: 'Протяжка болтовых соединений основания башни',
        description: 'Контроль момента затяжки анкерных групп М48',
        priority: 'medium',
        status: 'new',
        plannedAt: '2026-10-05T09:00:00.000Z',
        createdAt: '2026-09-26T16:45:00.000Z',
        author: 'Механическая служба'
      },

      // eqIds[1]: ВЭУ-02 (4 заявки: 1 done, 2 in_progress, 1 rejected)
      {
        id: 'dddd1005-1005-4ddd-8ddd-111111111005',
        equipmentId: eqIds[1],
        title: 'Замена подшипника вала генератора ВЭУ-02',
        description: 'Выявлена повышенная вибрация по спектру ВЧ',
        priority: 'critical',
        status: 'done',
        plannedAt: '2026-08-20T10:00:00.000Z',
        createdAt: '2026-08-18T10:12:00.000Z',
        closedAt: '2026-08-21T18:00:00.000Z',
        author: 'Вибродиагностика'
      },
      {
        id: 'dddd1006-1006-4ddd-8ddd-111111111006',
        equipmentId: eqIds[1],
        title: 'Диагностика гидравлической системы тормоза',
        description: 'Устранение падения давления в гидроаккумуляторе',
        priority: 'high',
        status: 'in_progress',
        plannedAt: '2026-09-24T10:00:00.000Z',
        createdAt: '2026-09-23T08:30:00.000Z',
        author: 'Диспетчер Север'
      },
      {
        id: 'dddd1007-1007-4ddd-8ddd-111111111007',
        equipmentId: eqIds[1],
        title: 'Ремонт системы подогрева лопастей от обледенения',
        description: 'Замена нагревательных элементов секции Б',
        priority: 'medium',
        status: 'in_progress',
        plannedAt: '2026-09-27T10:00:00.000Z',
        createdAt: '2026-09-24T12:00:00.000Z',
        author: 'Электрослужба'
      },
      {
        id: 'dddd1008-1008-4ddd-8ddd-111111111008',
        equipmentId: eqIds[1],
        title: 'Запрос на покраску обтекателя гондолы',
        description: 'Косметический дефект внешнего слоя',
        priority: 'low',
        status: 'rejected',
        plannedAt: '2026-09-10T12:00:00.000Z',
        createdAt: '2026-09-08T15:00:00.000Z',
        author: 'Подрядчик'
      },

      // eqIds[2]: ТДНС-16000 (3 заявки: 1 done, 1 in_progress, 1 new)
      {
        id: 'dddd1009-1009-4ddd-8ddd-111111111009',
        equipmentId: eqIds[2],
        title: 'Хроматографический анализ растворённых газов в масле',
        description: 'Контроль концентрации водорода и ацетилена в трансформаторе',
        priority: 'medium',
        status: 'done',
        plannedAt: '2026-07-15T09:00:00.000Z',
        createdAt: '2026-07-12T10:00:00.000Z',
        closedAt: '2026-07-16T12:00:00.000Z',
        author: 'Химлаборатория'
      },
      {
        id: 'dddd1010-1010-4ddd-8ddd-111111111010',
        equipmentId: eqIds[2],
        title: 'Ревизия привода переключателя РПН под нагрузкой',
        description: 'Проверка контактора и смазка кулачкового механизма',
        priority: 'high',
        status: 'in_progress',
        plannedAt: '2026-09-26T08:00:00.000Z',
        createdAt: '2026-09-25T09:30:00.000Z',
        author: 'Высоковольтная служба'
      },
      {
        id: 'dddd1011-1011-4ddd-8ddd-111111111011',
        equipmentId: eqIds[2],
        title: 'Проверка газового реле Бухгольца',
        description: 'Тестирование цепей сигнализации и отключения',
        priority: 'low',
        status: 'new',
        plannedAt: '2026-10-12T09:00:00.000Z',
        createdAt: '2026-09-26T17:00:00.000Z',
        author: 'Релейная защита'
      },

      // eqIds[3]: СЭС-01 (3 заявки: 1 done, 1 in_progress, 1 new)
      {
        id: 'dddd1012-1012-4ddd-8ddd-111111111012',
        equipmentId: eqIds[3],
        title: 'Чистка воздушных фильтров охлаждения инвертора СЭС-01',
        description: 'Продувка теплообменных каналов сжатым воздухом',
        priority: 'low',
        status: 'done',
        plannedAt: '2026-08-05T07:00:00.000Z',
        createdAt: '2026-08-03T11:00:00.000Z',
        closedAt: '2026-08-05T13:00:00.000Z',
        author: 'Диспетчер Юг'
      },
      {
        id: 'dddd1013-1013-4ddd-8ddd-111111111013',
        equipmentId: eqIds[3],
        title: 'Тепловизионное обследование контактных соединений DC',
        description: 'Поиск перегревов на шинопроводах постоянного тока',
        priority: 'medium',
        status: 'in_progress',
        plannedAt: '2026-09-26T11:00:00.000Z',
        createdAt: '2026-09-24T15:20:00.000Z',
        author: 'Энергоаудит'
      },
      {
        id: 'dddd1014-1014-4ddd-8ddd-111111111014',
        equipmentId: eqIds[3],
        title: 'Обновление встроенного ПО контроллера связи СЭС-01',
        description: 'Прошивка шлюза Modbus TCP до версии 2.4.1',
        priority: 'low',
        status: 'new',
        plannedAt: '2026-10-02T10:00:00.000Z',
        createdAt: '2026-09-27T08:00:00.000Z',
        author: 'ИТ-отдел'
      },

      // eqIds[4]: СЭС-02 (3 заявки: 1 done, 1 in_progress, 1 rejected)
      {
        id: 'dddd1015-1015-4ddd-8ddd-111111111015',
        equipmentId: eqIds[4],
        title: 'Замена силового IGBT модуля фазы А инвертора',
        description: 'Пробой транзисторного ключа при скачке напряжения',
        priority: 'critical',
        status: 'done',
        plannedAt: '2026-07-20T10:00:00.000Z',
        createdAt: '2026-07-18T14:00:00.000Z',
        closedAt: '2026-07-21T17:30:00.000Z',
        author: 'Аварийная служба'
      },
      {
        id: 'dddd1016-1016-4ddd-8ddd-111111111016',
        equipmentId: eqIds[4],
        title: 'Капитальный ремонт вентилятора принудительного охлаждения',
        description: 'Заклинивание подшипников кулера блока №2',
        priority: 'high',
        status: 'in_progress',
        plannedAt: '2026-09-25T13:00:00.000Z',
        createdAt: '2026-09-23T11:40:00.000Z',
        author: 'Диспетчер Юг'
      },
      {
        id: 'dddd1017-1017-4ddd-8ddd-111111111017',
        equipmentId: eqIds[4],
        title: 'Запрос на вывод из эксплуатации инвертора СЭС-02',
        description: 'Отклонено: остаточный ресурс превышает 80%',
        priority: 'low',
        status: 'rejected',
        plannedAt: '2026-09-01T10:00:00.000Z',
        createdAt: '2026-08-28T16:00:00.000Z',
        author: 'Служба эксплуатации'
      },

      // eqIds[5]: ТСП-01 (3 заявки: 2 new, 1 rejected)
      {
        id: 'dddd1018-1018-4ddd-8ddd-111111111018',
        equipmentId: eqIds[5],
        title: 'Смазка червячных передач поворотных опор трекера',
        description: 'Сезонное ТО механических редукторов поворота столов',
        priority: 'medium',
        status: 'new',
        plannedAt: '2026-10-10T09:00:00.000Z',
        createdAt: '2026-09-26T10:00:00.000Z',
        author: 'Диспетчер Юг'
      },
      {
        id: 'dddd1019-1019-4ddd-8ddd-111111111019',
        equipmentId: eqIds[5],
        title: 'Юстировка оптического датчика положения солнца',
        description: 'Проверка алгоритма слежения астрономического трекера',
        priority: 'low',
        status: 'new',
        plannedAt: '2026-10-15T11:00:00.000Z',
        createdAt: '2026-09-27T09:30:00.000Z',
        author: 'Инженер Системы'
      },
      {
        id: 'dddd1020-1020-4ddd-8ddd-111111111020',
        equipmentId: eqIds[5],
        title: 'Установка защитного кожуха на электропривод',
        description: 'Отклонено: кожух входит в заводскую комплектацию',
        priority: 'low',
        status: 'rejected',
        plannedAt: '2026-09-15T10:00:00.000Z',
        createdAt: '2026-09-12T14:00:00.000Z',
        author: 'Подрядчик Монтаж'
      }
    ];

    await MaintenanceRequest.bulkCreate(requestSeeds, { transaction: t });

    // 6. Назначенные бригады (RequestAssignees)
    // На все in_progress и done заявки назначаем бригаду с ровно одним lead и участниками
    const assigneesSeeds = [
      // Заявка 1001 (done)
      {
        id: crypto.randomUUID(),
        requestId: requestSeeds[0].id,
        technicianId: techIds[0],
        role: 'lead',
        hours: 8.5
      },
      {
        id: crypto.randomUUID(),
        requestId: requestSeeds[0].id,
        technicianId: techIds[2],
        role: 'member',
        hours: 12.0
      },
      // Заявка 1002 (done)
      {
        id: crypto.randomUUID(),
        requestId: requestSeeds[1].id,
        technicianId: techIds[4],
        role: 'lead',
        hours: 6.0
      },
      // Заявка 1003 (in_progress)
      {
        id: crypto.randomUUID(),
        requestId: requestSeeds[2].id,
        technicianId: techIds[1],
        role: 'lead',
        hours: 10.0
      },
      {
        id: crypto.randomUUID(),
        requestId: requestSeeds[2].id,
        technicianId: techIds[0],
        role: 'member',
        hours: 5.0
      },
      // Заявка 1005 (done)
      {
        id: crypto.randomUUID(),
        requestId: requestSeeds[4].id,
        technicianId: techIds[2],
        role: 'lead',
        hours: 16.0
      },
      {
        id: crypto.randomUUID(),
        requestId: requestSeeds[4].id,
        technicianId: techIds[4],
        role: 'member',
        hours: 14.5
      },
      // Заявка 1006 (in_progress)
      {
        id: crypto.randomUUID(),
        requestId: requestSeeds[5].id,
        technicianId: techIds[0],
        role: 'lead',
        hours: 8.0
      },
      // Заявка 1007 (in_progress)
      {
        id: crypto.randomUUID(),
        requestId: requestSeeds[6].id,
        technicianId: techIds[3],
        role: 'lead',
        hours: 12.0
      },
      // Заявка 1009 (done)
      {
        id: crypto.randomUUID(),
        requestId: requestSeeds[8].id,
        technicianId: techIds[0],
        role: 'lead',
        hours: 4.0
      },
      // Заявка 1010 (in_progress)
      {
        id: crypto.randomUUID(),
        requestId: requestSeeds[9].id,
        technicianId: techIds[3],
        role: 'lead',
        hours: 14.0
      },
      {
        id: crypto.randomUUID(),
        requestId: requestSeeds[9].id,
        technicianId: techIds[0],
        role: 'member',
        hours: 8.0
      },
      // Заявка 1012 (done)
      {
        id: crypto.randomUUID(),
        requestId: requestSeeds[11].id,
        technicianId: techIds[2],
        role: 'lead',
        hours: 4.5
      },
      // Заявка 1013 (in_progress)
      {
        id: crypto.randomUUID(),
        requestId: requestSeeds[12].id,
        technicianId: techIds[0],
        role: 'lead',
        hours: 6.0
      },
      // Заявка 1015 (done)
      {
        id: crypto.randomUUID(),
        requestId: requestSeeds[14].id,
        technicianId: techIds[1],
        role: 'lead',
        hours: 18.0
      },
      {
        id: crypto.randomUUID(),
        requestId: requestSeeds[14].id,
        technicianId: techIds[3],
        role: 'member',
        hours: 16.0
      },
      // Заявка 1016 (in_progress)
      {
        id: crypto.randomUUID(),
        requestId: requestSeeds[15].id,
        technicianId: techIds[2],
        role: 'lead',
        hours: 10.0
      }
    ];

    await RequestAssignee.bulkCreate(assigneesSeeds, { transaction: t });

    // 7. Журнал изменений статусов (RequestStatusHistory)
    const historySeeds = [];
    for (const req of requestSeeds) {
      // Исходная запись создания
      historySeeds.push({
        id: crypto.randomUUID(),
        requestId: req.id,
        fromStatus: null,
        toStatus: 'new',
        author: req.author,
        comment: 'Создание заявки на обслуживание',
        createdAt: req.createdAt
      });

      if (req.status === 'in_progress' || req.status === 'done') {
        historySeeds.push({
          id: crypto.randomUUID(),
          requestId: req.id,
          fromStatus: 'new',
          toStatus: 'in_progress',
          author: 'Диспетчер',
          comment: 'Бригада назначена, работы начаты',
          createdAt: new Date(new Date(req.createdAt).getTime() + 3600000).toISOString()
        });
      }

      if (req.status === 'done') {
        historySeeds.push({
          id: crypto.randomUUID(),
          requestId: req.id,
          fromStatus: 'in_progress',
          toStatus: 'done',
          author: 'Ведущий инженер',
          comment: 'Регламентные работы успешно завершены',
          createdAt: req.closedAt
        });
      }

      if (req.status === 'rejected') {
        historySeeds.push({
          id: crypto.randomUUID(),
          requestId: req.id,
          fromStatus: 'new',
          toStatus: 'rejected',
          author: 'Главный инженер',
          comment: 'Заявка отклонена техническим советом',
          createdAt: new Date(new Date(req.createdAt).getTime() + 7200000).toISOString()
        });
      }
    }

    await RequestStatusHistory.bulkCreate(historySeeds, { transaction: t });

    // 8. Списание запчастей (RequestParts)
    await RequestPart.bulkCreate(
      [
        {
          id: crypto.randomUUID(),
          requestId: requestSeeds[0].id,
          sparePartId: partIds[3], // Фильтр масляной системы
          quantity: 2
        },
        {
          id: crypto.randomUUID(),
          requestId: requestSeeds[4].id,
          sparePartId: partIds[1], // Подшипник SKF
          quantity: 1
        },
        {
          id: crypto.randomUUID(),
          requestId: requestSeeds[14].id,
          sparePartId: partIds[2], // Плата PLC
          quantity: 1
        }
      ],
      { transaction: t }
    );

    console.info('[Seeds] База данных успешно заполнена тестовыми данными.');
  });
}

export async function seedDown() {
  console.info('[Seeds] Очистка сидов из базы данных...');
  return await sequelize.transaction(async (t) => {
    await RequestPart.destroy({ where: {}, force: true, transaction: t });
    await RequestStatusHistory.destroy({ where: {}, force: true, transaction: t });
    await RequestAssignee.destroy({ where: {}, force: true, transaction: t });
    await MaintenanceRequest.destroy({ where: {}, force: true, transaction: t });
    await EquipmentPassport.destroy({ where: {}, force: true, transaction: t });
    await Equipment.destroy({ where: {}, force: true, transaction: t });
    await SparePart.destroy({ where: {}, force: true, transaction: t });
    await Technician.destroy({ where: {}, force: true, transaction: t });
    await Site.destroy({ where: {}, force: true, transaction: t });
    console.info('[Seeds] Очистка сидов завершена.');
  });
}

async function main() {
  const command = process.argv[2] || 'up';
  try {
    if (command === 'up') {
      await seedUp();
    } else if (command === 'down' || command === 'undo') {
      await seedDown();
    } else {
      console.error(`[Seeds] Неизвестная команда: ${command}. Допустимые: up, down`);
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error('[Seeds] Ошибка выполнения сидов:', err);
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}

export default { seedUp, seedDown };
