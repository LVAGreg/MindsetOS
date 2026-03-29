FROM node:20-alpine
WORKDIR /app

# bcrypt needs build tools
RUN apk add --no-cache python3 make g++

COPY package.json ./
RUN npm install --production

COPY . .
EXPOSE 3001
CMD ["node", "real-backend.cjs"]
