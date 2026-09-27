-- Инициализация тестовой базы данных для автоматических тестов
SELECT 'CREATE DATABASE caselab_db_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'caselab_db_test')\gexec
