# Cypress Cheat Sheet for QA Testers

A quick reference for Cypress 16 (current as of Nov 2026): setup, writing and debugging tests, network and API testing, and QA workflows.

## Table of Contents

1. [Installation and Setup](#1-installation-and-setup)
2. [Core Concepts](#2-core-concepts)
3. [Everyday Commands](#3-everyday-commands)
4. [Assertions](#4-assertions)
5. [Network and API Testing](#5-network-and-api-testing)
6. [Debugging and Troubleshooting](#6-debugging-and-troubleshooting)
7. [Recovering from Mistakes](#7-recovering-from-mistakes)
8. [Advanced Features](#8-advanced-features)
9. [Real-World Recipes](#9-real-world-recipes)
10. [Shortcuts and Config Snippets](#10-shortcuts-and-config-snippets)
11. [Common Pitfalls](#11-common-pitfalls)
12. [Glossary](#12-glossary)

---

## 1. Installation and Setup

### Install

```bash
node -v                                    # check Node.js is installed (use a current LTS)
mkdir <project-name> && cd <project-name>  # create a project folder
npm init -y                                # create package.json
npm install cypress --save-dev             # install Cypress as a dev dependency
npx cypress open                           # first launch: wizard creates config + folders
```

> Testing an existing app? Run `npm install cypress --save-dev` inside that app's repo instead of a new folder.

### Project structure (after the wizard)

```text
<project-name>/
├── cypress.config.js        # main config file
└── cypress/
    ├── e2e/                 # your test files: *.cy.js / *.cy.ts
    ├── fixtures/            # static test data (JSON, files to upload)
    ├── support/
    │   ├── e2e.js           # runs before every spec (global hooks, imports)
    │   └── commands.js      # custom commands live here
    ├── downloads/           # files downloaded during tests
    ├── screenshots/         # auto-saved on failure (run mode)
    └── videos/              # only if video: true
```

### Config file (modern)

```js
// cypress.config.js
const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',             // cy.visit('/') resolves against this
    specPattern: 'cypress/e2e/**/*.cy.{js,ts}',   // where test files are found
    setupNodeEvents(on, config) {                 // Node-side code: tasks, plugins
      return config                               // always return config
    },
  },
  viewportWidth: 1280,                            // default browser width
  viewportHeight: 720,                            // default browser height
  defaultCommandTimeout: 6000,                    // how long queries retry (ms)
  retries: { runMode: 2, openMode: 0 },           // auto-retry failed tests in CI only
  video: false,                                   // record videos (off by default)
  screenshotOnRunFailure: true,                   // screenshot when a test fails
  env: { adminPassword: '<secret>' },             // secrets, read with cy.env()
  expose: { apiVersion: 'v2' },                   // public values, read with Cypress.expose()
})
```

TypeScript version: name it `cypress.config.ts` and use `import { defineConfig } from 'cypress'` + `export default defineConfig({ ... })`.

> Old tutorials use `cypress.json`, `cypress/integration/` and `cypress/plugins/index.js`. Those are pre-v10. Use the layout above.

### Key config options

| Option | Default | What it does |
|---|---|---|
| `baseUrl` | none | Prefix for `cy.visit()` and `cy.request()` relative URLs |
| `defaultCommandTimeout` | `4000` | Max ms a query (e.g. `cy.get`) retries |
| `pageLoadTimeout` | `60000` | Max ms for `cy.visit()` page load |
| `requestTimeout` / `responseTimeout` | `5000` / `30000` | Waiting on requests / responses |
| `viewportWidth` / `viewportHeight` | `1000` / `660` | Browser size |
| `retries` | `0` | Re-run failed tests: number, or `{ runMode, openMode }` |
| `testIsolation` | `true` | Clears page, cookies, storage between tests |
| `video` | `false` | Record a video per spec in run mode |
| `screenshotOnRunFailure` | `true` | Auto screenshot on failure |
| `downloadsFolder` | `cypress/downloads` | Where downloads land |
| `visibilityStrategy` | modern | Set `'legacy'` if visibility checks changed after upgrading to v16 |
| `forceHttp1` | `false` | Opt out of HTTP/2 in Chromium browsers (new in v16) |

### Running Cypress (CLI)

| Command / flag | What it does |
|---|---|
| `npx cypress open` | Interactive mode (pick browser + spec, watch tests run) |
| `npx cypress run` | Headless mode, all specs, for CI |
| `--browser <chrome\|firefox\|edge>` | Choose browser (Electron still works but is deprecated in v16) |
| `--headed` | Show the browser during `run` |
| `--spec "<path-or-glob>"` | Run only matching specs |
| `--e2e` / `--component` | Choose testing type |
| `--config <key>=<value>` | Override config, e.g. `--config baseUrl=https://staging.example.com` |
| `--config-file <path>` | Use a different config file |
| `--env <KEY>=<value>` | Set a value for `cy.env()` |
| `--expose <KEY>=<value>` | Set a value for `Cypress.expose()` |
| `--reporter <name>` | e.g. `junit` for CI test reports |
| `--record --key <record-key>` | Send results to Cypress Cloud |
| `--parallel` | Split specs across CI machines (needs Cloud + `--record`) |
| `--quiet` | Less terminal output |

---

## 2. Core Concepts

### How the pieces connect

```text
 +------------------------- Node.js process ---------------------------+
 |  cypress.config.js   setupNodeEvents()  <---- cy.task()  (DB, files) |
 |  env secrets         <-------------------- cy.env()                  |
 +---------------------------------+-----------------------------------+
                                   |  network proxy  <---- cy.intercept()
 +---------------------------------v------------ Browser --------------+
 |  Spec iframe: your test code                                         |
 |     cy.get() -> queued command -> retried until it passes or times out|
 |  App iframe:  the app under test (same browser, same DOM access)     |
 +----------------------------------------------------------------------+
```

### Key ideas

| Concept | In one line |
|---|---|
| Command queue | `cy.*` calls don't run immediately; they are queued and run in order later |
| Not promises | You can't `await` Cypress commands or store their return values; use `.then()` |
| Subject | Each command passes its result (the "subject") to the next in the chain |
| Queries | `get`, `find`, `contains`, `its`... **retry** until assertions pass or timeout |
| Actions | `click`, `type`, `check`... run **once** (after waiting for the element to be actionable) |
| Assertions | `should`, `and` retry the query before them |
| Test isolation | Each `it()` starts on a blank page with clean cookies and storage |

### Test file structure (Mocha)

```js
// cypress/e2e/login.cy.js
describe('Login page', () => {                  // group of related tests (suite)
  beforeEach(() => {                            // runs before EACH test
    cy.visit('/login')                          // fresh start for every test
  })

  it('shows an error for a wrong password', () => {   // one test case
    cy.get('[data-cy=email]').type('user@test.com')
    cy.get('[data-cy=password]').type('wrong')
    cy.get('[data-cy=submit]').click()
    cy.contains('Invalid credentials').should('be.visible')
  })

  it.skip('not ready yet', () => {})            // skipped test (shows as pending)
  // it.only(...)                               // run ONLY this test (remove before commit!)
})
```

Hooks: `before`, `beforeEach`, `afterEach`, `after`. `context()` is an alias of `describe()`.

### Which test type should I write?

| I want to check... | Test type | Cypress tool |
|---|---|---|
| A full user journey in a real browser | E2E | `cy.visit` + UI commands |
| An API endpoint's status, body, errors | API | `cy.request` |
| One UI component in isolation | Component | `cy.mount` (component testing) |
| How the UI handles server errors / slow responses | E2E with stubs | `cy.intercept` |

> Rule of thumb: many API and component tests, fewer E2E tests covering the critical paths (login, checkout, signup).

---

## 3. Everyday Commands

### Selecting elements (best to worst)

| Selector | Example | Verdict |
|---|---|---|
| Dedicated test attribute | `cy.get('[data-cy=submit]')` | ✅ Best: doesn't break when styles or text change |
| Text the user sees | `cy.contains('button', 'Save')` | ✅ Good: tests what the user sees |
| `id` / `name` | `cy.get('#email')`, `cy.get('[name=email]')` | 🟡 OK if stable |
| CSS class | `cy.get('.btn-primary')` | ⚠️ Fragile: changes with styling |
| Tag / position | `cy.get('div > span:nth-child(3)')` | ❌ Breaks on any layout change |

> Ask the developers to add `data-cy` attributes. It's the single biggest win for stable tests.

### Finding

```js
cy.get('[data-cy=todo-item]')                    // all matching elements on the page
cy.get('[data-cy=todo-list]').find('li')         // search inside a previous subject
cy.contains('Sign in')                           // element containing this text
cy.contains('[data-cy=nav] a', 'Settings')       // selector + text together
cy.get('li').first()                             // first match
cy.get('li').last()                              // last match
cy.get('li').eq(2)                               // third match (0-based)
cy.get('li').filter('.done')                     // keep only matches of a selector
cy.get('[data-cy=card]').within(() => {          // scope all commands inside this element
  cy.get('h2').should('have.text', 'Plan A')
})
```

### Interacting

```js
cy.visit('/products')                            // open a page (relative to baseUrl)
cy.get('[data-cy=search]').type('laptop{enter}') // type text, {enter} presses Enter
cy.get('[data-cy=search]').clear()               // empty an input
cy.get('[data-cy=submit]').click()               // click
cy.get('[data-cy=row]').dblclick()               // double-click
cy.get('[data-cy=menu]').rightclick()            // right-click
cy.get('[data-cy=terms]').check()                // tick a checkbox / radio
cy.get('[data-cy=terms]').uncheck()              // untick a checkbox
cy.get('[data-cy=country]').select('Brazil')     // pick a <select> option by text or value
cy.get('[data-cy=footer]').scrollIntoView()      // scroll to an element
cy.scrollTo('bottom')                            // scroll the page
cy.get('[data-cy=avatar]').trigger('mouseover')  // fire any DOM event (hover menus)
cy.press(Cypress.Keyboard.Keys.TAB)              // press a real key (Tab, Escape...)
cy.go('back')                                    // browser back
cy.reload()                                      // reload the page
cy.viewport('iphone-x')                          // change screen size (preset or w, h)
```

Special keys inside `.type()`: `{enter}` `{esc}` `{backspace}` `{selectall}` `{moveToEnd}` `{ctrl+a}`.

### Reading page state

```js
cy.url().should('include', '/dashboard')         // current URL
cy.location('pathname').should('eq', '/cart')    // part of the URL
cy.title().should('contain', 'Checkout')         // <title> text
cy.get('[data-cy=total]').invoke('text')         // call a jQuery method on the subject
cy.window().its('localStorage.token')            // read app's window properties
cy.getCookie('session_id').should('exist')       // read a cookie
```

### "I want to... → use this"

| I want to... | Use |
|---|---|
| Open a page | `cy.visit('<path>')` |
| Find by test attribute | `cy.get('[data-cy=<name>]')` |
| Find by visible text | `cy.contains('<text>')` |
| Search inside an element | `.find('<selector>')` or `.within(() => {...})` |
| Fill a form field | `.clear().type('<text>')` |
| Choose a dropdown option | `.select('<option>')` |
| Upload a file | `.selectFile('cypress/fixtures/<file>')` |
| Press Tab / Escape for real | `cy.press(Cypress.Keyboard.Keys.TAB)` |
| Use a value from the page later | `.then(($el) => { ... })` or `.as('<alias>')` |
| Load test data | `cy.fixture('<file>.json')` |
| Call an API directly | `cy.request(...)` |
| Fake a server response | `cy.intercept(..., { fixture: ... })` |
| Wait for a request to finish | `cy.intercept(...).as('x')` then `cy.wait('@x')` |
| Run Node code (DB, files) | `cy.task('<name>', <arg>)` |

---

## 4. Assertions

```js
cy.get('[data-cy=alert]').should('be.visible')                   // implicit assertion (retries)
cy.get('[data-cy=alert]').should('have.text', 'Saved!')          // exact text
cy.get('[data-cy=alert]').should('contain', 'Saved')             // partial text
cy.get('li').should('have.length', 3)                            // number of elements
cy.get('[data-cy=email]').should('have.value', 'a@b.com')        // input value
cy.get('[data-cy=submit]').should('be.disabled')                 // state
cy.get('[data-cy=link]').should('have.attr', 'href', '/help')    // attribute
cy.get('[data-cy=box]').should('have.class', 'active')           // CSS class
cy.get('[data-cy=box]').should('have.css', 'color', 'rgb(255, 0, 0)') // computed style
cy.get('[data-cy=spinner]').should('not.exist')                  // gone from the DOM
cy.get('[data-cy=title]')
  .should('be.visible')                                          // chain several checks...
  .and('contain', 'Welcome')                                     // ...with .and()
```

### Common chainers

| Check | Assertion |
|---|---|
| Visible / hidden | `be.visible` / `not.be.visible` |
| In DOM / not in DOM | `exist` / `not.exist` |
| Exact text / contains text | `have.text` / `contain` |
| Input value | `have.value` |
| Count | `have.length`, `have.length.greaterThan` |
| Enabled / disabled | `be.enabled` / `be.disabled` |
| Checked | `be.checked` |
| Focused | `have.focus` |
| Attribute | `have.attr`, `<name>`, `<value>` |
| Equal (values) | `eq` (strict), `deep.equal` (objects/arrays) |
| Matches regex | `match`, `/<regex>/` |

### Complex checks with a callback

```js
cy.get('[data-cy=price]').should(($prices) => {                  // whole callback retries
  const values = [...$prices].map((el) => Number(el.innerText.replace('$', '')))
  expect(values).to.deep.equal([...values].sort((a, b) => a - b)) // list is sorted ascending
})
```

> ⚠️ Don't put `cy.*` commands inside a `.should()` callback. Only plain code + `expect()`.

`.should()` = retries until it passes. `expect()` / `assert()` = checks once (use inside `.then()` when the value won't change).

---

## 5. Network and API Testing

### Wait for real requests (no fixed waits)

```js
cy.intercept('GET', '/api/products*').as('getProducts')  // spy: watch, don't change
cy.visit('/products')                                    // intercept BEFORE the action
cy.wait('@getProducts')                                  // wait until it happens
  .its('response.statusCode')                            // dig into the result
  .should('eq', 200)                                     // assert on it
```

### Stub responses (test edge cases on demand)

```js
cy.intercept('GET', '/api/products', { fixture: 'products.json' }) // fake data from fixtures/
cy.intercept('GET', '/api/products', { body: [] })                  // empty state
cy.intercept('GET', '/api/products', { statusCode: 500 })           // server error
cy.intercept('GET', '/api/products', { forceNetworkError: true })   // offline / network failure
cy.intercept('GET', '/api/products', { delay: 3000, body: [] })     // slow response (spinner check)
cy.intercept('POST', '/api/orders', (req) => {                      // inspect / modify a request
  expect(req.body).to.have.property('quantity', 2)                  // assert what the UI sent
  req.reply({ statusCode: 201, body: { id: 123 } })                 // then fake the reply
}).as('createOrder')
```

> Stubbing is a QA superpower: you can test error messages, empty lists and timeouts without asking a dev to break the server.

### API tests with `cy.request`

```js
it('creates a user', () => {
  cy.request('POST', '/api/users', { name: 'Ana', email: 'ana@test.com' }) // send a request
    .then((res) => {
      expect(res.status).to.eq(201)                                       // status code
      expect(res.body).to.have.all.keys('id', 'name', 'email')            // response shape
      expect(res.body.name).to.eq('Ana')                                  // field value
      expect(res.duration).to.be.lessThan(1000)                           // rough perf check
    })
})

it('rejects a missing email', () => {
  cy.request({
    method: 'POST',
    url: '/api/users',
    body: { name: 'Ana' },
    failOnStatusCode: false,                                              // don't fail on 4xx/5xx
  }).its('status').should('eq', 400)                                      // negative test
})
```

| Spy vs stub | Request reaches server? | Use for |
|---|---|---|
| `cy.intercept(url).as('x')` | Yes | Waiting for requests, asserting what was sent/received |
| `cy.intercept(url, { ... })` | No | Fake data, errors, delays, edge cases |
| `cy.request(...)` | Yes (from Node, not the UI) | API tests, test setup (create data, log in) |

> Old tutorials use `cy.server()` and `cy.route()`. Those were removed; use `cy.intercept()`.

---

## 6. Debugging and Troubleshooting

### Tools

| Tool | How | What you get |
|---|---|---|
| Command Log time travel | Hover/click a command in `cypress open` | DOM snapshot before/after that step |
| DevTools console | Click a command, open DevTools (F12) | The exact subject/element printed |
| `cy.pause()` | Add to the test | Stops; step through with the ▶ / ⏭ buttons |
| `.debug()` | `cy.get('x').debug()` | Pauses with the subject available in DevTools |
| `debugger` | Inside `.then(() => { debugger })` | Real JS breakpoint (DevTools open) |
| `cy.log('<msg>')` | Anywhere in the chain | Message in the Command Log |
| Selector Playground | 🎯 icon in the runner | Click an element, get a suggested selector |
| Screenshots | `cy.screenshot('<name>')` / auto on failure | PNG in `cypress/screenshots/` |
| Video | `video: true` in config | MP4 per spec in run mode |

```js
cy.get('[data-cy=cart]').then(($cart) => {   // get a real jQuery element
  debugger                                   // breakpoint (needs DevTools open)
  console.log($cart.text())                  // print to the browser console
})
```

### CLI diagnostics

```bash
npx cypress version                          # Cypress package + binary versions
npx cypress info                             # browsers found, system info
npx cypress verify                           # check the binary can start
npx cypress cache path                       # where the binary is stored
DEBUG=cypress:* npx cypress run              # very verbose internal logs (Linux/macOS)
npx cypress run --spec "cypress/e2e/<file>.cy.js" --headed --browser chrome   # reproduce one spec visibly
```

### Error → fix

| Error message (short) | Likely cause | Fix |
|---|---|---|
| `Timed out retrying... Expected to find element` | Wrong selector, element not rendered yet, inside iframe/shadow DOM | Check selector in Selector Playground; wait on the request with `cy.wait('@alias')`; `includeShadowDom: true` |
| `element is detached from the DOM` | App re-rendered after you found it | Re-query with `cy.get` instead of reusing an old element |
| `element is being covered by another element` | Modal, cookie banner, toast on top | Close it first; last resort `{ force: true }` |
| `cross origin error` / visiting a second domain | Test moves to another domain (e.g. SSO login) | Wrap steps on the other domain in `cy.origin()` |
| `uncaught exception` from your application | App threw a JS error | Report it as a bug! Ignore only known ones (see section 8) |
| `cy.visit() failed... ECONNREFUSED` | App not running / wrong `baseUrl` | Start the app first; check `baseUrl` |
| `Cypress.env is not a function` | Upgraded to v16 | Use `cy.env()` or `Cypress.expose()` |
| `cy.exec is not a function` | Removed in v16 | Use `cy.task()` |
| `Cypress failed to start` / verify failed | Broken binary install | `npx cypress install` (see section 7) |
| Passes locally, fails in CI | Viewport, timing, data, env differences | Check CI screenshots; match viewport; wait on requests; seed data |

---

## 7. Recovering from Mistakes

| Situation | Do this |
|---|---|
| Left `it.only` / `describe.only` in code | Remove it; add `eslint-plugin-mocha` rule `no-exclusive-tests` to catch it |
| Tests depend on each other's order | Make each test set up its own state in `beforeEach`; keep `testIsolation: true` |
| Test data left in the database | Reset/seed before tests with `cy.task('db:seed')` or an API call, not after |
| Committed screenshots/videos to git | Add folders to `.gitignore`, then `git rm -r --cached cypress/screenshots cypress/videos` |
| Secret visible in Command Log or video | ⚠️ Rotate the secret; use `cy.env()` and `.type(value, { log: false })` |
| `{ force: true }` everywhere | Remove it: forced clicks pass even when a real user couldn't click |
| Flaky test blocking the pipeline | Quarantine with `it.skip` + a ticket (or a `@flaky` tag); never delete silently |
| Upgrade broke the suite | Pin the old version `npm install cypress@<previous-version> -D`, then follow the migration guide |
| Cypress binary corrupted / won't open | ⚠️ `npx cypress cache clear` then `npx cypress install` (re-downloads ~hundreds of MB) |
| Old tutorial code doesn't run | Check section 10 "Old → new syntax" table |

---

## 8. Advanced Features

### Custom commands

```js
// cypress/support/commands.js
Cypress.Commands.add('getByCy', (value) => {      // reusable selector helper
  return cy.get(`[data-cy=${value}]`)
})

Cypress.Commands.add('fillLogin', (email, password) => {
  cy.getByCy('email').clear().type(email)
  cy.getByCy('password').clear().type(password, { log: false }) // hide password in log
})

// usage in a test
cy.getByCy('submit').click()
```

TypeScript types for custom commands:

```ts
// cypress/support/index.d.ts
declare global {
  namespace Cypress {
    interface Chainable {
      getByCy(value: string): Chainable<JQuery<HTMLElement>>  // adds autocomplete
    }
  }
}
export {}
```

### Log in once, reuse everywhere: `cy.session`

```js
Cypress.Commands.add('login', (email) => {
  cy.session(email, () => {                       // cached by this id
    cy.env(['userPassword']).then(({ userPassword }) => {
      cy.visit('/login')
      cy.getByCy('email').type(email)
      cy.getByCy('password').type(userPassword, { log: false })
      cy.getByCy('submit').click()
      cy.url().should('include', '/dashboard')    // confirm login worked
    })
  }, {
    validate() {                                  // re-login if this fails
      cy.getCookie('session_id').should('exist')
    },
    cacheAcrossSpecs: true,                       // reuse in every spec file
  })
})

beforeEach(() => {
  cy.login('qa@test.com')                         // fast after the first time
  cy.visit('/dashboard')                          // session restores cookies, not the page
})
```

### Environment values and secrets (v16)

```js
// cypress.config.js
env: { userPassword: '<secret>' },               // sensitive: stays in Node until asked for
expose: { apiVersion: 'v2' },                    // public: readable in the browser

// in tests
cy.env(['userPassword']).then(({ userPassword }) => { /* use it */ })  // async, for secrets
const version = Cypress.expose('apiVersion')                            // sync, for public values
```

```bash
CYPRESS_userPassword=<secret> npx cypress run    # env var with CYPRESS_ prefix → cy.env()
npx cypress run --env userPassword=<secret>      # CLI flag → cy.env()
npx cypress run --expose apiVersion=v3           # CLI flag → Cypress.expose()
```

> `Cypress.env('<key>')` is everywhere in older tutorials and plugins, but it was **removed in v16**. Translate it to `cy.env()` (secrets) or `Cypress.expose()` (public values).

⚠️ Never commit real secrets in `cypress.config.js`. Use `CYPRESS_*` env vars or CI secrets.

### Run Node code: `cy.task`

```js
// cypress.config.js → inside setupNodeEvents(on, config)
on('task', {
  'db:seed'() {                                   // name of the task
    return seedDatabase()                         // your Node code; must return a value or null
  },
  log(message) {
    console.log(message)                          // prints in the terminal, not the browser
    return null
  },
})

// in a test
cy.task('db:seed')                                // run it from the browser side
```

> `cy.exec()` (shell commands) was removed in v16. Old tutorials use it for DB resets; use `cy.task()` instead.

⚠️ Make sure seeding/reset tasks can only point at a **test** database.

### Other domains: `cy.origin`

```js
cy.visit('/')                                     // your app
cy.getByCy('login-with-sso').click()              // redirects to another domain
cy.origin('https://sso.example.com', () => {      // commands for that domain go inside
  cy.get('#username').type('qa-user')
  cy.get('#submit').click()
})
cy.url().should('include', '/dashboard')          // back on your app
```

### Data-driven tests

```js
// cypress/fixtures/invalid-emails.json → ["abc", "a@", "@b.com"]
describe('Email validation', () => {
  const emails = require('../fixtures/invalid-emails.json') // load at definition time

  emails.forEach((email) => {                     // one test per value
    it(`rejects "${email}"`, () => {
      cy.visit('/signup')
      cy.getByCy('email').type(email)
      cy.getByCy('submit').click()
      cy.getByCy('email-error').should('be.visible')
    })
  })
})
```

### Responsive checks

```js
const sizes = ['iphone-x', 'ipad-2', [1440, 900]]  // presets or [width, height]

sizes.forEach((size) => {
  it(`shows the menu on ${size}`, () => {
    Array.isArray(size) ? cy.viewport(...size) : cy.viewport(size)
    cy.visit('/')
    cy.getByCy('menu').should('be.visible')
  })
})
```

### Files, time, and errors

```js
cy.get('input[type=file]').selectFile('cypress/fixtures/report.pdf')         // upload
cy.getByCy('dropzone').selectFile('cypress/fixtures/a.png', { action: 'drag-drop' }) // drag & drop upload
cy.readFile('cypress/downloads/<file>.csv').should('contain', 'Total')       // check a download
cy.clock(new Date('2026-12-31T23:59:00').getTime())                          // freeze the clock
cy.tick(60_000)                                                               // move time forward 1 min
```

```js
// cypress/support/e2e.js: ignore ONE known app error
Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('ResizeObserver loop')) return false  // known harmless error
})                                                               // anything else still fails
```

⚠️ Returning `false` for all errors hides real bugs. Always filter by message.

### Tags and filtering with `@cypress/grep`

```js
it('checkout works', { tags: ['@smoke', '@critical'] }, () => { /* ... */ })
```

```bash
npm install @cypress/grep --save-dev                      # install the plugin, then register it (see its README)
npx cypress run --expose grep="checkout"                  # run tests whose title matches
npx cypress run --expose grepTags="@smoke"                # run tests with a tag
npx cypress run --expose grepTags="-@flaky"               # exclude a tag
```

### Per-test settings and retries

```js
it('loads big report', { defaultCommandTimeout: 15000, retries: 2 }, () => { /* ... */ })
cy.get('[data-cy=report]', { timeout: 20000 }).should('be.visible')  // timeout for one query
```

### More useful add-ons

| Need | Tool | Quick use |
|---|---|---|
| Accessibility checks | `cypress-axe` | `cy.injectAxe()` then `cy.checkA11y()` |
| CI test reports | built-in `junit` reporter | `--reporter junit --reporter-options "mochaFile=results/junit-[hash].xml"` |
| HTML reports | `cypress-mochawesome-reporter` | Pretty HTML report with screenshots |
| Lint test code | `eslint-plugin-cypress` | Catches common Cypress mistakes |
| Dashboards, parallel runs, flake detection | Cypress Cloud | `npx cypress run --record --key <record-key>` |
| Component tests | Built in | `npx cypress open --component`, then `cy.mount(<Component />)` |
| Natural-language steps (experimental) | `cy.prompt()` | AI turns plain-English steps into commands; needs enabling + Cypress Cloud |

---

## 9. Real-World Recipes

### Recipe A: First smoke test for a new app

1. Install and open Cypress (section 1). Set `baseUrl`.
2. Create `cypress/e2e/smoke.cy.js`:

```js
describe('Smoke', { tags: '@smoke' }, () => {
  it('home page loads', () => {
    cy.visit('/')                                    // page opens without errors
    cy.get('h1').should('be.visible')                // main content renders
    cy.title().should('not.be.empty')                // has a title
  })
})
```

3. Run headless: `npx cypress run --spec cypress/e2e/smoke.cy.js`.

### Recipe B: Fast login with API + session

1. Ask devs for the login endpoint (e.g. `POST /api/login`).
2. Log in by API inside `cy.session` (skips the UI, much faster):

```js
Cypress.Commands.add('apiLogin', (email) => {
  cy.session(['api', email], () => {
    cy.env(['userPassword']).then(({ userPassword }) => {
      cy.request('POST', '/api/login', { email, password: userPassword }) // sets the session cookie
    })
  })
})
```

3. Keep **one** UI login test that checks the real form; use `apiLogin` everywhere else.

### Recipe C: Test how the UI handles errors

1. Find the request the page makes (DevTools → Network).
2. Stub it with failures:

```js
it('shows a friendly error when the API fails', () => {
  cy.intercept('GET', '/api/orders', { statusCode: 500 }).as('orders')
  cy.visit('/orders')
  cy.wait('@orders')
  cy.contains('Something went wrong').should('be.visible')  // user sees a message
  cy.getByCy('retry').should('be.enabled')                  // and a way to recover
})
```

3. Repeat for: empty list (`body: []`), slow (`delay`), offline (`forceNetworkError`).

### Recipe D: Turn a bug report into a regression test

1. Reproduce the bug manually; write down exact steps and data.
2. Write a test that follows those steps and asserts the **correct** behaviour. It should fail now.
3. Name it after the ticket: `it('BUG-123: cart total updates after removing item', ...)`.
4. When the fix lands, the test passes and guards against the bug coming back.

### Recipe E: Investigate a flaky test

1. Run it many times: `npx cypress run --spec "<file>" --config retries=0` in a loop, or use Cypress Cloud flake detection.
2. Open the failure screenshot / video. What was on screen?
3. Look for the usual causes:
   - Fixed `cy.wait(<ms>)` → replace with `cy.wait('@alias')` or an assertion.
   - Data shared between tests → seed per test.
   - Animation/re-render → assert the final state before acting.
4. Fix the cause. Retries hide flakiness; they don't fix it.

### Recipe F: Run tests in CI (GitHub Actions)

```yaml
# .github/workflows/e2e.yml
name: E2E tests
on: [push, pull_request]
jobs:
  cypress:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4                       # get the code
      - uses: cypress-io/github-action@v6               # installs deps, caches, runs Cypress (check for newer major)
        with:
          start: npm start                              # start the app
          wait-on: 'http://localhost:3000'              # wait until it responds
          browser: chrome
        env:
          CYPRESS_userPassword: ${{ secrets.USER_PASSWORD }}  # secret → cy.env()
      - uses: actions/upload-artifact@v4                # keep screenshots when tests fail
        if: failure()
        with:
          name: cypress-screenshots
          path: cypress/screenshots
```

### Recipe G: Check a form end to end

1. Happy path: fill all fields, submit, assert success message + the request body.
2. Validation: each required field empty → error shown, request **not** sent.
3. Boundaries: max length, special characters, leading/trailing spaces.

```js
it('does not submit when required fields are empty', () => {
  cy.intercept('POST', '/api/contact').as('send')
  cy.visit('/contact')
  cy.getByCy('submit').click()
  cy.getByCy('name-error').should('be.visible')
  cy.get('@send.all').should('have.length', 0)              // no request was made
})
```

---

## 10. Shortcuts and Config Snippets

### `package.json` scripts

```json
{
  "scripts": {
    "cy:open": "cypress open",
    "cy:run": "cypress run",
    "cy:run:chrome": "cypress run --browser chrome",
    "cy:smoke": "cypress run --expose grepTags=@smoke",
    "cy:staging": "cypress run --config baseUrl=https://staging.example.com"
  }
}
```

Run with `npm run cy:open`.

### `.gitignore`

```text
cypress/videos/
cypress/screenshots/
cypress/downloads/
results/
```

### Cypress app keyboard shortcuts (in `cypress open`)

| Key | Action |
|---|---|
| `R` | Re-run tests |
| `S` | Stop running tests |

### Global hooks in the support file

```js
// cypress/support/e2e.js
import './commands'                                 // load custom commands

beforeEach(() => {
  cy.intercept({ resourceType: /xhr|fetch/ }, { log: false }) // hide noisy request logs (optional)
})
```

### Old → new syntax

| Old (still in tutorials) | Modern |
|---|---|
| `cypress.json` | `cypress.config.js` |
| `cypress/integration/*.spec.js` | `cypress/e2e/*.cy.js` |
| `cypress/plugins/index.js` | `setupNodeEvents` in config |
| `cy.server()` + `cy.route()` | `cy.intercept()` |
| `Cypress.Cookies.preserveOnce()` | `cy.session()` |
| `Cypress.env('<key>')` | `cy.env(['<key>'])` / `Cypress.expose('<key>')` |
| `cy.exec('<command>')` | `cy.task('<name>')` |
| `.end()` | Just start a new `cy.` chain |
| `cy.get(...).type()` with 10ms delay | Default delay is now 0ms (`{ delay: 10 }` to restore) |

---

## 11. Common Pitfalls

| Mistake | Why it bites | Do instead |
|---|---|---|
| `const btn = cy.get('button')` | Commands don't return elements | Chain: `cy.get('button').click()`, or `.then()` / `.as()` |
| `await cy.get(...)` | Cypress commands aren't promises | Use chaining and `.then()` |
| `cy.wait(5000)` | Slow and still flaky | `cy.wait('@alias')` or `.should(...)` |
| `if ($el.is(':visible'))` conditional testing | Page may still be changing; random results | Control the state (stub, seed data) so the test knows what to expect |
| Tests relying on the previous test | Breaks when run alone or in a different order | Each test sets up its own state |
| `{ force: true }` to "fix" clicks | Passes even when users can't click | Fix what covers the element |
| CSS-class or nth-child selectors | Break on redesigns | `data-cy` attributes |
| Defining `cy.intercept` after `cy.visit` | Request already happened | Intercept first, then act |
| Logging in through the UI in every test | Slow suite | `cy.session` + API login |
| Testing third-party sites (payment, Google login) | You don't control them; flaky | Stub them, or test via sandbox/API |
| Asserting too little (`should('exist')` only) | Test passes while feature is broken | Assert what the user actually needs to see |
| Huge tests with 30 steps | Hard to debug when they fail | One behaviour per test, clear names |
| Hard-coded test data that already exists | Fails on second run ("email taken") | Generate unique data: `` `qa+${Date.now()}@test.com` `` |
| Secrets in config or logs | Leak in git, videos, screenshots | `cy.env()`, CI secrets, `{ log: false }` |

---

## 12. Glossary

| Term | Meaning |
|---|---|
| Spec | A test file (`*.cy.js`) |
| Suite | A group of tests: `describe()` / `context()` |
| Test case | One `it()` block |
| Hook | Code that runs around tests: `before`, `beforeEach`, `afterEach`, `after` |
| Command | Any `cy.*` call, queued and run in order |
| Query | Command that reads the page and retries (`get`, `find`, `contains`) |
| Action | Command that interacts with the page (`click`, `type`), runs once |
| Assertion | A check: `should`, `and`, `expect` |
| Subject | The value/element passed down a command chain |
| Retry-ability | Cypress re-running queries + assertions until they pass or time out |
| Alias | A named reference: `.as('x')`, used as `@x` |
| Fixture | Static test data file in `cypress/fixtures/` |
| Intercept | Watching (spy) or faking (stub) network requests |
| Stub | A fake response that replaces the real server |
| Spy | Observes calls/requests without changing them |
| Task | Node-side function called with `cy.task()` |
| Session | Cached login state via `cy.session()` |
| Test isolation | Clean browser state before every test |
| Support file | `cypress/support/e2e.js`, runs before every spec |
| baseUrl | Root URL of the app under test |
| Open mode | Interactive runner: `cypress open` |
| Run mode | Headless, CI-friendly: `cypress run` |
| Headless | Browser runs without a visible window |
| Time travel | Clicking Command Log steps to see past DOM snapshots |
| E2E test | Tests the whole app like a user would |
| Component test | Tests one UI component mounted alone |
| Smoke test | Small, fast set of checks that the app basically works |
| Regression test | Test that guards against an old bug coming back |
| Flaky test | Passes and fails randomly without code changes |
| Cypress Cloud | Paid/free-tier service for recording runs, parallelization, flake analytics |
