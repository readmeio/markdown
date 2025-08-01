---
title: 'Code Block Tests'
category: 5fdf9fc9c2a7ef443e937315
hidden: true
---

## Basics

### Simple

```php
<b><?= "Hello world!" ?></b>;
```

```js
console.log('Hello world!');
```

### Tab Meta

```Zed
Tab Number Zero
```

```One
Tab Number One
```

### Lang Meta

```js English
console.log('Hello world!');
```

```js French
console.log('Bonjour le monde!');
```

```js German
console.log('Hallo welt!');
```

## Breakage

### Block Separator 👍

##### Section One

```Plain
console.log("zed");
```

##### Section Two

```js Highlighted
console.log('one');
```

`Hello` the `world`?

### Inline Separator 👍

**Section One**

```Plain
console.log("zed");
```

**Section Two**

```js Highlighted
console.log('one');
```

### Plain-Text Separator

Section One

```Plain
console.log("zed");
```

Section **Two**

```js Highlighted
console.log('one');
```

## Block Wraps

### List-Internal

- ```Name
  {{company_name}}
  ```
  ```Email
  {{company_email}}
  ```
  ```URL
  {{company_url}}
  ```

## Formatting

```
This is a long line that will be wrapped to fit within the container.
```
