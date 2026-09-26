FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --ignore-scripts
RUN apk add --no-cache postgresql-client

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
