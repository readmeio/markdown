---
title: 'Code Blocks'
category: 5fdf7610134322007389a6ed
hidden: false
---

## Examples

### Tabbed Code Blocks

```javascript I'm A tab
console.log('Code Tab A');
```
```javascript I'm tab B
console.log('Code Tab B');
```

### Single Code Block

```javascript
console.log('a code block');
```

## Syntax

We offer both classic single code blocks, as well as a tabbed interface for displaying multiple code blocks concisely! These are written nearly identically to a series of vanilla markdown code snippets, except for their distinct lack of an additional line break separating each subsequent block:

````
```javascript I'm A tab
console.log('Code Tab A');
```
```javascript I'm tab B
console.log('Code Tab B');
```
````

## Custom CSS

```css Theme Variables
.markdown-body {
  --md-code-background: #e3dcef;
  --md-code-text: #4a2b7b;
  --md-code-tabs: #c6b8dd;
  --md-code-radius: 4px;
}
```

<div style={{ '--md-code-background': '#e3dcef', '--md-code-text': '#4a2b7b', '--md-code-tabs': '#c6b8dd', '--md-code-radius': '4px' }}>
```js Tab 0
console.log('Tab Zed');
```
```js Tab 1
console.log('Tab One');
```
</div>

## Language Support

We support syntax highlighting on a number of languages:

| Language      | Available language mode(s)                                                           |
| :------------ | :----------------------------------------------------------------------------------- |
| ASP.NET       | `asp`, `aspx`                                                                        |
| C             | `c`                                                                                  |
| C++           | `c++`, `cpp`, `cplusplus`                                                            |
| C#            | `cs`, `csharp`                                                                       |
| Clojure       | `clj`, `cljc`, `cljx`, `clojure`                                                     |
| CSS           | `css`, `less`, `sass`, `scss`, `styl`, `stylus`                                      |
| cURL          | `curl`                                                                               |
| D             | `d`                                                                                  |
| Dart          | `dart`                                                                               |
| Diff          | `diff`                                                                               |
| Docker        | `dockerfile`                                                                         |
| Erlang        | `erl`, `erlang`                                                                      |
| Go            | `go`                                                                                 |
| GraphQL       | `gql`, `graphql`                                                                     |
| Groovy        | `gradle`, `groovy`                                                                   |
| Handlebars    | `handlebars`, `hbs`                                                                  |
| HTML/XML      | `html`, `xhtml`, `xml`                                                               |
| HTTP          | `http`                                                                               |
| Java          | `java`                                                                               |
| JavaScript    | `coffeescript`, `ecmascript`, `javascript`, `js`, `node`                             |
| JSX           | `jsx`                                                                                |
| JSON          | `json`                                                                               |
| Julia         | `jl`, `julia`                                                                        |
| Kotlin        | `kotlin`, `kt`                                                                       |
| Liquid        | `liquid`                                                                             |
| Lua           | `lua`                                                                                |
| Markdown      | `markdown`                                                                           |
| Mermaid       | `mermaid`                                                                            |
| Objective-C   | `objc`, `objectivec`,                                                                |
| Objective-C++ | `objc++`, `objcpp`, `objectivecpp`, `objectivecplusplus`,                            |
| OCaml         | `ocaml`, `ml`                                                                        |
| Perl          | `perl`, `pl`                                                                         |
| PHP           | `php`                                                                                |
| PowerShell    | `powershell`, `ps1`                                                                  |
| Python        | `py`, `python`                                                                       |
| R             | `r`                                                                                  |
| React         | `jsx`                                                                                |
| Ruby          | `jruby`, `macruby`, `rake`, `rb`, `rbx`, `ruby`                                      |
| Rust          | `rs`, `rust`                                                                         |
| Scala         | `scala`                                                                              |
| Shell         | `bash`, `sh`, `shell`, `zsh`                                                         |
| Solidity      | `sol`, `solidity`                                                                    |
| SQL           | `cql`, `mssql`, `mysql`, `plsql`, `postgres`, `postgresql`, `pgsql`, `sql`, `sqlite` |
| Swift         | `swift`                                                                              |
| TypeScript    | `ts`, `typescript`                                                                   |
| YAML          | `yaml`, `yml`                                                                        |
