FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Установка зависимостей только для production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Копирование исходных файлов приложения и статики
COPY src ./src
COPY public ./public
COPY data ./data

# Запуск от непривилегированного пользователя node для повышения безопасности
RUN chown -R node:node /app
USER node

EXPOSE 3000

# Проверка работоспособности контейнера
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "src/server.js"]
