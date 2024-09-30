<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

# Orders microservice

## Steps to launch the app at Development environment

1. To run the postgres database (created with official docker postgres image)

```
docker compose up -d
```

2. To run the server

```
npm run start:dev
```

## Prisma client to connect to database and create schemas

```
npm i prisma --save-dev
```

```
npx prisma init
```

```
npm i @prisma/client
```

```
npx prisma migrate dev --name init || npx prisma migrate dev --name secondMigration
```

## Instalations

1. dotenv

```
npm i dotenv
```

2. joi (to handle env variables)

```
npm i joi
```

3. nestjs/microservices

```
npm i @nestjs/microservices
```

4. **NATS**

```
npm i --save nats
```
