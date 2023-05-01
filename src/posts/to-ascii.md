---
title: Конвертація графічного контенту в ASCII символи
date: 2023-02-23
description: Експеремент з canvas та його можливостями у роботі з зображеннями
tags:
  - javascript
  - canvas
---

Якось зрозумів, що у повсякденній роботі не використовую `canvas`. Хоча завдяки його `API` можна створювати фантастичні проєкти

Наприклад, ось декілька сайтів, які зберіг собі для натхнення:

- [Портфоліо з автомобілем 🏎️](https://bruno-simon.com/)
- [Генеративна графіка](https://epok.tech/work/tendrils/)
- [Багетний спринт](https://artsandculture.google.com/experiment/ZQFQrRgrvmOImQ)
- [Автомобільна гра з нескінченною дорогою](https://slowroads.io/)
- [Канвас для малювання](https://excalidraw.com/)

Тому щоб трохи зануритися в `canvas API` вирішив також створити невеличкий проєкт, але зі значно простішим функціоналом

## Яка ідея проєкту?

Ідея проєкту — навчитися конвертувати картинки в ASCII символи

Приклад того, що планую отримати для картинок. Зліва — оригінальна картинка, справа — конвертована картинка в ascii символи

![example of idea](/assets/images/to-ascii/example.png)

## Реалізація

### Алгоритм

Перед написанням коду формалізую алгоритм, за яким буде відбуватися перетворення картинки в символи:

- Діставання інформацію про колір кожного пікселя картинки
- Перетворення кольорового пікселя у сірий відтінок
- Заміна сірого відтінку на відповідний ascii символ

Основна ідея алгоритму — знайти спосіб представити якийсь колір з картинки у вигляді ASCII символу. У даному випадку буде відбуватися заміна насиченості кольору на символ — чим темніший колір, тим щільніший буде символ. Умовно: темно-голубий колір буде — `Ñ`, а світло-жовтий — `+`. Оскільки кольорів багато, то для їх нормалізації використовується перетворення у сірий відтінок. Наприклад, для rgb-системи доступно 256 відтінків сірого, якщо враховувати крайні точки у вигляді чорного та білого кольорів

Картинка для візуальної ілюстрації

![Converting color to gray to ascii](/assets/images/to-ascii/color-to-gray-to-ascii.png)

#### Діставання інформації про колір картинки

В canvas api є метод [`getImageData`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData), який повертає обʼєкт [`ImageData`](https://developer.mozilla.org/en-US/docs/Web/API/ImageData). Обʼєкт `ImageData` містити інформацію про колір кожного пікселя певної області `canvas`. Важливо розуміти, що інформація про колір пікселів картинки зберігається в одномірному масиві, де кожні 4 поспіль елементи масиву містять інформацію про колір одного пікселя в `rgba`.

Але як вставити картинку в `canvas`? Для цього є метод [`drawImage`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage), який дозволяє відмалювати картинку в `canvas`

Текст вище у вигляді `html` та `js` коду:

```html
<figure>
  <img
    src="https://images.unsplash.com/photo-1659992271797-c34f19b6f076?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2076&q=80"
    alt=""
    width="680"
    class="image-js"
    crossorigin
  />
  <figcaption>Original Image</figcaption>
</figure>
<figure>
  <canvas class="canvas-js"></canvas>
  <figcaption>Canvas Image</figcaption>
</figure>
```

```js
const img = document.querySelector('.image-js');

img.onload = function () {
  const { width: sceneWidth, height: sceneHeight } = img;

  const canvas = document.querySelector('.canvas-js');
  const ctx = canvas.getContext('2d');

  canvas.width = sceneWidth;
  canvas.height = sceneHeight;

  ctx.drawImage(img, 0, 0, sceneWidth, sceneHeight);

  const imageData = ctx.getImageData(0, 0, sceneWidth, sceneHeight);
  const data = imageData.data;

  console.log(data); // масив з 1226720 елементів [109, 140, 151, 255, ...]
};
```

У даному шматочку коду спочатку очікується завантаження картинки. Після її завантаження — відбувається відмалювання картинки у `canvas` завдяки `drawImage`. Відмалювавши картинку, є можливість дістати інформацію про кольори пікселів через метод `getImageData`. У цьому прикладі метод `getImageData` повертає масив з `1226720` елементів. Перші чотири елементи масиву — `[109, 140, 151, 255]` відповідають за колір `rgba(109, 140, 151, 255)` першого пікселя картинки.

На даному етапі відбувається копіювання картинки з `img` в `canvas`

[codepen VoloshchenkoAl rNrXQpy dark 376]

#### Конвертація кольорів у сірі відтінки

Для мене було відкриттям, але існує як мінімум [13 різних методів](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0029740#s2) перетворити певний колір у сірий відтінок. У даному прикладі буде використовуватися формула: $$g = {max(R, G, B) + min(R, G, B)\over 2}$$

Скомбінуємо цю формулу з кодом попереднього етапу

```js
const imageData = ctx.getImageData(0, 0, sceneWidth, sceneHeight);
const data = imageData.data;

for (let x = 0; x < sceneWidth; x++) {
  for (let y = 0; y < sceneHeight; y++) {
    const pixelIndex = (x + y * sceneWidth) * 4; // конвертуємо двомірний масив у одновимірний
    const r = data[pixelIndex];
    const g = data[pixelIndex + 1];
    const b = data[pixelIndex + 2];
    const gray = rgbToGray(r, g, b);

    data[pixelIndex] = gray;
    data[pixelIndex + 1] = gray;
    data[pixelIndex + 2] = gray;
  }
}

ctx.putImageData(imageData, 0, 0);

function rgbToGray(r, g, b) {
  return Math.round((Math.max(r, g, b) + Math.min(r, g, b)) / 2);
}
```

Код вище можна розділити на 3 складові:

1. Дістаємо інформацію про колір кожного пікселя з `canvas` використовуючи вже відому функцію `getImageData`. Інформація про кольори пікселів знаходяться в одновимірному масиві `data`, тому щоб дістатися до інформації про колір пікселя, потрібно конвертувати двовимірне положення пікселя з `canvas` в одновимірний відповідник `data`. Власне це і відбувається у визначенні значення для змінної `pixelIndex`. Значення `pixelIndex` з кожною ітерацією множимо на 4, оскільки кольори в `data` зберігаються в `rgba` форматі, тобто 4 поспіль елементи відповідають за кожний з каналів `rgba`

2. Конвертуємо отримане `rgba` значення кольору у сірий відтінок

3. Завдяки функції [`putImageData`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/putImageData) відмальовуємо оновлену `imageData` в `canvas`

В результаті цих маніпуляцій отримуємо картинку конвертовану у відтінки сірого

[codepen VoloshchenkoAl xxaKwbg dark 376]

#### Конвертація відтінків сірого у ASCII символ

Найцікавіша частина: як конвертувати відтінки сірого у `ASCII` символи? На початку статті вже було проговорено правило: чим темніший піксель картинки — тим щільніший буде символ. Але що означає "щільний символ"? Умовно кажучи — чим щільніший символ використовуємо, тим темнішим він буде видаватися. Оскільки `ASCII` символів багато і вони доволі різноманітні, то вибравши з них потрібні елементи та впорядкувавши їх по щільності можна отримати градієнт, який подібний до градієнта відтінків сірого. У цьому випадку буде використовуватися послідовність `Ñ@#W$9876543210?!abc;:+=-,._ `, яка взята з сайту [play.ertdfgcvb.xyz](https://play.ertdfgcvb.xyz/)

![Gray to ASCII symbols](/assets/images/to-ascii/gray-to-ascii.png)

Використовуючи функцію `rgbToGray`, яка описана вище, можливо отримати 256 відтінків сірого. Ці відтінки можна зіставити з послідовністю `Ñ@#W$9876543210?!abc;:+=-,._ `.

```js
const imageData = ctx.getImageData(0, 0, sceneWidth, sceneHeight);
const data = imageData.data;

ctx.font = '1px monospace';
ctx.fillStyle = 'white';
ctx.fillRect(0, 0, sceneWidth, sceneHeight);
ctx.fillStyle = 'black';

for (let x = 0; x < sceneWidth; x++) {
  for (let y = 0; y < sceneHeight; y++) {
    const pixelIndex = (x + y * sceneWidth) * 4;
    const r = data[pixelIndex];
    const g = data[pixelIndex + 1];
    const b = data[pixelIndex + 2];
    const gray = rgbToGray(r, g, b);
    const symbol = grayToSymbol(gray);

    ctx.fillText(symbol, x, y);
  }
}

function grayToSymbol(gray) {
  const density = 'Ñ@#W$9876543210?!abc;:+=-,._ ';
  const index = Math.round(((density.length - 1) / 255) * gray);

  return density.charAt(index);
}
```

У даному коді відбулось декілька змін:

1. Прибрано відмальовування картинки на `canvas`, оскільки нам потрібно відображати `ascii` символи
2. Додано функцію `grayToSymbol`, яка конвертує відтінок сірого у `ascii` символ
3. Перед ітерацією описано декілька маніпуляцій з `canvas`, які необхідні для коректного відображення символів
4. У самій ітерації відбувається заміна кожного пікселя картинки на відповідний символ

[codepen VoloshchenkoAl ExeYVMb dark 376]

Але результат виглядає не дуже 😭

#### Калібрування алгоритму

Результат з попереднього кроку не задовільняє моїх очікувань. Символи відображаються маленькими, тому їх зовсім не видно. Щоб виправити це, спробую збільшити розмір символів, а також буду відображати на канвасі кожний шостий піксель

```js
const PIXEL_SHIFT = 6;

ctx.font = `${PIXEL_SHIFT}px monospace`;
ctx.fillStyle = 'white';
ctx.fillRect(0, 0, sceneWidth, sceneHeight);
ctx.fillStyle = 'black';

for (let x = 0; x < sceneWidth / PIXEL_SHIFT; x++) {
  for (let y = 0; y < sceneHeight / PIXEL_SHIFT; y++) {
    const pixelIndex = (x + y * sceneWidth) * 4 * PIXEL_SHIFT;
    const r = data[pixelIndex];
    const g = data[pixelIndex + 1];
    const b = data[pixelIndex + 2];
    const gray = rgbToGray(r, g, b);
    const symbol = grayToSymbol(gray);

    ctx.fillText(symbol, x * PIXEL_SHIFT, y * PIXEL_SHIFT);
  }
}
```

У даному коді додано змінну `PIXEL_SHIFT`, яка відповідає за кількість пікселів, які будуть пропускатися при кожній ітерації

Це вже краще

[codepen VoloshchenkoAl rNZBeNo dark 376]

Тепер спробуємо інвертувати кольори та символи

```js
const PIXEL_SHIFT = 6;

ctx.font = `${PIXEL_SHIFT}px monospace`;
ctx.fillStyle = 'black';
ctx.fillRect(0, 0, sceneWidth, sceneHeight);
ctx.fillStyle = 'white';

// ...

function grayToSymbol(gray) {
  const density = 'Ñ@#W$9876543210?!abc;:+=-,._ '.split('').reverse().join('');
  const index = Math.round(((density.length - 1) / 255) * gray);

  return density.charAt(index);
}
```

З цими змінами фон `canvas` відмальовується у чорному кольори, а символи — білим. При цьому зміна торкнулась функції `grayToSymbol` — щільніший символ тепер відповідає світлішому відтінку сірого

Результат фінальної ітерації

[codepen VoloshchenkoAl MWqgyKP dark 376]

## Матеріали

Для написання статті використовував документацію MDN з описом [маніпуляції пікселів на canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas) та відео з YouTube [ASCII Text Images з p5.js](https://www.youtube.com/watch?v=55iwMYv8tGI)
