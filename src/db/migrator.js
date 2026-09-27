import { Umzug, SequelizeStorage } from 'umzug';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sequelize } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const migrator = new Umzug({
  migrations: {
    glob: path.join(__dirname, 'migrations', '*.js')
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({
    sequelize,
    tableName: 'sequelize_meta'
  }),
  logger: console
});

async function main() {
  const command = process.argv[2] || 'up';

  try {
    if (command === 'up') {
      const migrations = await migrator.up();
      console.info(`[Migrator] Успешно применено миграций: ${migrations.length}`);
    } else if (command === 'down') {
      const migrations = await migrator.down();
      console.info(`[Migrator] Откачено миграций: ${migrations.length}`);
    } else if (command === 'down-all') {
      const migrations = await migrator.down({ to: 0 });
      console.info(`[Migrator] Полный откат завершён. Откачено миграций: ${migrations.length}`);
    } else if (command === 'status') {
      const executed = await migrator.executed();
      const pending = await migrator.pending();
      console.info(
        `[Migrator] Статус миграций:\nПрименено: ${executed.map((m) => m.name).join(', ') || 'нет'}\nОжидает: ${pending.map((m) => m.name).join(', ') || 'нет'}`
      );
    } else {
      console.error(
        `[Migrator] Неизвестная команда: ${command}. Допустимые: up, down, down-all, status`
      );
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error('[Migrator] Ошибка выполнения миграций:', err);
    process.exit(1);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}

export default migrator;
