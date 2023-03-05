---
title: Кастомні скалярні типи в Apollo GraphQL
date: 2023-02-28
description: Невеличка нотатка про кастомні скалярні типи в Apollo GraphQL. Та яку задачку розвʼязав завдяки їх допомозі
tags:
  - graphql
  - javascript
---

## Передісторія

В період, поки пишу цей пост, мої основні задачі на роботі повʼязані з розробкою адмін-панелі та `GraphQL Apollo` сервера, який спілкується з цією адмінкою. До початку розробки цього функціоналу, у мене не було комерційного досвіду роботу з `Apollo GraphQL`. Тому довелось детальніше ознайомитися, як працює `GrahpQL` та як вирішуються типові проблеми-задачі, які виникають під час розробки.

В цьому пості опишу одну з проблем, яка виникла при роботі з датами

## В чому ж проблема?

Один з сервісів, до якого звертається `Apollo GraphQL` сервер, віддає дані для поля з датою `unix-timestamp` в секундах, наприклад `1677445679`. При цьому, фронтенд очікує, що це поле буде в мілісекундах, для коректного відображення.

Можемо зауважити дві цікавинки:

- Конструктор `new Date(value)` очікує, що `value` буде в [мілісекундах](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/Date#parameters)
- Величина `unix-timestamp` залежить від мови програмування. Одні повертають секунди, інші — мілісекунди. Приклад, як дістати `timestamp` в залежності від мови — [посилання](https://currentmillis.com/)

### Варіанти вирішення

Для себе відмітив три місця, де можна конвертувати секунди в мілісекунди:

- На клієнтській частині додатка
- Конвертувати на `apollo server` в [resolvers](https://www.apollographql.com/docs/apollo-server/data/resolvers/)
- Ввести кастомний [скалярний тип](https://www.apollographql.com/docs/apollo-server/schema/custom-scalars) на `apollo server`

#### Конвертація на клієнтській частині додатка

Від цього способу відмовився, адже намагаюсь мінімально оперувати конвертацією даних на клієнті. Також, конвертацію доводилось би робити в кожному місці, де використовується поле з датою, а таких місць більш як 10. Якщо одного дня, бекенд почне повертати дату в мілісекундах, то код конвертації доведеться прибирати з цих місць

#### Конвертація в `resolvers`

Від цього способу також відмовився. Є декілька `endpoints`, які повертають дату в секундах, яку потрібно конвертувати. З кожним новим `endpoints`, де зустрічається дата, потрібно памʼятати про конвертацію

#### Використання кастомного скалярного типу

Зупинився на цьому рішення. Про нього поговоримо далі, але перед цим хочу трохи розповісти, що ж таке кастомні скалярні типи в `apollo graphql`

## Custom Scalars

[Специфікація GraphQL](https://spec.graphql.org/October2021/#sec-Scalars) визначає декілька скалярних типів, за допомогою яких можна описати значення полів схеми — `Int`, `Float`, `String`, `Boolean` та `ID`. Якщо ж цих типів недостатньо, то можна описати свій. Наприклад, можна описати тип, який буде описувати [MAC-адресу](https://the-guild.dev/graphql/scalars/docs/scalars/mac)

### Як створити Custom Scalar?

1. Потрібно додати в будь-яке місце `graphql` схеми свій `custom scalar`. Наприклад:

   ```graphql
   scalar SpecificTime
   ```

2. Визначити, як `Apollo Server` буде взаємодіяти з `custom scalar`. Це відбувається завдяки класу `GraphQLScalarType`.

   ```js
   const SpecificTime = new GraphQLScalarType({
     name: 'SpecificTime',
     description: 'This type convert time from seconds to milliseconds',
     serialize(value) {},
     parseValue(value) {},
     parseLiteral(ast) {},
   });
   ```

   Клас `GraphQLScalarType` очікує обʼєкт з полями `name` та `description`. А також три методи для обробки значення:

- `serialize` — метод викликається, коли `Apollo Server` надсилає дані до клієнта. Тому в цьому місці можемо валідувати і конвертувати `value` у зручний формат
- `parseValue` — метод обробляє значення, яке надіслано з клієнта до `Apollo Server`, перед тим, як воно буде доступне в `resolvers`. Важливо, що цей метод викликається, коли кастомний скалярний тип передається як аргумент до `query`

  ```graphql
  query ($first: Int) {
    allUsers(first: $first) {
      id
    }
  }
  ```

- `parseLiteral` — метод викликається в тому ж випадку, що і `parseValue`. Єдина відмінність — що значення кастомного типу має бути захаркоджено в `query`:

  ```graphql
  query {
    allUsers(first: 10) {
      id
    }
  }
  ```

3. Передати створений скаляр з пункту 2 в `Apollo Server` через `resolvers`:

   ```js
   const typeDefs = gql`
     scalar SpecificTime
   `;

   const resolvers = {
     SpecificTime: specificTime,
   };

   const server = new ApolloServer({
     typeDefs,
     resolvers,
   });
   ```

## Фінальне рішення

Отож, як створити свій кастомний тип вже зрозуміло. Як виглядає рішення для конвертації значень певних полів з секунди у мілісекунди:

```js
import { gql } from 'graphql-tag';
import { GraphQLScalarType, GraphQLError } from 'graphql';
import secondsToMilliseconds from 'date-fns/secondsToMilliseconds';

const SpecificTime = new GraphQLScalarType({
  name: 'SpecificTime',
  description: 'This type convert time from seconds to milliseconds',
  serialize(value: unknown) {
    if (typeof value !== 'number') {
      throw new GraphQLError(
        'GraphQL Date Scalar serializer for SpecificTime expected a `number` value'
      );
    }

    return secondsToMilliseconds(value);
  },
});
```

В цьому випадку в класі `GraphQLScalarType` описав лише метод `serialize`, оскільки для поточних задач потрібно лише відображати дату на клієнтів. Передавати ж дату з клієнта не потрібно

Приклад використання кастомного типу:

```graphql
type Device {
  id: ID!
  serialNumber: String!
  lastActiveDate: SpecificTime!
}
```

## Корисні посилання

- Документація по custom scalars від [apollo server](https://www.apollographql.com/docs/apollo-server/schema/custom-scalars)
- Набір custom scalars від [the guild](https://the-guild.dev/graphql/scalars/docs). Наприклад, є описані типи для `IPv4`, `JWT`, `PhoneNumber`, `RGB` та інших
