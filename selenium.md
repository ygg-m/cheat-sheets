# Selenium + Python Cheat Sheet

Selenium 4, Python 3, pytest. Sections marked ★ are the ones you'll use most. Learn those first.

## Contents

1. [Setup and imports](#1-setup-and-imports)
2. [Browser control](#2-browser-control)
3. ★ [Locators](#3--locators)
4. ★ [Interacting with elements](#4--interacting-with-elements)
5. ★ [Waits](#5--waits)
6. [Alerts, frames, windows](#6-alerts-frames-windows)
7. [Tables and lists](#7-tables-and-lists)
8. [JavaScript, scrolling, shadow DOM](#8-javascript-scrolling-shadow-dom)
9. ★ [Assertions](#9--assertions)
10. ★ [pytest for Selenium](#10--pytest-for-selenium)
11. ★ [Page Object Model](#11--page-object-model)
12. ★ [Errors and how to fix them](#12--errors-and-how-to-fix-them)
13. [When you're stuck](#13-when-youre-stuck)

---

## 1. Setup and imports

```bash
python -m venv .venv && source .venv/bin/activate
pip install selenium pytest
# later: pip install pytest-xdist pytest-html
```

Selenium 4.6+ downloads the matching browser driver for you (Selenium Manager), so you don't need to install chromedriver yourself.

```python
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.relative_locator import locate_with
from selenium.common.exceptions import (
    NoSuchElementException, TimeoutException, StaleElementReferenceException,
)
```

---

## 2. Browser control

### Start a browser

```python
# Chrome
opts = webdriver.ChromeOptions()
opts.add_argument("--headless=new")            # no window
opts.add_argument("--window-size=1920,1080")   # important in headless
opts.add_argument("--incognito")
opts.add_experimental_option("prefs", {
    "download.default_directory": "/tmp/downloads",
    "download.prompt_for_download": False,
})
driver = webdriver.Chrome(options=opts)

# Firefox
fopts = webdriver.FirefoxOptions()
fopts.add_argument("-headless")
driver = webdriver.Firefox(options=fopts)

# Remote / Selenium Grid
driver = webdriver.Remote(command_executor="http://localhost:4444", options=opts)
```

### Navigate and inspect

```python
driver.get("https://example.com")
driver.back(); driver.forward(); driver.refresh()
driver.title            # page title
driver.current_url      # current URL
driver.page_source      # full HTML (good for debugging)

driver.maximize_window()
driver.set_window_size(1280, 800)
driver.set_page_load_timeout(30)

driver.quit()           # closes EVERYTHING and ends the session — always do this
driver.close()          # closes only the current tab
```

### Cookies and screenshots

```python
driver.get_cookies(); driver.get_cookie("session")
driver.add_cookie({"name": "token", "value": "abc"})   # must be on that domain first
driver.delete_cookie("token"); driver.delete_all_cookies()

driver.save_screenshot("page.png")
element.screenshot("element.png")
```

Tip: logging in through the UI in every test is slow. Once a login test exists, you can log in once, save the cookies, then `add_cookie` them in other tests.

---

## 3. ★ Locators

Most failing tests come down to a bad locator, so this section is worth learning well.

### find_element vs find_elements

```python
el  = driver.find_element(By.ID, "username")         # one element; raises NoSuchElementException if missing
els = driver.find_elements(By.CSS_SELECTOR, ".item") # list; returns [] if none (never raises)

# Search INSIDE an element (scoped search: faster and more precise)
card = driver.find_element(By.CSS_SELECTOR, ".inventory_item")
price = card.find_element(By.CSS_SELECTOR, ".inventory_item_price")

# Check if something exists without try/except
exists = len(driver.find_elements(By.ID, "error")) > 0
```

### Strategy: pick in this order

| # | Strategy | Example | Why |
|---|---|---|---|
| 1 | `data-test` / `data-testid` attribute | `By.CSS_SELECTOR, "[data-test='login-button']"` | Made for tests; developers rarely change it |
| 2 | `By.ID` | `"user-name"` | Unique and fast (unless auto-generated like `id="ember123"`) |
| 3 | `By.NAME` | `"password"` | Stable on forms |
| 4 | `By.CSS_SELECTOR` | `"form#login button[type='submit']"` | Fast, readable, flexible |
| 5 | `By.XPATH` | `"//button[normalize-space()='Add to cart']"` | Use when you need text matching or complex relationships |
| 6 | `By.LINK_TEXT` / `By.PARTIAL_LINK_TEXT` | `"Forgot password?"` | Only for `<a>` links |
| — | `By.CLASS_NAME`, `By.TAG_NAME` | `"flash"`, `"h3"` | OK for simple cases; `CLASS_NAME` takes ONE class, no spaces |

**Red flags in a locator:**
- Absolute paths: `/html/body/div[2]/div/form/input` (breaks on any layout change)
- Generated class names: `.css-1x2y3z`, `.sc-bdVaJa` (change on every build)
- Index-only: `(//div)[14]` (breaks when content changes)
- Long chains of 5+ levels

### Test your locator BEFORE writing code

In the browser DevTools Console (F12):

```js
$$("css selector here")        // returns all CSS matches
$x("//xpath here")             // returns all XPath matches
```

- **0 matches** → wrong locator, or the element is inside an `<iframe>` / shadow DOM
- **1 match** → good
- **2+ matches** → make it more specific, or you'll click the wrong one

In the Elements tab, `Ctrl+F` also accepts CSS and XPath and highlights matches.

### CSS selectors

| Goal | Selector |
|---|---|
| By id | `#login` |
| By class | `.btn` |
| Multiple classes (same element) | `.btn.primary` |
| Tag + class | `button.primary` |
| Attribute equals | `input[name='email']` |
| Attribute starts with | `[id^='item-']` |
| Attribute ends with | `[href$='.pdf']` |
| Attribute contains | `[class*='error']` |
| Has attribute at all | `input[disabled]` |
| Two attributes | `input[type='checkbox'][checked]` |
| Direct child | `ul > li` |
| Any descendant | `div.menu li` |
| Next sibling (immediately after) | `label + input` |
| Any later sibling | `h2 ~ p` |
| First / last child | `li:first-child`, `li:last-child` |
| Nth child | `li:nth-child(3)`, `tr:nth-child(odd)` |
| Nth of its type | `p:nth-of-type(2)` |
| Not matching | `input:not([type='hidden'])` |
| Parent that contains X (modern browsers) | `div.card:has(.sold-out)` |
| Checked / disabled state | `input:checked`, `button:disabled` |

CSS **cannot** match by visible text. Use XPath for that.

### XPath

**Basics**

| Goal | XPath |
|---|---|
| Any element with id | `//*[@id='login']` |
| Tag with attribute | `//input[@name='email']` |
| Exact text | `//button[text()='Login']` |
| Text, ignoring extra spaces (prefer this) | `//button[normalize-space()='Login']` |
| Text contains | `//p[contains(text(),'Welcome')]` |
| Attribute contains | `//div[contains(@class,'error')]` |
| Attribute starts with | `//*[starts-with(@id,'item-')]` |
| AND / OR | `//input[@type='text' and @name='q']` |
| NOT | `//li[not(contains(@class,'hidden'))]` |
| Nth match overall (note the parentheses) | `(//div[@class='card'])[2]` |
| Last match | `(//li)[last()]` |

**Axes: moving around the page (XPath's superpower)**

| Goal | XPath |
|---|---|
| Parent | `//span[text()='Price']/..` |
| Ancestor (any level up) | `//button[text()='Delete']/ancestor::tr` |
| Following sibling | `//label[text()='Email']/following-sibling::input` |
| Preceding sibling | `//td[text()='Total']/preceding-sibling::td` |
| Descendant | `//form[@id='login']//button` |
| Element containing a child with text | `//div[@class='card'][.//h3[text()='Backpack']]` |
| Table row containing a cell value | `//tr[td[text()='jdoe@hotmail.com']]` |
| A specific cell in that row | `//tr[td[text()='jdoe@hotmail.com']]/td[4]` |
| Button in the same card as a title | `//div[.//div[text()='Sauce Labs Backpack']]//button` |

**Common XPath mistakes**
- `//div[2]` means "every div that is the 2nd div child of its parent", NOT "the 2nd div on the page". Use `(//div)[2]` for that.
- `text()` fails if the text is split by child tags (`<b>Hi</b> there`). Use `normalize-space()` or `contains(., 'there')` (the `.` means all text inside).
- Searching inside an element: `el.find_element(By.XPATH, ".//span")`. Without the leading `.`, `//span` searches the **whole page** again.

### Relative locators (Selenium 4)

Find elements by their position next to something you can locate easily:

```python
email = driver.find_element(By.ID, "email")
password = driver.find_element(locate_with(By.TAG_NAME, "input").below(email))
label = driver.find_element(locate_with(By.TAG_NAME, "label").to_left_of({By.ID: "email"}))
# also: .above()  .to_right_of()  .near()
```

Useful when there are no good attributes, but they depend on layout and window size. Use them sparingly.

### Locator tuples: keep locators in one place

```python
USERNAME = (By.ID, "user-name")
LOGIN_BTN = (By.CSS_SELECTOR, "[data-test='login-button']")

driver.find_element(*USERNAME).send_keys("standard_user")   # * unpacks the tuple
WebDriverWait(driver, 10).until(EC.element_to_be_clickable(LOGIN_BTN))
```

You'll use this pattern in every Page Object.

---

## 4. ★ Interacting with elements

### Basic actions

```python
el.click()
el.clear()
el.send_keys("hello")
el.send_keys("search term", Keys.ENTER)
el.submit()                       # submits the form el belongs to
```

### Reading element state

```python
el.text                           # VISIBLE text only ("" if hidden!)
el.get_attribute("value")         # current value of an input
el.get_attribute("textContent")   # text even if hidden
el.get_attribute("innerHTML")     # inner HTML
el.get_dom_attribute("href")      # attribute exactly as written in the HTML
el.get_property("checked")        # live JS property
el.value_of_css_property("color") # computed CSS, e.g. "rgba(255, 0, 0, 1)"
el.tag_name; el.size; el.location; el.rect

el.is_displayed()                 # visible on the page?
el.is_enabled()                   # not disabled?
el.is_selected()                  # checkbox / radio / option selected?
```

**Gotchas:**
- To read what's typed in an `<input>`, use `get_attribute("value")`, not `.text` (it's empty for inputs).
- `.text` is empty for hidden elements. Use `get_attribute("textContent")`.
- Clean up text before comparing: `el.text.strip()`, and for prices: `float(el.text.replace("$", ""))`.

### Keyboard

```python
el.send_keys(Keys.CONTROL, "a")          # select all (Linux/Windows; Keys.COMMAND on macOS)
el.send_keys(Keys.BACKSPACE)             # delete selection
el.send_keys(Keys.TAB)                   # move focus to next field
el.send_keys(Keys.ARROW_DOWN, Keys.ENTER) # pick from autocomplete
el.send_keys(Keys.ESCAPE)                # close a popup / menu
```

`el.clear()` sometimes doesn't trigger the site's JavaScript (React/Vue inputs). If a field doesn't seem cleared, use `Ctrl+A` then `Backspace`.

### Checkboxes and radio buttons

```python
box = driver.find_element(By.ID, "terms")
if not box.is_selected():      # click only if needed: makes the test idempotent
    box.click()
assert box.is_selected()
```

### Dropdowns

```python
# Real <select> elements only
select = Select(driver.find_element(By.ID, "dropdown"))
select.select_by_visible_text("Option 2")
select.select_by_value("2")
select.select_by_index(1)
select.first_selected_option.text        # what's selected now
[o.text for o in select.options]         # all options
select.is_multiple                       # multi-select?
select.deselect_all()                    # multi-select only
```

**Custom dropdowns** (built with `<div>`s, common in React apps) are NOT `<select>`. `Select()` raises `UnexpectedTagNameException`. Handle them like a user would:

```python
driver.find_element(By.CSS_SELECTOR, ".dropdown-toggle").click()
WebDriverWait(driver, 5).until(
    EC.element_to_be_clickable((By.XPATH, "//li[normalize-space()='Option 2']"))
).click()
```

### Mouse actions (ActionChains)

```python
actions = ActionChains(driver)

actions.move_to_element(el).perform()                   # hover
actions.double_click(el).perform()
actions.context_click(el).perform()                     # right-click
actions.drag_and_drop(source, target).perform()
actions.drag_and_drop_by_offset(slider, 50, 0).perform()

# Step-by-step drag (when drag_and_drop doesn't work)
actions.click_and_hold(source).move_to_element(target).release().perform()

# Hover menu → submenu → click
actions.move_to_element(menu).move_to_element(submenu).click(item).perform()

# Hold a key while clicking (multi-select)
actions.key_down(Keys.CONTROL).click(item1).click(item2).key_up(Keys.CONTROL).perform()
```

Nothing happens until you call `.perform()`.

### File upload

```python
import os
path = os.path.abspath("data/test.txt")   # MUST be an absolute path
driver.find_element(By.CSS_SELECTOR, "input[type='file']").send_keys(path)
```

Never click the "Browse" button: Selenium can't control the OS file dialog. Send the path straight to the `<input type="file">`, even if it's hidden.

---

## 5. ★ Waits

Pages load in pieces. Most "random" failures come from a test acting before the page is ready. **Never use `time.sleep()` as a fix**: it's either too short (flaky) or too long (slow).

### The three types

| Type | How | Use it? |
|---|---|---|
| `time.sleep(3)` | Always waits 3 s | ❌ Only to debug, never in a finished test |
| Implicit wait | `driver.implicitly_wait(10)` applies to every `find_element` | ⚠️ Avoid mixing it with explicit waits; timeouts get unpredictable |
| Explicit wait | `WebDriverWait(...).until(condition)` | ✅ Default choice |

### Explicit wait basics

```python
wait = WebDriverWait(driver, 10)   # max 10 s, checks every 0.5 s

el = wait.until(EC.visibility_of_element_located((By.ID, "finish")))  # returns the element
wait.until(EC.element_to_be_clickable((By.ID, "start"))).click()
wait.until_not(EC.visibility_of_element_located((By.ID, "loading")))   # wait for it to go away
```

Note the **double parentheses**: conditions take a locator *tuple* `(By.ID, "x")`.

### Expected conditions: which one to use

**Element appears / is ready**

| Condition | True when | Typical use |
|---|---|---|
| `presence_of_element_located(loc)` | It's in the HTML (may be hidden) | Element exists but you don't need to see it |
| `visibility_of_element_located(loc)` | In the HTML **and** visible | Reading text, checking a message |
| `element_to_be_clickable(loc)` | Visible **and** enabled | **Before every click** on dynamic pages |
| `presence_of_all_elements_located(loc)` | At least one match exists | Lists, search results |
| `visibility_of_all_elements_located(loc)` | All matches are visible | Product grids |

**Element disappears / changes**

| Condition | True when | Typical use |
|---|---|---|
| `invisibility_of_element_located(loc)` | Hidden or removed | Spinners, loading overlays, toasts |
| `staleness_of(el)` | That element was removed from the page | After a click that reloads the page |
| `text_to_be_present_in_element(loc, "txt")` | Element text contains "txt" | Status messages, counters |
| `text_to_be_present_in_element_value(loc, "txt")` | Input value contains "txt" | Auto-filled fields |
| `text_to_be_present_in_element_attribute(loc, "class", "active")` | Attribute contains text | Tabs/buttons becoming active |
| `element_attribute_to_include(loc, "disabled")` | Attribute is present | Button gets disabled |
| `element_to_be_selected(el)` | Checkbox / option selected | After toggling |

**Page / browser level**

| Condition | True when |
|---|---|
| `title_is("X")` / `title_contains("X")` | Title matches |
| `url_to_be(url)` / `url_contains("/cart")` / `url_matches(regex)` | Navigation finished |
| `alert_is_present()` | A JS alert opened (returns the alert) |
| `frame_to_be_available_and_switch_to_it(loc)` | Frame loaded; switches into it |
| `number_of_windows_to_be(2)` | A new tab/window opened |
| `new_window_is_opened(old_handles)` | A window was added |

**Combining conditions (Selenium 4)**

```python
# Wait for EITHER success or error, whichever comes first
wait.until(EC.any_of(
    EC.visibility_of_element_located((By.CSS_SELECTOR, ".success")),
    EC.visibility_of_element_located((By.CSS_SELECTOR, ".error")),
))
# also: EC.all_of(...), EC.none_of(...)
```

### Custom wait conditions

Any function that takes the driver and returns something truthy works:

```python
# At least 3 rows
wait.until(lambda d: len(d.find_elements(By.CSS_SELECTOR, "tr")) >= 3)

# Text changed from its old value
old = driver.find_element(By.ID, "count").text
button.click()
wait.until(lambda d: d.find_element(By.ID, "count").text != old)

# Page fully loaded
wait.until(lambda d: d.execute_script("return document.readyState") == "complete")

# Return the element you want (until() returns whatever your lambda returns)
row = wait.until(lambda d: d.find_element(By.XPATH, "//tr[td='jdoe@hotmail.com']"))
```

### Tuning the wait

```python
wait = WebDriverWait(
    driver,
    timeout=15,
    poll_frequency=0.2,                                   # check more often
    ignored_exceptions=[StaleElementReferenceException],  # keep retrying on these
)
el = wait.until(EC.visibility_of_element_located(LOC), message="Results never appeared")
```

The `message` shows up in the `TimeoutException`, so failures explain themselves.

### Reusable helper functions

Put these in a `BasePage` (see section 11) so tests stay short:

```python
def click(self, locator):
    self.wait.until(EC.element_to_be_clickable(locator)).click()

def type(self, locator, text):
    el = self.wait.until(EC.visibility_of_element_located(locator))
    el.clear()
    el.send_keys(text)

def text_of(self, locator):
    return self.wait.until(EC.visibility_of_element_located(locator)).text

def is_visible(self, locator, timeout=3):
    try:
        WebDriverWait(self.driver, timeout).until(EC.visibility_of_element_located(locator))
        return True
    except TimeoutException:
        return False
```

### Choosing a wait: quick guide

- About to **click**? → `element_to_be_clickable`
- About to **read text**? → `visibility_of_element_located` or `text_to_be_present_in_element`
- Waiting for a **spinner to go away**? → `invisibility_of_element_located`
- Clicked something that **reloads the page**? → `staleness_of(old_element)` or `url_contains`
- Waiting for a **count** or a **change**? → custom lambda

---

## 6. Alerts, frames, windows

### JavaScript alerts

```python
alert = WebDriverWait(driver, 5).until(EC.alert_is_present())
alert.text            # read message
alert.accept()        # OK
alert.dismiss()       # Cancel
alert.send_keys("hi") # type into a prompt(), then accept()
```

While an alert is open, **every other command fails** with `UnexpectedAlertPresentException`.

### Frames (iframes)

```python
driver.switch_to.frame("frame-name")                     # by name or id
driver.switch_to.frame(0)                                # by index
driver.switch_to.frame(driver.find_element(By.CSS_SELECTOR, "iframe.editor"))  # by element
WebDriverWait(driver, 10).until(EC.frame_to_be_available_and_switch_to_it((By.ID, "f1")))

driver.switch_to.parent_frame()    # one level up
driver.switch_to.default_content() # back to the main page
```

Nested frames: go in one level at a time. To reach a **sibling** frame, go up to the parent first.

### Windows and tabs

```python
original = driver.current_window_handle
link.click()                                       # opens a new tab
WebDriverWait(driver, 10).until(EC.number_of_windows_to_be(2))

for handle in driver.window_handles:
    if handle != original:
        driver.switch_to.window(handle)
        break

# ... do things in the new tab ...
driver.close()                                     # close the new tab
driver.switch_to.window(original)                  # ALWAYS switch back after close

driver.switch_to.new_window("tab")                 # open + switch to a new empty tab ("window" for a window)
```

---

## 7. Tables and lists

```python
rows = driver.find_elements(By.CSS_SELECTOR, "#table1 tbody tr")
for row in rows:
    cells = row.find_elements(By.TAG_NAME, "td")
    print([c.text for c in cells])

# Turn a table into a list of dicts using the header names
headers = [h.text for h in driver.find_elements(By.CSS_SELECTOR, "#table1 thead th")]
data = [
    dict(zip(headers, [c.text for c in r.find_elements(By.TAG_NAME, "td")]))
    for r in driver.find_elements(By.CSS_SELECTOR, "#table1 tbody tr")
]
jdoe = next(r for r in data if r["Email"] == "jdoe@hotmail.com")
assert jdoe["Due"] == "$100.00"

# Check sorting
names = [e.text for e in driver.find_elements(By.CSS_SELECTOR, "#table1 tbody td:nth-child(1)")]
assert names == sorted(names)

prices = [float(e.text.replace("$", "")) for e in driver.find_elements(By.CLASS_NAME, "inventory_item_price")]
assert prices == sorted(prices)                 # low → high
assert prices == sorted(prices, reverse=True)   # high → low
```

---

## 8. JavaScript, scrolling, shadow DOM

### Running JavaScript

```python
driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", el)
driver.execute_script("arguments[0].click();", el)            # last resort: skips real-user checks
title = driver.execute_script("return document.title;")       # use `return` to get values back
driver.execute_script("arguments[0].value = arguments[1];", input_el, "text")
driver.execute_script("arguments[0].remove();", cookie_banner) # get rid of an overlay
driver.execute_script("arguments[0].style.border='3px solid red';", el)  # highlight while debugging
```

A JS click can hide real bugs: it clicks things a user couldn't (covered or hidden buttons). Use it only after you understand why the normal click fails.

### Scrolling

```python
driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")  # to bottom
driver.execute_script("window.scrollBy(0, 500);")                         # down 500 px

# Selenium 4 native scrolling
ActionChains(driver).scroll_to_element(el).perform()
ActionChains(driver).scroll_by_amount(0, 500).perform()
```

Infinite scroll pattern:

```python
for _ in range(5):
    count = len(driver.find_elements(By.CSS_SELECTOR, ".jscroll-added"))
    driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
    WebDriverWait(driver, 10).until(
        lambda d: len(d.find_elements(By.CSS_SELECTOR, ".jscroll-added")) > count
    )
```

### Shadow DOM

If DevTools shows `#shadow-root` above your element, normal locators won't find it:

```python
host = driver.find_element(By.CSS_SELECTOR, "my-component")
inner = host.shadow_root.find_element(By.CSS_SELECTOR, "button")   # CSS only, not XPath
```

---

## 9. ★ Assertions

A test without an assertion only checks that nothing crashed. Always check the outcome.

```python
assert driver.title == "Swag Labs"
assert "/inventory" in driver.current_url
assert el.is_displayed()
assert len(items) == 6, f"Expected 6 items, got {len(items)}"   # message helps when it fails
assert "Epic sadface" in error.text
assert not driver.find_elements(By.ID, "error")                # element should NOT exist
assert price == pytest.approx(29.99)                            # float comparisons

with pytest.raises(NoSuchElementException):                     # expect an exception
    driver.find_element(By.ID, "deleted-item")
```

### What to assert (good vs weak)

| Weak | Better |
|---|---|
| `assert el` (it exists) | `assert el.text == "Thank you for your order!"` |
| `assert len(items) > 0` | `assert len(items) == 6` |
| Only checking the URL after login | URL **and** a page element **and** no error message |
| Asserting a whole long paragraph | Asserting the key phrase with `in` |

**Assert on what the user sees.** Prefer visible text and states over internal details.

**Element should disappear?** Don't assert immediately. Wait first:
```python
assert WebDriverWait(driver, 5).until(EC.invisibility_of_element_located(SPINNER))
```

**Soft assertions** (keep checking after one fails): `pip install pytest-check`, then `from pytest_check import check` and `check.equal(a, b)`.

---

## 10. ★ pytest for Selenium

### conftest.py: driver fixture with browser + headless options

```python
# conftest.py
import os
import pytest
from selenium import webdriver

def pytest_addoption(parser):
    parser.addoption("--browser", default="chrome", help="chrome or firefox")
    parser.addoption("--headless", action="store_true", help="run without a window")
    parser.addoption("--base-url", default="https://www.saucedemo.com")

@pytest.fixture
def base_url(request):
    return request.config.getoption("--base-url")

@pytest.fixture
def driver(request):
    browser = request.config.getoption("--browser")
    headless = request.config.getoption("--headless")

    if browser == "firefox":
        opts = webdriver.FirefoxOptions()
        if headless:
            opts.add_argument("-headless")
        d = webdriver.Firefox(options=opts)
    else:
        opts = webdriver.ChromeOptions()
        if headless:
            opts.add_argument("--headless=new")
        opts.add_argument("--window-size=1920,1080")
        d = webdriver.Chrome(options=opts)

    yield d          # test runs here
    d.quit()         # runs even if the test fails

# Screenshot on failure
@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()
    if report.when == "call" and report.failed:
        drv = item.funcargs.get("driver")
        if drv:
            os.makedirs("screenshots", exist_ok=True)
            drv.save_screenshot(f"screenshots/{item.name}.png")
```

### Fixture scopes

| Scope | Browser opens | Trade-off |
|---|---|---|
| `function` (default) | Once per test | Slowest, but tests are fully independent ✅ |
| `class` | Once per test class | Faster; tests can affect each other |
| `module` / `session` | Once per file / run | Fastest; shared state causes flaky tests |

Start with `function`. Independent tests are worth the extra seconds.

### Fixtures that build on each other

```python
@pytest.fixture
def logged_in(driver, base_url):
    driver.get(base_url)
    driver.find_element(By.ID, "user-name").send_keys("standard_user")
    driver.find_element(By.ID, "password").send_keys("secret_sauce")
    driver.find_element(By.ID, "login-button").click()
    return driver

def test_cart_starts_empty(logged_in):
    assert not logged_in.find_elements(By.CLASS_NAME, "shopping_cart_badge")
```

### Parametrize: one test, many inputs

```python
@pytest.mark.parametrize("user, should_login", [
    ("standard_user", True),
    ("locked_out_user", False),
    ("problem_user", True),
], ids=["standard", "locked", "problem"])
def test_login(driver, base_url, user, should_login):
    ...
```

Data from a file:

```python
import json
with open("data/users.json") as f:
    USERS = json.load(f)

@pytest.mark.parametrize("user", USERS, ids=lambda u: u["name"])
def test_checkout(driver, user): ...
```

### Markers: group tests

```python
@pytest.mark.smoke
def test_login(driver): ...

@pytest.mark.skip(reason="bug #123")
def test_broken(): ...

@pytest.mark.xfail(reason="known bug")
def test_known_issue(): ...
```

```ini
# pytest.ini
[pytest]
testpaths = tests
markers =
    smoke: quick critical checks
    regression: full suite
addopts = -v
```

### Command line

| Command | Does |
|---|---|
| `pytest` | Run everything |
| `pytest tests/test_login.py` | One file |
| `pytest tests/test_login.py::test_valid_login` | One test |
| `pytest -k "login and not locked"` | Tests whose names match |
| `pytest -m smoke` | Tests with a marker |
| `pytest -x` | Stop at the first failure |
| `pytest --lf` | Re-run only last failures |
| `pytest -s` | Show `print()` output |
| `pytest -v` / `-q` | More / less output |
| `pytest --browser firefox --headless` | Your custom options |
| `pytest -n 4` | 4 in parallel (`pytest-xdist`) |
| `pytest --html=report.html` | HTML report (`pytest-html`) |
| `pytest --count 20 -x` | Repeat to find flakiness (`pytest-repeat`) |

---

## 11. ★ Page Object Model

One class per page. Locators and actions live in the class; tests only describe steps and assertions. When the page changes, you fix one file.

### Structure

```text
project/
  conftest.py
  pytest.ini
  pages/
    base_page.py
    login_page.py
    inventory_page.py
  tests/
    test_login.py
  data/
    users.json
```

### BasePage

```python
# pages/base_page.py
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

class BasePage:
    def __init__(self, driver, timeout=10):
        self.driver = driver
        self.wait = WebDriverWait(driver, timeout)

    def open(self, url):
        self.driver.get(url)
        return self

    def find(self, locator):
        return self.wait.until(EC.visibility_of_element_located(locator))

    def click(self, locator):
        self.wait.until(EC.element_to_be_clickable(locator)).click()

    def type(self, locator, text):
        el = self.find(locator)
        el.clear()
        el.send_keys(text)

    def text_of(self, locator):
        return self.find(locator).text

    def is_visible(self, locator, timeout=3):
        try:
            WebDriverWait(self.driver, timeout).until(EC.visibility_of_element_located(locator))
            return True
        except TimeoutException:
            return False
```

### A page

```python
# pages/login_page.py
from selenium.webdriver.common.by import By
from pages.base_page import BasePage
from pages.inventory_page import InventoryPage

class LoginPage(BasePage):
    USERNAME = (By.ID, "user-name")
    PASSWORD = (By.ID, "password")
    LOGIN_BTN = (By.ID, "login-button")
    ERROR = (By.CSS_SELECTOR, "[data-test='error']")

    def login(self, user, password):
        self.type(self.USERNAME, user)
        self.type(self.PASSWORD, password)
        self.click(self.LOGIN_BTN)
        return InventoryPage(self.driver)   # return the page you land on

    def error_message(self):
        return self.text_of(self.ERROR)
```

### A test using it

```python
# tests/test_login.py
from pages.login_page import LoginPage

def test_valid_login(driver, base_url):
    inventory = LoginPage(driver).open(base_url).login("standard_user", "secret_sauce")
    assert inventory.is_loaded()

def test_locked_user(driver, base_url):
    page = LoginPage(driver).open(base_url)
    page.login("locked_out_user", "secret_sauce")
    assert "locked out" in page.error_message()
```

### POM rules of thumb

- **No assertions inside page objects.** They return data; tests decide pass/fail.
- **No locators in tests.** If a test has `By.` in it, something belongs in a page class.
- **Methods are user actions**, like `login()`, `add_to_cart("Backpack")`, `checkout()`, not `click_button_3()`.
- **Return the next page** from methods that navigate, so tests can chain.
- **Repeated parts** (header, cart badge, menu) → a component class that pages share.

---

## 12. ★ Errors and how to fix them

| Exception | Usual cause | Fix |
|---|---|---|
| `NoSuchElementException` | Wrong locator; page not ready; element is in an iframe or shadow DOM | Test the locator with `$$()` / `$x()`; add an explicit wait; check for `<iframe>` / `#shadow-root` |
| `TimeoutException` | The wait condition never became true | Wrong condition (presence vs visibility?), wrong locator, or the app really is broken. Screenshot at that moment |
| `StaleElementReferenceException` | The page re-rendered after you found the element | Find it again right before using it; don't store elements across page changes; store **locators** instead |
| `ElementClickInterceptedException` | Something covers it: cookie banner, modal, sticky header, spinner | Wait for the overlay to vanish; close the banner; scroll it to the center |
| `ElementNotInteractableException` | Hidden, zero-size, disabled, or you found the hidden twin of the element | Wait for `element_to_be_clickable`; check `$$()` for 2 matches and make the locator more specific |
| `UnexpectedAlertPresentException` | An alert is open and blocks everything | Handle it: `driver.switch_to.alert.accept()` |
| `NoAlertPresentException` | Alert hasn't opened yet | `wait.until(EC.alert_is_present())` |
| `NoSuchFrameException` | Wrong frame name, or you're in the wrong parent | `default_content()` first, then go down one level at a time |
| `NoSuchWindowException` | You closed the window you're still switched to | `switch_to.window(original)` right after `close()` |
| `InvalidSelectorException` | Typo in CSS/XPath, or XPath used with `By.CSS_SELECTOR` | Paste it into DevTools; check the `By` type matches |
| `UnexpectedTagNameException` | `Select()` used on a custom (non-`<select>`) dropdown | Click to open, then click the option |
| `SessionNotCreatedException` | Browser/driver version mismatch | `pip install -U selenium`; let Selenium Manager fetch the driver |
| `WebDriverException: net::ERR_...` | Bad URL or site down | Check the URL in a normal browser |
| `AttributeError: 'WebDriver' object has no attribute 'find_element_by_id'` | Old Selenium 3 syntax from an outdated tutorial | Use `find_element(By.ID, "x")` |

### Stale element: the classic trap

```python
# ❌ Breaks: the list re-renders after each delete
buttons = driver.find_elements(By.CSS_SELECTOR, ".delete")
for b in buttons:
    b.click()          # second loop → StaleElementReferenceException

# ✅ Find fresh each time
while driver.find_elements(By.CSS_SELECTOR, ".delete"):
    driver.find_element(By.CSS_SELECTOR, ".delete").click()
```

---

## 13. When you're stuck

**Debug in this order:**

1. Read the exception name (table above) and find the last line of *your* code in the traceback.
2. Screenshot or `breakpoint()` right before the failing line, and look at the real browser.
3. Test the locator in DevTools: 0, 1, or many matches?
4. Check context: iframe? new tab? alert? shadow DOM?
5. Passes slowly but fails at full speed → a missing or wrong wait.
6. Reproduce it in a 5-line script with just that page and action.
7. Search: `selenium python` + exception + what you were doing.

**Flaky test checklist:**
- Fails only headless → set `--window-size=1920,1080`.
- Fails only in parallel → tests share a user, data, or cart.
- Any `time.sleep()` left → replace with a wait.
- Run it 20× (`pytest --count 20 -x`) before calling it fixed.

**Where to look:**
- Selenium docs: https://www.selenium.dev/documentation/
- Python API reference: https://www.selenium.dev/selenium/docs/api/py/
- pytest docs: https://docs.pytest.org/
- CSS selectors (MDN): https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors
- Stack Overflow: https://stackoverflow.com/questions/tagged/selenium-webdriver

Ignore answers using `find_element_by_*`: that's Selenium 3 and no longer works.
