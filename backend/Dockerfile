FROM node:20-alpine
RUN apk add --no-cache kubectl
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "index.js"]