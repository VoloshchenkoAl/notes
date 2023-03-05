---
title: Обʼєкт Proxy в JavaScript
date: 2023-01-27
description: Теоретична збірка про обʼєкт Proxy в JavaScript та приклади його використання
tags:
  - javascript
---

Це розповідь про обʼєкт `Proxy`, який зʼявився в [ES6](https://262.ecma-international.org/6.0/#sec-proxy-object-internal-methods-and-internal-slots).

А розповідь почнемо не з теорії, а прикладу

## Діставання елементів масиву завдяки відʼємним індексам

В `python` є можливість діставати елементи масиву, використовуючи відʼємні індекси:

```python
letters = ["a", "b", "c"]

print(letters[-1]) # => 'c'
print(letters[-2]) # => 'b'
```

Було б добре, такий спосіб діставання елементів масиву додати до JS 🤔
(вважаймо цей спосіб альтернативою до наявного методу [at](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/at) масивів в JS)

Оскільки це розповідь про `Proxy`, то зрозуміло, що цю задачу можна розвʼязати завдяки `Proxy`:

```js
function createArray(...items) {
  const handler = {
    get(target, property, receiver) {
      let index = parseInt(property, 10);

      if (index < 0) {
        index = target.length + index;
      }

      return target[index];
    },
  };

  return new Proxy(items, handler);
}

const numbers = createArray(1, 2, 3, 4, 5, 6);

console.log(numbers[-1]); // => 6
```

Щоб зрозуміти, як працює приклад вище, потрібно трохи заглибитись в теорію

## Теорія

### Що потрібно знати про Proxy?

Додаючи **Proxy** до обʼєкту, ми створюємо додаткову обгортку. Маючи таку обгортку, ми можемо перехоплювати та перевизначати базові методи для роботи з обʼєктами

На діаграмі нижче проілюстрований принцип того, як працює проксі для обʼєкту `Person`. В цьому випадку в `PROXY` було перевизначено метод `get`. Тому звертаючись до поля `Peson.name` звернення спочатку йде до `PROXY`, а звідти, вже до обʼєкту `Person`

```bash
                      PROXY                    Person
                +---------------+         +---------------+
                |               |         |               |
                |               |         |     name      |
  Person.name   |    +-----+    |         |    +-----+    |
----------------|--->|     |----|---------|--->|     |    |
                |    | get |    |         |    | Lil |    |
-------<--------|----|     |<---|---------|----|     |    |
      Lil       |    +-----+    |         |    +-----+    |
                |               |         |               |
                |               |         |               |
                +---------------+         +---------------+
```

Розглянемо на реальному прикладі, як можна перехопити та перевизначити внутрішній метод `[[Get]]` обʼєкту

#### Логування звернень до полів обʼєкту

В коді нижче оголошується функція `traceProperty`, яка першим аргументом приймає обʼєкт, а інші аргументи являють собою назви полів, звернення до яких ми хочемо логувати. Найважливіша частина, це метод `handler.get` в середині функції `traceProperty`. Саме метод `handler.get` перехоплює і перевизначає, як відбувається звернення до полів обʼєкту `traceMagic`

```js
const magic = {
  number: 42,
  isMagic: false,
  toString() {
    console.log(
      `Your number is ${this.number}. Am I right? Answer: ${this.isMagic}`
    );
  },
};

const traceMagic = traceProperty(magic, 'isMagic', 'number');

const guestNumber = traceMagic.number; // Get property magicNumber
traceMagic.toString(); // Get property magicNumber, Get property isMagic

function traceProperty(obj, ...keys) {
  const handler = {
    get(target, propKey) {
      if (keys.includes(propKey)) {
        console.log(`Get property ${propKey}`);
      }

      return target[propKey];
    },
  };

  return new Proxy(obj, handler);
}
```

### Як створювати Proxy?

Вище було розглянуто два приклади використання обʼєкту `Proxy`. Тепер детальніше сфокусуємось, як саме створюється `Proxy` та які параметри приймає цей обʼєкт.

Proxy створюється за наступним шаблоном:

```js
const target = { msg: 'hello' };
const handler = {};

const proxy = new Proxy(target, handler);
```

```bash
                    +--------+  +---------+
                    | target |  | handler |
                    +--------+  +---------+
                          |        |
   +----------------------+        +-----------------------+
   |                                                       |
   |                                                       |
+--------------------------------+      +--------------------------------+
| Оригінальний обʼєкт            |      |  Обʼєкт, в якому вказуємо які  |
|   до якого хочемо додати Proxy |      |     внутрішні методи будемо    |
+--------------------------------+      | перехоплювати та перевизначати |
                                        +--------------------------------+
```

### Що таке внутрішні методи обʼєкту?

В кожного обʼєкта є внутрішні методи, які визначають, як буде відбуватися взаємодія з обʼєктом.

Наприклад, коли дістаємося до значення поля `obj.x` відбувається один з наступних сценаріїв:

1. Шукаємо поле `x` в ланцюжку прототипів (prototype chain), допоки поле не буде знайдене
2. Якщо `x` додано через `Object.defineProperty()`, то повертаємо значення атрибута `value`
3. Поле `x` може бути геттером —> `get x() {}`. В такому випадку виконуємо гетер і повертаємо значення

Тому синтаксис `obj.x` виконує метод `[[GET]]`, а обʼєкт використовує його власну внутрішню реалізацію цього методу, щоб визначити яке значення повернути. (ця частина тексту взята з [mdn](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy#object_internal_methods))

Які ще можуть бути внутрішні методи?

Це може бути сетер ☘️🐶 `obj.y = 2`. Або ж has 🏎️ `propKey in obj`

### Trap

Коли мова йде про `Proxy`, то часто згадується термін `trap` (пастка). **Trap** — це функція, яка визначає як буде поводити себе відповідний внутрішній метод обʼєкту, коли ми створюємо проксі

Ми їх вже зустрічали раніше:

```js
const target = { msg: 'hello' };
const handler = {
    get() {} // <---- це trap
    has() {} // <---- і це trap
};

const proxy = new Proxy(target, handler);
```

На [mdn є табличка](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy#object_internal_methods), де зображені всі внутрішні методи обʼєкта та їх відповідні пастки

### Reflect

`Reflect` — це остання частина теорії, про яку варто згадати, перед тим, як рухатися до прикладів.

Згадаймо функцію, для логувати звернення до полів обʼєкту, про яку говорили раніше:

```js
function traceProperty(obj, ...keys) {
  const handler = {
    get(target, propKey) {
      if (keys.includes(propKey)) {
        console.log(`Get property ${propKey}`);
      }

      return target[propKey];
    },
  };

  return new Proxy(obj, handler);
}
```

В пастці `get` ми спочатку логуємо назву поля, до якого відбувається звернення, а після цього власноруч виконуємо діставання елементу з обʼєкту `target[propKey]`. До `ES6` разом з `Proxy` було додано обʼєкт `Reflect`, який включає методи, що допомагають відтворити поведінку внутрішніх методів обʼєкту. Звучить складно, проте на практиці простіше. Наприклад, код вище з використанням `Reflect` буде мати вигляд:

```js
function traceProperty(obj, ...keys) {
  const handler = {
    get(target, propKey, receiver) {
      if (keys.includes(propKey)) {
        console.log(`Get property ${propKey}`);
      }

      return Reflect.get(target, propKey, receiver); // або Reflect.get(...arguments);
    },
  };

  return new Proxy(obj, handler);
}
```

Інший приклад ([джерело](https://exploringjs.com/deep-js/ch_proxies.html#improvement-using-reflect.)):

```js
const handler = {
  deleteProperty(target, propKey) {
    return Reflect.deleteProperty(target, propKey); // щоб не писати delete target[propKey];
  },
  has(target, propKey) {
    return Reflect.has(target, propKey); // щоб не писати propKey in target;
  },
};
```

Для кожної пастки: `handler.trap(target, arg_1, ···, arg_n)`

`Reflect` має відповідний метод: `Reflect.trap(target, arg_1, ···, arg_n)`

### Підсумуємо теорію

1. `Proxy` дозволяє перехоплювати та перевизначати поведінку внутрішніх методів обʼєкта, наприклад таких як `get` або `set`.

2. Приклад створення `Proxy`:

```js
const target = { msg: 'hello' };
const handler = {
    ownKeys() {} // <---- це trap
    has() {} // <---- і це trap
};

const proxy = new Proxy(target, handler);
```

3. Використовуємо `Reflect.[trap]` для відтворення семантичного виклику (the reflective semantics for invoking) відповідного внутрішнього метода обʼєкта.

   Наприклад `'propName' in obj` —> `Reflect.has(obj, 'propName')` або `obj.propName` —> `Reflect.get(obj, 'propName')`

## Приклади використання

### Ховання "приватних" полів

В JavaScript зʼявилась нова фіча — [приватні поля](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_class_fields). До появи цієї фічі, розробники могли домовлятися між собою, що умовно, в обʼєкті приватними полями будуть ті, які починаються з нижнього підкреслення, наприклад `_name`.

```js
const person = {
  age: 42,
  name: 'Philip',
  _allergy: 'fish', // приватне поле за нашими домовленостями
};
```

З усім тим, це були "умовно" приватні поля, тому їх значення можна змінювати — `peson._allergy = ''`.

Завдяки `Proxy`, їх можна зробити по-справжньому приватними:

```js
const data = {
  age: 42,
  name: 'Philip',
  _allergy: 'fish',
};

const person = new Proxy(data, {
  get(target, propertyKey, receiver) {
    if (propertyKey.startsWith('_')) {
      throw new SyntaxError('Could not get private member.');
    }

    return Reflect.get(target, propertyKey, receiver);
  },
  set(target, propertyKey, value, receiver) {
    if (propertyKey.startsWith('_')) {
      throw new SyntaxError('Could not set value for private member.');
    }

    return Reflect.set(target, propertyKey, value, receiver);
  },
  ownKeys(target) {
    return Reflect.ownKeys(target).filter(function (name) {
      return !name.startsWith('_');
    });
  },
});

console.log(Object.keys(person)); // ["age", "name"]
console.log(person._allergy); // "SyntaxError: Could not get private member.
person._allergy = ''; // "SyntaxError: Could not set value for private member.
```

Оскільки "умовно" приватні поля починаються з символа `_`, то у кожній пастці ми перевіряємо, чи назва поля починається з цього символу. Якщо починається, то пастка кидає помилку

### Нескінченний обʼєкт

Можливо ви опинялись в подібній ситуації. Спокійно працюєте з обʼєктом `data`, а потім раптом хочете додати нове поле з певним значенням — `data.person.name = 'Lil';`. Результат — отримуємо помилку `Uncaught TypeError: Cannot read properties of undefined`

Завдяки Proxy є можливість створити обʼєкт, якому така помилка не загрожує:

```js
function infinityObject() {
  return new Proxy(
    {},
    {
      get(target, propertyKey, receiver) {
        if (!Reflect.has(target, propertyKey)) {
          target[propertyKey] = infinityObject();
        }

        return Reflect.get(target, propertyKey, receiver);
      },
    }
  );
}

const dog = infinityObject();

dog.head.ear.size = 'small'; // присвоєно значення 'small'

console.log(dog.body.legs.top.right); // виведе в консоль `Proxy {}`
```

В даному прикладі створюється рекурсивне `Proxy`. При зверненні до неіснуючого поля обʼєкту, створюється це поле зі значенням, яке повертає `infinityObject()`, тобто запроксьований порожній обʼєкт.

## Примітки

### Чи є можливість заполіфілити `Proxy`?

Частково. Наприклад, [proxy-polyfill](https://github.com/GoogleChrome/proxy-polyfill) від команди Google Chrome
вміє полфілити такі пастки: `get`, `set`, `apply`, `consturctor`

### Чи можна відвʼязати `Proxy` від обʼєкта?

Так, якщо проксі створене через `Proxy.revocable()`:

```js
const target = {};
const handler = {};
const { proxy, revoke } = Proxy.revocable(target, handler);

proxy.city = 'Kyiv'; // set 'city'

revoke();

proxy.prop; // it will throw an error
```

### Які бібліотеки використовують `Proxy`?

- [Immer](https://github.com/immerjs/immer)
- [MobX](https://mobx.js.org/README.html)
- [Comlink](https://github.com/GoogleChromeLabs/comlink)

## Додаткові матеріали

- Розділ книги по js від `2ality` [присвячений Proxy](https://exploringjs.com/deep-js/ch_proxies.html)
- `Awesome list` [про проксі](https://github.com/mikaelbr/awesome-es2015-proxy)
