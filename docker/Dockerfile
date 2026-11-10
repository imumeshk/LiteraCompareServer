FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* bun.lock* ./
RUN npm install
COPY . .
RUN npm run build
ENV NODE_ENV=production
CMD ["npx", "tsx", "server/src/index.ts"]
