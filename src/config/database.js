import { Sequelize } from 'sequelize';
import env from './env.js';

export const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host: env.db.host,
  port: env.db.port,
  dialect: 'postgres',
  logging: env.db.logging ? (msg) => console.info(`[SQL] ${msg}`) : false,
  pool: {
    max: env.db.poolMax,
    min: env.db.poolMin,
    acquire: env.db.poolAcquire,
    idle: env.db.poolIdle
  },
  define: {
    underscored: true,
    timestamps: true
  }
});

/**
 * Проверка доступности базы данных с повторными попытками на этапе инициализации приложения.
 */
export async function checkDatabaseConnection({ attempts = 5, baseDelayMs = 400 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await sequelize.authenticate();
      return true;
    } catch (err) {
      if (attempt === attempts) {
        throw new Error(
          `Не удалось подключиться к базе данных PostgreSQL (${env.db.host}:${env.db.port}/${env.db.name}) после ${attempts} попыток: ${err.message}`,
          { cause: err }
        );
      }
      const delay = baseDelayMs * attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Корректное закрытие пула соединений при завершении процесса.
 */
export async function closeDatabaseConnection() {
  try {
    await sequelize.close();
  } catch {
    // Игнорируем ошибки при закрытии
  }
}

export default sequelize;
