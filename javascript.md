# JavaScript Cheat Sheet for QA Testers

A quick reference to modern JavaScript (ES2023+), Node.js, and the JS tools QA testers use most: test runners, browser automation, and DevTools.

## Table of Contents

1. [Setup and Configuration](#1-setup-and-configuration)
2. [Core Concepts](#2-core-concepts)
3. [Everyday Syntax](#3-everyday-syntax)
4. [Debugging and Troubleshooting](#4-debugging-and-troubleshooting)
5. [Undoing Mistakes](#5-undoing-mistakes)
6. [Advanced but Useful](#6-advanced-but-useful)
7. [Testing Toolkit for QA](#7-testing-toolkit-for-qa)
8. [Workflow Recipes](#8-workflow-recipes)
9. [Shortcuts and Config Snippets](#9-shortcuts-and-config-snippets)
10. [Common Pitfalls](#10-common-pitfalls)
11. [Glossary](#11-glossary)

> **Legend:** `<placeholder>` = replace with your own value · ⚠️ = destructive or risky · JS comments use `//`, shell comments use `#`.

---

## 1. Setup and Configuration

### Install Node.js (runs JS outside the browser)

```bash
# Recommended: a version manager, so each project can use its own Node version
# Install nvm first (copy the current install line from github.com/nvm-sh/nvm)
nvm install --lts            # install the latest Long-Term-Support Node
nvm use --lts                # switch to it in this shell
nvm alias default 'lts/*'    # use it by default in new shells
node -v                      # check Node version
npm -v                       # check npm (package manager) version
```

| OS | Recommended option |
|---|---|
| Linux / macOS | `nvm` or `fnm` (version managers) |
| Arch Linux | `sudo pacman -S nodejs npm` (one system-wide version) or `nvm` |
| Windows | `fnm`, `nvm-windows`, or the LTS installer from nodejs.org |

> Use the **LTS** version (even numbers: 22, 24…). Odd-numbered releases are short-lived.

### Run JavaScript

```bash
node                              # open the REPL (interactive prompt); .exit to quit
node <file>.js                    # run a file
node --watch <file>.js            # re-run on every save
node --env-file=.env <file>.js    # load environment variables from a .env file
node -e "console.log(1 + 1)"      # run a one-liner
```

In the browser: **F12 → Console** tab runs JS against the current page.

### Start a project

```bash
mkdir <project> && cd <project>   # create and enter the folder
npm init -y                       # create package.json with defaults
npm pkg set type=module           # enable modern import/export (ESM)
npm install <package>             # add a runtime dependency
npm install -D <package>          # add a dev dependency (test tools go here)
npm ci                            # clean install exactly from package-lock.json (CI)
npx <tool>                        # run a package's CLI without installing globally
```

### package.json essentials

```json
{
  "name": "<project>",
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "e2e": "playwright test"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```

- `"type": "module"` → files use `import`/`export` (ESM). Without it, Node uses CommonJS (`require`).
- `"scripts"` → run with `npm run <name>` (`npm test` is a shortcut).
- `^3.0.0` → "any 3.x version at or above 3.0.0" (semantic versioning).

| File / folder | Purpose | Commit to git? |
|---|---|---|
| `package.json` | Project manifest: scripts, dependencies | ✅ Yes |
| `package-lock.json` | Exact installed versions (reproducible installs) | ✅ Yes |
| `node_modules/` | Downloaded packages (can be huge) | ❌ No, add to `.gitignore` |
| `.env` | Secrets and local config | ❌ No, never |

> **Editor:** VS Code + extensions **ESLint**, **Prettier**, **Playwright Test for VS Code**, **Vitest**.

---

## 2. Core Concepts

### How the pieces connect

```text
                       Your JavaScript code (.js / .ts)
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
          ┌──────────────────┐          ┌──────────────────┐
          │     Browser      │          │     Node.js      │
          │ JS engine (V8)   │          │ JS engine (V8)   │
          │ + DOM, window,   │          │ + fs, process,   │
          │   localStorage   │          │   npm packages   │
          └────────┬─────────┘          └────────┬─────────┘
                   │                             │
       DevTools (manual testing,       Test runners: Vitest, Jest, node:test
       console, network)               Automation: Playwright ──► drives the Browser
```

### The event loop (why tests need `await`)

```text
  Call Stack            Browser / Node APIs           Queues
  ┌───────────┐  ──►  fetch, setTimeout,   ──►   Microtasks (Promises)   ← run first
  │ your code │       file I/O, clicks           Macrotasks (timers, I/O)
  └───────────┘  ◄──────── Event loop runs the next task when the stack is empty
```

- JS is **single-threaded**: one thing runs at a time.
- Slow work (network, timers) runs **asynchronously**; you get the result later through a **Promise**.
- If you don't `await`, your code (and your test) moves on **before** the result arrives.

### Data types

| Type | Example | `typeof` result |
|---|---|---|
| string | `'hello'`, `` `hi ${name}` `` | `'string'` |
| number | `42`, `3.14`, `NaN`, `Infinity` | `'number'` |
| bigint | `9007199254740993n` | `'bigint'` |
| boolean | `true`, `false` | `'boolean'` |
| undefined | declared but no value | `'undefined'` |
| null | intentional "no value" | `'object'` ⚠️ (historic bug) |
| symbol | `Symbol('id')` | `'symbol'` |
| object | `{}`, `[]`, `new Date()` | `'object'` |
| function | `() => {}` | `'function'` |

### Truthy and falsy

Falsy (treated as `false` in `if`): `false`, `0`, `-0`, `0n`, `''`, `null`, `undefined`, `NaN`.
**Everything else is truthy**, including `'0'`, `'false'`, `[]`, and `{}`.

### Value vs reference

```js
let a = 5;
let b = a;              // copies the value
b = 10;                 // a is still 5

const obj1 = { n: 1 };
const obj2 = obj1;      // copies the REFERENCE (same object)
obj2.n = 99;            // obj1.n is now 99 too
obj1 === { n: 99 }      // false: different objects, even with equal content
```

> This is why tests use `toEqual` (compares content) instead of `toBe` (compares identity) for objects and arrays.

---

## 3. Everyday Syntax

### Variables

```js
const name = 'Ana';     // can't be reassigned: your default choice
let count = 0;          // use when the value must change
count += 1;             // reassign
var legacy = 1;         // ⚠️ old: function-scoped and hoisted; avoid in new code
```

### Strings

```js
const msg = `Hello, ${name}!`;   // template literal (backticks) with interpolation
msg.length                       // 11
msg.includes('Hello')            // true
msg.startsWith('He')             // true
msg.toUpperCase()                // 'HELLO, ANA!'
msg.slice(0, 5)                  // 'Hello'
msg.split(', ')                  // ['Hello', 'Ana!']
msg.replaceAll('l', 'L')         // 'HeLLo, Ana!'
'  text  '.trim()                // 'text'
'5'.padStart(3, '0')             // '005'
```

### Numbers

```js
Number('42')               // 42
Number('42px')             // NaN (not a number)
parseInt('42px', 10)       // 42: always pass the radix (10)
parseFloat('3.14')         // 3.14
(0.1 + 0.2).toFixed(2)     // '0.30' (returns a string)
Math.round(2.5)            // 3
Math.max(...[1, 5, 3])     // 5
Number.isNaN(value)        // reliable NaN check
Number.isInteger(5.0)      // true
```

### Comparison and logic operators

| Operator | Meaning | Example → result |
|---|---|---|
| `===` / `!==` | Strict equal / not equal (no type conversion) | `1 === '1'` → `false` |
| `==` / `!=` | ⚠️ Loose equal (converts types) | `1 == '1'` → `true` |
| `&&` | AND (returns first falsy value or the last value) | `user && user.name` |
| `\|\|` | OR (returns first truthy value) | `input \|\| 'default'` |
| `??` | Nullish: default only for `null`/`undefined` | `0 ?? 10` → `0` |
| `?.` | Optional chaining: stops if `null`/`undefined` | `user?.address?.city` |
| `!` | NOT | `!true` → `false` |

### Conditionals

```js
if (status === 200) {
  // success
} else if (status >= 500) {
  // server error
} else {
  // anything else
}

const label = passed ? 'PASS' : 'FAIL';   // ternary: inline if/else

switch (code) {
  case 404:
    console.log('Not found');
    break;                                // without break, falls through to the next case
  default:
    console.log('Other');
}
```

### Functions

```js
function add(a, b) {                          // declaration (hoisted: usable before defined)
  return a + b;
}
const multiply = (a, b) => a * b;             // arrow function, implicit return
const greet = (name = 'guest') => `Hi ${name}`;   // default parameter
const sum = (...nums) => nums.reduce((t, n) => t + n, 0);  // rest parameter: any count
const makeUser = (name) => ({ name, active: true });       // return an object: wrap in ()
```

### Arrays: "I want to… → use this"

| I want to… | Use | Returns |
|---|---|---|
| Transform every item | `arr.map(fn)` | New array |
| Keep only matching items | `arr.filter(fn)` | New array |
| Get the first match | `arr.find(fn)` / `arr.findIndex(fn)` | Item or `undefined` / index or `-1` |
| Get the last match | `arr.findLast(fn)` | Item or `undefined` |
| Check if any item matches | `arr.some(fn)` | Boolean |
| Check if all items match | `arr.every(fn)` | Boolean |
| Check if it contains a value | `arr.includes(value)` | Boolean |
| Reduce to one value (sum, object) | `arr.reduce(fn, start)` | Anything |
| Sort without changing the original | `arr.toSorted(fn)` | New array |
| Reverse without changing the original | `arr.toReversed()` | New array |
| Get the last item | `arr.at(-1)` | Item |
| Copy a part | `arr.slice(start, end)` | New array |
| Add / remove at the end | `push` / `pop` | ⚠️ Mutates |
| Add / remove at the start | `unshift` / `shift` | ⚠️ Mutates |
| Insert / remove in the middle | `splice` ⚠️ mutates · `toSpliced` (copy) | |
| Flatten nested arrays | `arr.flat()` | New array |
| Group items by a key | `Object.groupBy(arr, fn)` | Object |
| Join into a string | `arr.join(', ')` | String |

```js
const users = [
  { name: 'Ana', age: 31, active: true },
  { name: 'Bia', age: 17, active: false },
];

users.map(u => u.name)                      // ['Ana', 'Bia']
users.filter(u => u.active)                 // [{ name: 'Ana', ... }]
users.find(u => u.age < 18)                 // { name: 'Bia', ... }
users.some(u => !u.active)                  // true
users.every(u => u.age > 0)                 // true
users.reduce((sum, u) => sum + u.age, 0)    // 48
users.toSorted((a, b) => a.age - b.age)     // new array, youngest first
Object.groupBy(users, u => u.active ? 'active' : 'inactive')   // { active: [...], inactive: [...] }
```

### Objects

```js
const user = { name: 'Ana', role: 'qa', address: { city: 'SP' } };

user.name                               // 'Ana'
user['role']                            // 'qa' (bracket notation for dynamic keys)
user.address?.city                      // 'SP' (no crash if address is missing)
user.phone ?? 'n/a'                     // 'n/a'
Object.keys(user)                       // ['name', 'role', 'address']
Object.values(user)                     // ['Ana', 'qa', { city: 'SP' }]
Object.entries(user)                    // [['name', 'Ana'], ['role', 'qa'], ...]
'role' in user                          // true
const updated = { ...user, role: 'lead' };   // shallow copy + override one field
const { role, ...rest } = user;              // copy without 'role' (safer than delete)
```

### Destructuring and spread

```js
const { name, team = 'none' } = user;          // pull out properties (with a default)
const { address: { city } } = user;            // nested destructuring
const [first, second, ...others] = [1, 2, 3, 4];   // arrays: first=1, others=[3, 4]
const all = [...listA, ...listB];              // merge arrays
const settings = { ...defaults, ...overrides };    // merge objects (right side wins)
```

### Loops

```js
for (const item of items) { }        // values of arrays, strings, Map, Set ✅
for (const key in obj) { }           // keys of an object (⚠️ not for arrays)
for (let i = 0; i < items.length; i++) { }   // classic index loop
while (condition) { }                // loop while true
items.forEach((item, i) => { });     // ⚠️ can't break; doesn't wait for await
// break     → exit the loop
// continue  → skip to the next iteration
```

### Modules (import / export)

```js
// math.js
export const add = (a, b) => a + b;                      // named export
export default function subtract(a, b) { return a - b; } // default export (one per file)

// main.js
import subtract, { add } from './math.js';   // default + named; ESM in Node needs '.js'
import * as math from './math.js';           // everything as one object
import fs from 'node:fs';                    // Node built-in module
```

Older **CommonJS** syntax, still common in Jest tutorials and older projects:

```js
const { add } = require('./math');   // import
module.exports = { add };            // export
```

### JSON

```js
JSON.stringify(obj)             // object → string
JSON.stringify(obj, null, 2)    // pretty-printed with 2-space indent
JSON.parse(text)                // string → object (throws SyntaxError if invalid)
```

---

## 4. Debugging and Troubleshooting

### Console methods

| Method | Use it for |
|---|---|
| `console.log(a, b)` | General output |
| `console.table(arr)` | Arrays of objects as a table (great for API data) |
| `console.error()` / `console.warn()` | Red / yellow output; filterable in DevTools |
| `console.dir(obj, { depth: null })` | Full nested object in Node (log cuts off deep levels) |
| `console.time('x')` / `console.timeEnd('x')` | Measure how long something takes |
| `console.count('x')` | How many times a line was reached |
| `console.trace()` | Print the call stack (who called this?) |
| `console.assert(cond, 'msg')` | Logs only if `cond` is false |
| `console.group('x')` / `console.groupEnd()` | Indent related logs |

### Breakpoints

```js
debugger;   // pauses here when DevTools (or a debugger) is open
```

```bash
node --inspect-brk <file>.js     # start paused; open chrome://inspect in Chrome
npx vitest --inspect-brk         # debug Vitest tests
npx playwright test --debug      # step through Playwright tests with the Inspector
```

> **Easiest in VS Code:** open a **JavaScript Debug Terminal** (Command Palette → "Debug: JavaScript Debug Terminal"). Any `node`/`npm`/`npx` command run there stops at your breakpoints.

### Inspect values

```js
typeof x                   // 'string', 'number', 'object', 'undefined', 'function'...
Array.isArray(x)           // true for arrays (typeof only says 'object')
x === null                 // the only reliable null check
x instanceof Date          // was it created by this class?
Object.keys(x)             // what properties does it have?
JSON.stringify(x, null, 2) // see the full structure as text
```

### Reading common errors

| Error message | Usual cause | Fix |
|---|---|---|
| `TypeError: Cannot read properties of undefined (reading 'x')` | The thing before `.x` is `undefined` | Log it; check data or use `?.` |
| `ReferenceError: x is not defined` | Typo, missing import, or wrong scope | Check spelling and imports |
| `TypeError: x is not a function` | Wrong import (default vs named), typo | Check the export style |
| `TypeError: Assignment to constant variable` | Reassigned a `const` | Use `let` |
| `SyntaxError: Unexpected token` | Missing bracket/comma, or `JSON.parse` got HTML | Check syntax; log the raw response |
| `Cannot use import statement outside a module` | File is CommonJS | Add `"type": "module"` or use `.mjs` |
| `ERR_MODULE_NOT_FOUND` | Wrong path, missing `.js`, or package not installed | Fix the path / run `npm install` |
| `UnhandledPromiseRejection` | A Promise failed with no `await`/`catch` | Add `await` inside `try/catch` |
| `Test timeout of 5000ms exceeded` | Missing `await`, element never appeared, slow app | Check awaits, locators, the app |
| `RangeError: Maximum call stack size exceeded` | Infinite recursion | Check the stop condition |
| `EADDRINUSE` | Port already in use | Stop the other process or change the port |

> **Reading a stack trace:** the first line is the error; the first line that points to **your** file is where to look.

### try / catch

```js
try {
  const data = JSON.parse(text);           // code that may fail
} catch (err) {
  console.error(err.name, err.message);    // e.g. 'SyntaxError', 'Unexpected token <...'
} finally {
  // always runs: cleanup goes here
}

throw new Error(`Expected 200, got ${status}`);   // raise your own error
```

### DevTools console tricks for manual testing

```js
$0                                     // element currently selected in the Elements panel
$('<css-selector>')                    // first match (like document.querySelector)
$$('<css-selector>')                   // all matches as a real array
$$('img:not([alt])')                   // find images missing alt text (accessibility)
$$('a').map(a => a.href)               // list every link on the page
copy(<value>)                          // copy any value to the clipboard
$_                                     // result of the last expression
getEventListeners($0)                  // which events the selected element listens to
monitorEvents(window, 'click')         // log every click event
document.querySelector('[data-testid="<id>"]')   // find by test id
localStorage.getItem('<key>')          // read saved data
localStorage.clear()                   // ⚠️ wipes all saved data for this site
document.cookie                        // cookies visible to JS
```

> These shortcuts (`$`, `$$`, `copy`) only work in the DevTools console, not in your scripts.

### DevTools panels QA uses most

| Panel | What to check |
|---|---|
| **Console** | Red errors and warnings after each action |
| **Network** | Failed requests (red), status codes, request/response bodies. Enable **Preserve log**; filter **Fetch/XHR**; right-click → **Copy as fetch / cURL**; throttle to "Slow 4G" |
| **Application** | localStorage, sessionStorage, cookies; clear site data |
| **Elements** | DOM, CSS, attributes such as `data-testid` |
| **Sources** | Breakpoints, step through code |
| **Lighthouse** | Performance and accessibility audits |

### npm troubleshooting

```bash
npm ls <package>         # which version is installed (and the dependency tree)
npm explain <package>    # why a package is installed
npm outdated             # packages with newer versions
npm audit                # known security vulnerabilities
npm config get registry  # check where packages come from
```

---

## 5. Undoing Mistakes

| Problem | Fix |
|---|---|
| Script stuck / infinite loop | `Ctrl+C` in the terminal; in the browser close the tab or pause in **Sources** |
| Mutated an array/object by accident | Copy first: `[...arr]`, `{ ...obj }`, `structuredClone(obj)`; prefer `toSorted`, `toReversed`, `with` |
| `Assignment to constant variable` | Change `const` to `let` |
| Installed the wrong package | `npm uninstall <package>` |
| Need a specific version | `npm install <package>@<version>` |
| Weird errors after a pull or branch switch | ⚠️ `rm -rf node_modules && npm ci` (reinstall from lockfile) |
| `npm audit fix --force` broke things | ⚠️ `git restore package.json package-lock.json && npm ci` |
| Lockfile merge conflict | Fix `package.json`, then run `npm install` to regenerate the lockfile |
| Broke a file, not committed yet | ⚠️ `git restore <file>` (your changes are lost) |
| Undo the last commit but keep the changes | `git reset --soft HEAD~1` |
| Globally installed a CLI you don't want | `npm uninstall -g <package>`; prefer `npx` next time |
| Cleared localStorage by mistake | Can't undo. Next time back it up first: `copy(JSON.stringify(localStorage))` |
| Test left junk data in the app | Add cleanup in `afterEach`/`afterAll`; use unique data per run |
| Committed a `.env` or secret | ⚠️ **Rotate the secret immediately.** Deleting it from git history is not enough |
| Committed `test.only` | Remove it; add `forbidOnly: !!process.env.CI` (Playwright) to catch it |

---

## 6. Advanced but Useful

### Async: Promises and async/await

```js
async function getUser(id) {                                      // async functions return a Promise
  const res = await fetch(`https://api.example.com/users/${id}`); // pause until the response arrives
  if (!res.ok) throw new Error(`HTTP ${res.status}`);             // ⚠️ fetch does NOT throw on 4xx/5xx
  return res.json();                                              // parsing the body is async too
}

try {
  const user = await getUser(1);   // top-level await works in ESM files
  console.log(user.name);
} catch (err) {
  console.error('Request failed:', err.message);
}
```

Older `.then()` chain syntax, still common in tutorials:

```js
getUser(1)
  .then(user => console.log(user))   // runs on success
  .catch(err => console.error(err)); // runs on failure
```

### Combining Promises

| Method | Behaviour | Use when |
|---|---|---|
| `Promise.all([...])` | Waits for all; rejects on the **first** failure | Parallel requests that must all succeed |
| `Promise.allSettled([...])` | Waits for all; never rejects; reports each result | Run many checks and report every outcome |
| `Promise.race([...])` | First to finish (success or failure) | Timeouts |
| `Promise.any([...])` | First to **succeed** | Fallback servers |

```js
// ❌ Sequential: each request waits for the previous one
for (const id of ids) await getUser(id);

// ✅ Parallel: all requests at once
const users = await Promise.all(ids.map(id => getUser(id)));

// Report every result, even failures
const results = await Promise.allSettled(ids.map(getUser));
results.filter(r => r.status === 'rejected').map(r => r.reason.message);
```

### Polling helper (wait for a condition)

```js
async function waitFor(check, { timeout = 5000, interval = 200 } = {}) {
  const end = Date.now() + timeout;                    // deadline
  while (Date.now() < end) {
    if (await check()) return;                         // condition met: stop
    await new Promise(r => setTimeout(r, interval));   // wait a bit, then retry
  }
  throw new Error(`Condition not met within ${timeout}ms`);
}

await waitFor(async () => (await getOrder(id)).status === 'shipped');
```

> Prefer waiting for a **condition** over a fixed `sleep`. Fixed waits make tests slow *and* flaky.

### fetch for API checks

```js
const res = await fetch('<base-url>/api/users', {
  method: 'POST',                                  // GET is the default
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.API_TOKEN}`,
  },
  body: JSON.stringify({ name: 'Ana' }),           // objects must be stringified
});

res.status                       // 201
res.ok                           // true for status 200–299
res.headers.get('content-type')  // 'application/json; charset=utf-8'
const body = await res.json();   // ⚠️ the body can only be read once: store it
```

### Classes (the basis of Page Objects)

```js
class ApiClient {
  #token;                                       // private field (only usable inside the class)
  static DEFAULT_TIMEOUT = 5000;                // static: belongs to the class itself

  constructor(baseUrl, token) {                 // runs on `new ApiClient(...)`
    this.baseUrl = baseUrl;
    this.#token = token;
  }

  async get(path) {                             // method
    const res = await fetch(this.baseUrl + path, {
      headers: { Authorization: `Bearer ${this.#token}` },
    });
    return res.json();
  }
}

class AdminClient extends ApiClient {           // inheritance
  deleteUser(id) { /* ... */ }
}

const api = new ApiClient('<base-url>', '<token>');
```

### Custom errors

```js
class ApiError extends Error {
  constructor(status, message) {
    super(message);            // call the parent (Error) constructor
    this.name = 'ApiError';
    this.status = status;
  }
}
throw new ApiError(404, 'User not found');
```

### Closures

```js
const makeCounter = () => {
  let n = 0;                 // stays alive inside the returned function
  return () => ++n;
};
const next = makeCounter();
next();                      // 1
next();                      // 2
```

### Map and Set

```js
const ids = new Set([1, 2, 2, 3]);    // Set {1, 2, 3}: unique values only
[...new Set(list)]                    // remove duplicates from an array
ids.has(2)                            // true
list.length !== new Set(list).size    // true if the list has duplicates (handy check)

const cache = new Map();              // keys can be any type; keeps insertion order
cache.set('user:1', { name: 'Ana' });
cache.get('user:1');                  // { name: 'Ana' }
cache.size;                           // 1
```

### Regular expressions

```js
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;   // simple email format check
emailRe.test('qa@example.com')                  // true
'Order #1234'.match(/#(\d+)/)[1]                // '1234' (capture group 1)
'a1b2c3'.replace(/\d/g, '')                     // 'abc'
'Total: R$ 1.250,00'.match(/[\d.,]+/)[0]        // '1.250,00'
```

| Token | Meaning | Token | Meaning |
|---|---|---|---|
| `\d` | Digit | `^` / `$` | Start / end of string |
| `\w` | Letter, digit, `_` | `+` / `*` / `?` | 1+ / 0+ / 0 or 1 |
| `\s` | Whitespace | `{2,4}` | 2 to 4 times |
| `.` | Any character | `( )` | Capture group |
| `g` flag | All matches | `i` flag | Case-insensitive |

### Dates

```js
new Date()                                     // now
new Date('2026-11-20T10:00:00Z')               // ISO string (Z = UTC)
new Date().toISOString()                       // '2026-11-20T13:00:00.000Z'
Date.now()                                     // milliseconds since 1970 (timing, unique ids)
date.getMonth()                                // ⚠️ 0–11 (January is 0)
new Intl.DateTimeFormat('pt-BR').format(date)  // '20/11/2026'
new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(1250)  // 'R$ 1.250,00'
```

### Deep copy and deep compare

```js
structuredClone(obj)                            // true deep copy (nested objects too)
import { isDeepStrictEqual } from 'node:util';  // Node only
isDeepStrictEqual(a, b)                         // true if the content is identical
```

### Environment variables

```js
const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';   // Node only
```

```bash
BASE_URL=https://staging.example.com npm test   # set for one command (Linux/macOS)
node --env-file=.env <file>.js                  # load from a .env file
```

### Generating test data

```js
crypto.randomUUID()                                     // unique id (browsers and Node 19+)
`qa+${Date.now()}@example.com`                          // unique email per run
Math.floor(Math.random() * (max - min + 1)) + min       // random integer in [min, max]
Array.from({ length: 5 }, (_, i) => ({ id: i + 1, name: `User ${i + 1}` }))  // build a fixture list
'x'.repeat(256)                                         // boundary test: 256-character string
```

> For realistic fake names, addresses, and so on: `npm install -D @faker-js/faker`.

> **TypeScript:** many Playwright/Vitest examples use `.ts` files. TypeScript is JavaScript plus type annotations (`name: string`), so everything here still applies.

---

## 7. Testing Toolkit for QA

### Which tool?

| Tool | Type | Best for | Run |
|---|---|---|---|
| `node:test` | Unit / API (built into Node) | Zero-dependency scripts and quick checks | `node --test` |
| **Vitest** | Unit / integration | Modern projects; fast; Jest-compatible API | `npx vitest` |
| Jest | Unit / integration | Very common in existing (especially React) projects | `npx jest` |
| Mocha + Chai | Unit | Older projects | `npx mocha` |
| **Playwright Test** | E2E browser + API | Cross-browser UI tests with auto-waiting | `npx playwright test` |
| Cypress | E2E browser | Interactive in-browser runner | `npx cypress open` |
| WebdriverIO | E2E browser / mobile | WebDriver protocol, mobile via Appium | `npx wdio run` |
| Supertest | API | Testing Node HTTP servers directly | With Vitest/Jest |

> **Starting out?** Learn **Vitest** (unit) and **Playwright** (E2E + API). The skills transfer directly to Jest and Cypress.

### Test anatomy (Vitest / Jest)

```js
import { describe, it, expect, beforeEach } from 'vitest';   // Jest: these are globals
import { add } from '../src/math.js';

describe('add()', () => {                     // group of related tests
  beforeEach(() => {
    // reset state before each test
  });

  it('adds two positive numbers', () => {     // one test case (`test` is an alias)
    // Arrange: prepare the inputs
    const a = 2;
    const b = 3;
    // Act: run the code under test
    const result = add(a, b);
    // Assert: check the outcome
    expect(result).toBe(5);
  });
});
```

| Hook | Runs |
|---|---|
| `beforeAll(fn)` | Once before all tests in the block (start server, seed DB) |
| `beforeEach(fn)` | Before every test (fresh state, log in) |
| `afterEach(fn)` | After every test (cleanup, restore mocks) |
| `afterAll(fn)` | Once after all tests (stop server, delete data) |

| Modifier | Effect |
|---|---|
| `it.only(...)` | Run only this test ⚠️ don't commit |
| `it.skip(...)` | Skip this test |
| `it.todo('...')` | Placeholder for a test you'll write later |
| `it.each([...])(...)` | Same test with several data rows |

### Matchers (Vitest / Jest)

| Matcher | Checks |
|---|---|
| `expect(x).toBe(y)` | Strict equality (`===`): primitives |
| `.toEqual(y)` | Deep equality: objects and arrays |
| `.toStrictEqual(y)` | Deep equality including `undefined` properties and class types |
| `.toMatchObject({...})` | **Partial** object match (great for API responses) |
| `.toBeTruthy()` / `.toBeFalsy()` | Truthy / falsy |
| `.toBeNull()` / `.toBeUndefined()` / `.toBeDefined()` | Null / undefined checks |
| `.toBeGreaterThan(n)` / `.toBeLessThanOrEqual(n)` | Number comparisons |
| `.toBeCloseTo(0.3)` | Floats (avoids `0.1 + 0.2` problems) |
| `.toContain(item)` | Array item or substring |
| `.toMatch(/regex/)` | String matches a pattern |
| `.toHaveLength(n)` | Array or string length |
| `.toHaveProperty('a.b', value)` | Nested property exists (optionally equals value) |
| `expect(() => fn()).toThrow('msg')` | Throws: **wrap the call in a function** |
| `await expect(promise).resolves.toEqual(y)` | Async result |
| `await expect(promise).rejects.toThrow()` | Async failure |
| `.not.toBe(y)` | Negates any matcher |

```js
// Validate an API response shape without hard-coding every value
expect(body).toMatchObject({
  id: expect.any(Number),                     // any number
  email: expect.stringContaining('@'),        // any string containing '@'
  roles: expect.arrayContaining(['qa']),      // array that includes 'qa'
  createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}/),   // ISO date prefix
});
```

### Mocks, spies, and fake timers (Vitest; Jest: replace `vi` with `jest`)

```js
import { vi } from 'vitest';

const onSave = vi.fn();                                  // fake function that records calls
onSave('draft');
expect(onSave).toHaveBeenCalledWith('draft');            // called with these arguments?
expect(onSave).toHaveBeenCalledTimes(1);                 // called exactly once?

vi.fn().mockReturnValue(42);                             // fake return value
vi.fn().mockResolvedValue({ ok: true });                 // fake async (Promise) result
vi.spyOn(console, 'error').mockImplementation(() => {}); // watch and silence a real function
vi.mock('../src/api.js');                                // replace a whole module with fakes

vi.useFakeTimers();                                      // control time
vi.advanceTimersByTime(1000);                            // jump 1 second ahead
vi.useRealTimers();                                      // back to real time

vi.restoreAllMocks();                                    // undo spies (put in afterEach)
```

| Term | Meaning |
|---|---|
| **Mock** | Fake replacement whose calls you can check |
| **Spy** | Wraps a real function to record calls (can also fake it) |
| **Stub** | Fake that returns canned data, no call checks |

### Data-driven tests

```js
it.each([
  [1, 1, 2],
  [2, -1, 1],
  [0, 0, 0],
])('add(%i, %i) returns %i', (a, b, expected) => {    // %i = integer placeholder in the title
  expect(add(a, b)).toBe(expected);
});

it.each([
  { input: '', valid: false },
  { input: 'qa@example.com', valid: true },
  { input: 'no-at-sign.com', valid: false },
])('isValidEmail("$input") → $valid', ({ input, valid }) => {   // $name = object field
  expect(isValidEmail(input)).toBe(valid);
});
```

### Node's built-in test runner (no install)

```js
// tests/health.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('health endpoint returns 200', async () => {
  const res = await fetch('<base-url>/health');
  assert.equal(res.status, 200);                     // strict equality
  assert.deepEqual(await res.json(), { ok: true });  // deep equality
});
```

```bash
node --test                 # finds and runs files like *.test.js
node --test --watch         # re-run on changes
```

### Playwright essentials

```js
import { test, expect } from '@playwright/test';

test('user can log in', async ({ page }) => {
  await page.goto('/login');                                     // relative to baseURL in config
  await page.getByLabel('Email').fill('qa@example.com');         // find input by its label
  await page.getByLabel('Password').fill(process.env.QA_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();   // find by role + visible name
  await expect(page).toHaveURL(/dashboard/);                     // auto-retries until timeout
  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
});
```

**Locator priority** (most to least robust):

| Locator | Use for |
|---|---|
| `page.getByRole('button', { name: 'Save' })` | ✅ Best: how users and screen readers see the page |
| `page.getByLabel('Email')` | Form fields |
| `page.getByPlaceholder('Search')` | Inputs without labels |
| `page.getByText('Order placed')` | Non-interactive text |
| `page.getByTestId('<id>')` | `data-testid` attributes: stable when role/text don't fit |
| `page.locator('<css-selector>')` | ⚠️ Last resort: breaks when styling changes |

```js
page.getByRole('row').filter({ hasText: 'Ana' })   // narrow down a list
page.getByRole('listitem').nth(2)                  // third item (0-based)
page.getByRole('listitem').first()                 // first item
```

**Web-first assertions** (always `await` them; they retry automatically):

| Assertion | Checks |
|---|---|
| `toBeVisible()` / `toBeHidden()` | Displayed or not |
| `toHaveText('...')` / `toContainText('...')` | Exact / partial text |
| `toHaveValue('...')` | Input value |
| `toBeEnabled()` / `toBeDisabled()` | Interactable or not |
| `toBeChecked()` | Checkbox / radio state |
| `toHaveCount(n)` | Number of matching elements |
| `toHaveAttribute('href', '/home')` | Attribute value |
| `expect(page).toHaveURL(/regex/)` | Current URL |
| `expect(page).toHaveTitle('...')` | Page title |
| `expect(page).toHaveScreenshot()` | Visual regression against a stored baseline |

**API testing with Playwright:**

```js
test('GET /api/users/1 returns the user', async ({ request }) => {
  const res = await request.get('/api/users/1');
  await expect(res).toBeOK();                     // status 200–299
  const body = await res.json();
  expect(body).toMatchObject({ id: 1, email: expect.any(String) });
});
```

### CLI options

| Playwright command | Does |
|---|---|
| `npm init playwright@latest` | Scaffold config, example tests, browsers |
| `npx playwright test` | Run all tests (headless) |
| `npx playwright test <file>:<line>` | Run one test |
| `npx playwright test -g "<title>"` | Run tests whose title matches |
| `--headed` | Show the browser |
| `--ui` | Interactive UI mode: watch, time-travel, pick tests |
| `--debug` | Step through with the Inspector |
| `--project=chromium` | Only one browser |
| `--repeat-each=10` | Run each test 10× (hunt flaky tests) |
| `--retries=2` | Retry failures |
| `--trace on` | Record a full trace (DOM, network, console) |
| `npx playwright show-report` | Open the HTML report |
| `npx playwright show-trace <trace.zip>` | Open a trace file |
| `npx playwright codegen <url>` | Record your clicks as test code |
| `npx playwright install` | Download / update browsers |

| Vitest command (Jest equivalent) | Does |
|---|---|
| `npx vitest` (`npx jest --watch`) | Watch mode: re-runs on save |
| `npx vitest run` (`npx jest`) | Run once (CI) |
| `npx vitest run <file>` | One file |
| `npx vitest -t "<name>"` (`npx jest -t "<name>"`) | Tests whose name matches |
| `npx vitest run --coverage` (`npx jest --coverage`) | Coverage report (Vitest needs `@vitest/coverage-v8`) |
| `npx vitest --ui` | Browser UI (needs `@vitest/ui`) |

---

## 8. Workflow Recipes

### Recipe 1: Unit-test project with Vitest from zero

1. Create the project:
   ```bash
   mkdir js-qa-practice && cd js-qa-practice   # new folder
   npm init -y                                 # package.json
   npm pkg set type=module                     # enable import/export
   npm pkg set scripts.test="vitest"           # npm test → vitest
   npm install -D vitest                       # install the test runner
   mkdir src tests                             # code and tests folders
   ```
2. Write the code in `src/validate.js`:
   ```js
   export const isValidEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
   ```
3. Write the test in `tests/validate.test.js`:
   ```js
   import { it, expect } from 'vitest';
   import { isValidEmail } from '../src/validate.js';

   it('accepts a normal email', () => expect(isValidEmail('qa@example.com')).toBe(true));
   it('rejects missing @', () => expect(isValidEmail('qa.example.com')).toBe(false));
   ```
4. Run `npm test`. It stays in watch mode; edit and save to re-run.

### Recipe 2: Zero-dependency API smoke test

1. Create `smoke.test.js`:
   ```js
   import { test } from 'node:test';
   import assert from 'node:assert/strict';

   const BASE = process.env.BASE_URL ?? 'https://jsonplaceholder.typicode.com';

   test('GET /users returns a non-empty list', async () => {
     const res = await fetch(`${BASE}/users`);
     assert.equal(res.status, 200);
     const users = await res.json();
     assert.ok(Array.isArray(users) && users.length > 0);
   });

   test('POST /posts creates a resource', async () => {
     const res = await fetch(`${BASE}/posts`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ title: 'qa', userId: 1 }),
     });
     assert.equal(res.status, 201);
   });
   ```
2. Run `node --test` (or `BASE_URL=<url> node --test` for another environment).

### Recipe 3: First E2E test with Playwright

1. Scaffold: `npm init playwright@latest` (choose JavaScript or TypeScript, `tests` folder, install browsers).
2. Record a draft: `npx playwright codegen <url>`. Click through the flow, then copy the generated code.
3. Clean it up: replace CSS locators with `getByRole`/`getByLabel`, and add `await expect(...)` assertions for the outcome.
4. Run it interactively: `npx playwright test --ui`.
5. Run all browsers headless: `npx playwright test`.
6. Check failures: `npx playwright show-report` (screenshots, traces).

### Recipe 4: Page Object Model

1. Put locators and actions in a class, `pages/LoginPage.js`:
   ```js
   export class LoginPage {
     constructor(page) {
       this.page = page;
       this.email = page.getByLabel('Email');
       this.password = page.getByLabel('Password');
       this.submit = page.getByRole('button', { name: 'Sign in' });
       this.error = page.getByRole('alert');
     }
     async goto() {
       await this.page.goto('/login');
     }
     async login(email, password) {
       await this.email.fill(email);
       await this.password.fill(password);
       await this.submit.click();
     }
   }
   ```
2. Keep the test readable, `tests/login.spec.js`:
   ```js
   import { test, expect } from '@playwright/test';
   import { LoginPage } from '../pages/LoginPage.js';

   test('shows an error for a wrong password', async ({ page }) => {
     const login = new LoginPage(page);
     await login.goto();
     await login.login('qa@example.com', 'wrong');
     await expect(login.error).toContainText('Invalid');
   });
   ```

> Page objects hold **locators and actions**; tests hold **assertions**. When the UI changes, you fix one file.

### Recipe 5: Debug a failing or flaky test

1. Run only that test: `npx playwright test <file>:<line>` (or `npx vitest run <file> -t "<name>"`).
2. Watch it: add `--headed`, or step through with `--debug`.
3. Record what happened: `--trace on`, then `npx playwright show-report` → open the trace.
4. Reproduce the flakiness: `--repeat-each=20`, plus `--workers=1` to rule out parallel interference.
5. Check the usual suspects:
   - a missing `await`
   - fixed `waitForTimeout` instead of a web-first assertion
   - data shared between tests
   - a locator matching more than one element
   - test order dependence
6. Fix the cause. Don't just add retries.

### Recipe 6: Investigate a bug in the browser (manual QA)

1. Open DevTools (`F12`). In **Network**, enable **Preserve log**; in **Console**, clear old messages (`Ctrl+L`).
2. Reproduce the bug.
3. In **Console**, note any red errors (message plus file:line).
4. In **Network**, filter **Fetch/XHR** and click the red or failed request. Check **Status**, **Payload**, and **Response**.
5. Right-click the request → **Copy as fetch**, paste it into the Console, edit the body, and re-send to isolate the cause.
6. For the bug report, attach: steps, expected vs actual, a screenshot, console errors, failing request details, and a HAR file (Network → ⬇ Export HAR).

> ⚠️ HAR files and copied requests can contain **tokens and cookies**. Remove them before sharing outside your team.

---

## 9. Shortcuts and Config Snippets

### npm scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:cov": "vitest run --coverage",
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui",
    "e2e:report": "playwright show-report",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

Run with `npm run <script>`; `npm test` and `npm t` are built-in shortcuts. Extra flags go after `--`: `npm run e2e -- --headed`.

### Shell aliases

```bash
# Add to ~/.bashrc or ~/.zshrc, then run: source ~/.bashrc
alias nr='npm run'                            # nr e2e
alias nt='npm test'
alias pw='npx playwright test'                # pw --headed
alias pwui='npx playwright test --ui'
alias pwr='npx playwright show-report'
alias reinstall='rm -rf node_modules && npm ci'   # ⚠️ wipes and reinstalls dependencies
```

### playwright.config.js

```js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  forbidOnly: !!process.env.CI,             // fail CI if a test.only slipped in
  retries: process.env.CI ? 2 : 0,          // retry only on CI
  reporter: [['html'], ['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',                // record a trace when a test is retried
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'mobile',   use: { ...devices['Pixel 7'] } },
  ],
});
```

### vitest.config.js

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],          // where tests live
    restoreMocks: true,                       // auto-restore spies between tests
    coverage: { reporter: ['text', 'html'] }, // terminal + HTML coverage report
  },
});
```

### .gitignore and .prettierrc

```gitignore
node_modules/
.env
coverage/
test-results/
playwright-report/
```

```json
{ "singleQuote": true, "semi": true, "printWidth": 100 }
```

> **Linting for testers:** `npm init @eslint/config@latest`, then add `eslint-plugin-playwright`. Its rules catch a missing `await` on Playwright calls and leftover `test.only`.

### Keyboard shortcuts (macOS: `Cmd` instead of `Ctrl`)

| VS Code | Action | DevTools | Action |
|---|---|---|---|
| `` Ctrl+` `` | Toggle terminal | `F12` / `Ctrl+Shift+I` | Open DevTools |
| `Ctrl+Shift+P` | Command palette | `Ctrl+Shift+J` | Open straight to Console |
| `Ctrl+P` | Open file by name | `Ctrl+Shift+C` | Pick an element on the page |
| `F5` | Start debugging | `Ctrl+Shift+P` | DevTools command menu |
| `F9` | Toggle breakpoint | `Ctrl+P` | Open a source file |
| `F10` / `F11` | Step over / into | `Ctrl+Shift+M` | Device (mobile) toolbar |
| `F12` | Go to definition | `Ctrl+Shift+R` | Hard reload (skip cache) |
| `F2` | Rename symbol | `Ctrl+L` | Clear console |
| `Shift+Alt+F` | Format file | `↑` in Console | Previous command |
| `Ctrl+D` | Select next match | `Ctrl+F` in Elements | Search DOM by text/selector/XPath |

### Node REPL commands

| Command | Does |
|---|---|
| `.help` | List commands |
| `.editor` | Multi-line mode (`Ctrl+D` to run) |
| `.load <file>.js` | Run a file inside the REPL |
| `_` | Last result |
| `Tab` | Autocomplete |
| `.exit` or `Ctrl+D` | Quit |

---

## 10. Common Pitfalls

| Pitfall | Example | Avoid by |
|---|---|---|
| Loose equality | `'' == 0` → `true` | Always `===` / `!==` |
| Forgetting `await` | Test finishes before the assertion runs, so it **falsely passes** | `await` every async call; use `eslint-plugin-playwright` |
| `async` inside `forEach` | `items.forEach(async i => await save(i))` doesn't wait | `for...of` with `await`, or `Promise.all(items.map(...))` |
| `toBe` on objects | `expect({ a: 1 }).toBe({ a: 1 })` fails | `toEqual` / `toMatchObject` |
| `toThrow` without a wrapper | `expect(fn()).toThrow()` crashes the test | `expect(() => fn()).toThrow()` |
| Floating-point math | `0.1 + 0.2 === 0.3` → `false` | `toBeCloseTo`, or work in cents (integers) |
| Default sort is alphabetical and mutates | `[10, 2, 1].sort()` → `[1, 10, 2]` | `arr.toSorted((a, b) => a - b)` |
| `\|\|` replaces valid zeros | `qty \|\| 1` turns `0` into `1` | `qty ?? 1` |
| `typeof null` | `typeof null === 'object'` | Check `x === null` |
| `NaN` never equals itself | `NaN === NaN` → `false` | `Number.isNaN(x)` |
| 0-based months | `new Date(2026, 1, 1)` is **February** 1 | Use ISO strings: `'2026-01-01'` |
| Timezone shift | `new Date('2026-11-20')` is UTC midnight, so it shows **Nov 19** in Brazil (UTC−3) | Include time and zone: `'2026-11-20T00:00:00-03:00'` |
| Shallow copies | `{ ...obj }` still shares nested objects | `structuredClone(obj)` |
| `fetch` doesn't fail on errors | A 500 response still resolves | Check `res.ok` / `res.status` |
| Reading a body twice | Second `res.json()` throws | Store the result in a variable |
| Losing `this` in callbacks | `setTimeout(this.save, 0)` → `this` is undefined | Arrow function: `() => this.save()` |
| Missing `.js` in ESM imports | `import x from './utils'` fails in Node | `import x from './utils.js'` |
| Fixed waits | `await page.waitForTimeout(3000)` → slow and flaky | Web-first assertions: `await expect(el).toBeVisible()` |
| Tests depending on each other | Test B needs data created by test A | Each test creates (and cleans up) its own data |
| Brittle selectors | `div > div:nth-child(3) > span` | `getByRole`, `getByLabel`, `getByTestId` |
| Committed `.only` | CI runs one test and reports green | `forbidOnly` in config + lint rule |
| Hard-coded secrets | Passwords in test files | `process.env.<NAME>` + `.env` in `.gitignore` |

---

## 11. Glossary

| Term | Meaning |
|---|---|
| **Arrow function** | Short function syntax `(a) => a * 2`; doesn't have its own `this` |
| **Assertion** | A check that fails the test if the condition is false (`expect(x).toBe(y)`) |
| **async / await** | Syntax for writing Promise-based code that reads top to bottom |
| **Callback** | A function passed to another function to be called later |
| **Closure** | A function that remembers variables from where it was created |
| **CommonJS (CJS)** | Older Node module system: `require` / `module.exports` |
| **Coverage** | Percentage of code executed by tests (lines, branches, functions) |
| **devDependency** | Package needed only for development/testing (`npm install -D`) |
| **Destructuring** | Unpacking values: `const { a } = obj`, `const [x] = arr` |
| **DOM** | Document Object Model: the browser's tree of page elements |
| **E2E test** | End-to-end test that drives the real UI like a user |
| **ESM** | ES Modules, the modern standard: `import` / `export` |
| **Event loop** | Mechanism that runs async callbacks when the call stack is empty |
| **Fixture** | Prepared test data or setup; in Playwright, injected objects such as `page` and `request` |
| **Flaky test** | Test that passes and fails without code changes (timing, shared data) |
| **Headless** | Browser running without a visible window (faster; default in CI) |
| **Hoisting** | JS moving declarations to the top of their scope before running |
| **Integration test** | Tests several units working together (for example, API + database) |
| **JSON** | Text format for data: `{"key": "value"}` |
| **Lockfile** | `package-lock.json`: records exact dependency versions |
| **Locator** | Playwright object that finds element(s) lazily and retries |
| **Mock / Spy / Stub** | Fakes used to isolate code and check calls (see [section 7](#7-testing-toolkit-for-qa)) |
| **Node.js** | Runtime that runs JavaScript outside the browser |
| **npm / npx** | Package manager / runs package CLIs without a global install |
| **Page Object Model (POM)** | Pattern that wraps a page's locators and actions in a class |
| **Promise** | Object representing a future result: pending → fulfilled or rejected |
| **REPL** | Read-Eval-Print Loop: interactive prompt (`node`, DevTools console) |
| **Runtime** | Environment that executes JS (browser, Node, Deno, Bun) |
| **Scope** | Where a variable is accessible (block `{}`, function, module) |
| **Selector** | String that identifies elements (CSS `.btn`, XPath, `data-testid`) |
| **Semantic versioning** | `MAJOR.MINOR.PATCH`; `^1.2.3` allows minor and patch updates |
| **Spread / Rest** | `...` expands (spread) or collects (rest) items |
| **Test runner** | Tool that finds, runs, and reports tests (Vitest, Jest, Playwright) |
| **Trace** | Playwright recording of a test run: DOM snapshots, network, console |
| **Truthy / Falsy** | Values treated as `true` / `false` in conditions |
| **TypeScript** | JavaScript plus static types; compiles to JS |
| **Unit test** | Tests one small piece (function or class) in isolation |
| **V8** | Google's JS engine, used by Chrome and Node |
| **Web-first assertion** | Playwright assertion that auto-retries until it passes or times out |
