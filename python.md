# Python Cheat Sheet for QA Testers

A quick reference for modern Python (3.12+): setup, syntax, debugging, and automated testing with pytest, requests, and Playwright.

## Table of Contents

1. [Setup and Installation](#1-setup-and-installation)
2. [Core Concepts](#2-core-concepts)
3. [Everyday Syntax](#3-everyday-syntax)
4. [Testing with pytest](#4-testing-with-pytest)
5. [Inspecting and Debugging](#5-inspecting-and-debugging)
6. [Undoing Mistakes and Recovering](#6-undoing-mistakes-and-recovering)
7. [Advanced but Useful Features](#7-advanced-but-useful-features)
8. [Real-World Workflows](#8-real-world-workflows)
9. [Shortcuts, Aliases and Config](#9-shortcuts-aliases-and-config)
10. [Common Pitfalls](#10-common-pitfalls)
11. [Glossary](#11-glossary)

---

## 1. Setup and Installation

### Install Python

| OS | Command / method |
|---|---|
| Windows | `winget install Python.Python.3.13`, or the installer from python.org (tick **"Add python.exe to PATH"**) |
| macOS | `brew install python` |
| Linux (Arch) | `sudo pacman -S python python-pip` |
| Linux (Debian/Ubuntu) | `sudo apt install python3 python3-venv python3-pip` |
| Any OS (recommended) | Install **uv**, then run `uv python install` (see below) |

```bash
python --version                  # check version (use python3 on many Linux/macOS systems)
python -m pip --version           # check pip belongs to that same Python
which python                      # where is it? (Windows: where python)
```

> Run `python -m pip` instead of plain `pip`. It makes sure pip installs into the Python you're actually using.

### Virtual environments (always use one per project)

```bash
python -m venv .venv              # create an env in the .venv folder
source .venv/bin/activate         # activate (Linux/macOS)
.venv\Scripts\Activate.ps1        # activate (Windows PowerShell)
deactivate                        # leave the env
```

> ⚠️ On Arch, Debian and recent macOS, `pip install` outside a venv fails with `externally-managed-environment`. Don't fight it with `--break-system-packages`. Use a venv.

### Package management: pip vs uv

**uv** is the modern, very fast all-in-one tool. pip + venv is still what most tutorials use.

| I want to… | uv (modern) | pip + venv (classic) |
|---|---|---|
| Start a project | `uv init <name>` | `mkdir <name>` + `python -m venv .venv` |
| Add a package | `uv add <pkg>` | `pip install <pkg>` |
| Add a dev/test-only package | `uv add --dev pytest` | `pip install pytest` |
| Remove a package | `uv remove <pkg>` | `pip uninstall <pkg>` |
| Install everything from the project file | `uv sync` | `pip install -r requirements.txt` |
| Run a command inside the env | `uv run pytest` | activate, then `pytest` |
| Freeze exact versions | automatic (`uv.lock`) | `pip freeze > requirements.txt` |
| Install a Python version | `uv python install 3.13` | OS installer / pyenv |

```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh                  # Linux/macOS
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"       # Windows
```

### Project file: `pyproject.toml`

```toml
[project]
name = "<project-name>"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = ["requests>=2.32"]          # runtime deps

[dependency-groups]
dev = ["pytest", "pytest-cov", "ruff"]     # test/dev deps (uv add --dev ...)
```

> `requirements.txt` is the older approach, but you'll still see it in many repos and CI pipelines.

### Editor setup (VS Code)

| Do this | Why |
|---|---|
| Install the **Python** extension (Microsoft) | IntelliSense, debugging, test explorer |
| `Ctrl+Shift+P` → **Python: Select Interpreter** → pick `.venv` | So the editor uses your project env |
| Testing panel (flask icon) → configure **pytest** | Run/debug tests with one click |
| Install the **Ruff** extension | Linting + auto-format on save |

---

## 2. Core Concepts

### How the pieces connect

```
 your_project/
 ├── pyproject.toml          ← lists dependencies & tool config
 ├── .venv/                  ← isolated Python + installed packages
 │     └── site-packages/    ← where pip/uv put libraries (requests, pytest…)
 ├── src/app/                ← package = folder of modules
 │     ├── __init__.py
 │     └── calculator.py     ← module = one .py file
 └── tests/
       ├── conftest.py       ← shared pytest fixtures
       └── test_calculator.py

 python test_x.py ──► interpreter ──► import app.calculator ──► finds it in
                       (inside .venv)                           your project or
                                                                 site-packages
```

### Key ideas

| Concept | One-liner |
|---|---|
| Interpreted | Code runs line by line. No compile step; errors appear at runtime. |
| Dynamically typed | Variables have no fixed type; values do. Type hints are optional and not enforced. |
| Indentation = blocks | 4 spaces define a block. No `{}`. |
| Everything is an object | Numbers, functions, and classes all have attributes and methods. |
| Names are references | `b = a` doesn't copy. Both names point to the same object. |

### Built-in data types

| Type | Example | Mutable? | Ordered? | Use for |
|---|---|---|---|---|
| `int` / `float` | `42`, `3.14` | No | n/a | Numbers |
| `bool` | `True`, `False` | No | n/a | Flags |
| `str` | `"hello"` | No | Yes | Text |
| `list` | `[1, 2, 3]` | **Yes** | Yes | Sequences you change |
| `tuple` | `(1, 2)` | No | Yes | Fixed records, dict keys |
| `dict` | `{"id": 1}` | **Yes** | Yes (insertion) | Key → value (JSON-like) |
| `set` | `{1, 2}` | **Yes** | No | Unique items, fast membership |
| `None` | `None` | No | n/a | "No value" |

### Truthiness

These count as **False**: `False`, `None`, `0`, `0.0`, `""`, `[]`, `{}`, `set()`. Everything else counts as True.

---

## 3. Everyday Syntax

### Variables, strings and f-strings

```python
name = "Ygor"                         # str
count = 3                             # int
price = 9.99                          # float
active = True                         # bool

print(f"{name} has {count} bugs")     # f-string (modern, preferred)
print(f"{price:.2f}")                 # 2 decimals → 9.99
print(f"{count=}")                    # debug print → count=3
print(f"{'ok':>10}")                  # right-align in 10 chars

text = "  Hello World  "
text.strip()                          # "Hello World"
text.lower(), text.upper()            # change case
text.replace("World", "QA")           # substitute
"a,b,c".split(",")                    # ["a", "b", "c"]
", ".join(["a", "b"])                 # "a, b"
"err" in "server error"               # True (substring check)
text.startswith("  He")               # True
```

> Older formatting you'll still see in tutorials: `"%s has %d" % (name, n)` and `"{} has {}".format(name, n)`.

### Lists, tuples, dicts, sets

```python
items = [10, 20, 30]
items.append(40)                      # add to end
items.insert(0, 5)                    # add at index
items.remove(20)                      # remove first match by value
last = items.pop()                    # remove and return last
items[0], items[-1]                   # first, last
items[1:3]                            # slice → index 1 and 2
len(items)                            # length
sorted(items, reverse=True)           # new sorted list
20 in items                           # membership test

point = (3, 4)                        # tuple (immutable)
x, y = point                          # unpacking

user = {"id": 1, "name": "Ana"}
user["email"] = "ana@test.com"        # add/update key
user.get("phone", "n/a")              # safe read with default
user.pop("email")                     # remove key
for key, value in user.items():       # loop key + value
    print(key, value)
{**user, "id": 2}                     # copy with override
user | {"role": "qa"}                 # merge (3.9+)

tags = {"smoke", "ui"}
tags.add("api")                       # add item
{"a", "b"} & {"b", "c"}               # intersection → {"b"}
```

### Control flow

```python
if status == 200:
    print("OK")
elif status in (301, 302):
    print("Redirect")
else:
    print("Problem")

for i in range(3):                    # 0, 1, 2
    print(i)

for i, item in enumerate(items):      # index + value
    print(i, item)

for a, b in zip(expected, actual):    # pair two lists
    print(a == b)

while retries < 3:
    retries += 1
    if done:
        break                         # exit loop
    continue                          # skip to next iteration

result = "pass" if ok else "fail"     # one-line conditional
```

### match (structural pattern matching, 3.10+)

```python
match response.status_code:
    case 200 | 201:
        print("success")
    case 404:
        print("not found")
    case code if code >= 500:
        print(f"server error {code}")
    case _:                           # default
        print("other")
```

### Functions

```python
def login(user: str, password: str, remember: bool = False) -> bool:
    """Return True if login succeeds."""     # docstring
    return user == "admin" and password == "secret"

login("admin", "secret")                     # positional args
login(user="admin", password="x", remember=True)   # keyword args

def log(*args, **kwargs):                    # any number of args
    print(args, kwargs)                      # tuple, dict

square = lambda n: n * n                     # tiny anonymous function
```

### Exceptions

```python
try:
    value = int("abc")
except ValueError as e:                   # catch a specific error
    print(f"Bad input: {e}")
except (KeyError, IndexError):            # catch several types
    print("Lookup failed")
else:
    print("Ran only if no error")
finally:
    print("Always runs (cleanup)")

raise ValueError("Price must be positive")   # raise your own
```

### Files and paths (use `pathlib`)

```python
from pathlib import Path

path = Path("data") / "users.json"        # build paths with /
path.exists()                             # check it's there
text = path.read_text(encoding="utf-8")   # read whole file
path.write_text("hi", encoding="utf-8")   # ⚠️ overwrites the file
for p in Path("tests").glob("test_*.py"): # find files
    print(p.name)

with open("log.txt", "a", encoding="utf-8") as f:   # auto-closes the file
    f.write("new line\n")                 # "a" append, "w" overwrite, "r" read
```

> `os.path.join(...)` is the older style and still common. Use `pathlib` for new code.

### JSON and CSV (test data)

```python
import json, csv

data = json.loads('{"id": 1}')                    # str → dict
text = json.dumps(data, indent=2)                 # dict → pretty str
data = json.loads(Path("data.json").read_text())  # read JSON file

with open("users.csv", newline="", encoding="utf-8") as f:
    rows = list(csv.DictReader(f))                # list of dicts, one per row
```

### Classes

```python
class LoginPage:
    URL = "/login"                                # class attribute

    def __init__(self, page):                     # constructor
        self.page = page                          # instance attribute

    def login(self, user: str, pwd: str) -> None:
        self.page.fill("#user", user)
        self.page.fill("#pwd", pwd)
        self.page.click("button[type=submit]")

    def __repr__(self) -> str:                    # how it prints when debugging
        return f"LoginPage(url={self.URL})"

class AdminLoginPage(LoginPage):                  # inheritance
    URL = "/admin/login"
```

### Imports

```python
import json                               # whole module
from pathlib import Path                  # one name
from datetime import datetime as dt       # alias
from app.calculator import add            # from your own package

if __name__ == "__main__":                # runs only when executed directly,
    main()                                # not when imported
```

---

## 4. Testing with pytest

### Install and run

```bash
uv add --dev pytest                       # or: pip install pytest
pytest                                    # find & run all tests
pytest tests/test_login.py                # one file
pytest tests/test_login.py::test_valid    # one test
pytest -k "login and not admin"           # by name expression
```

> pytest discovers files named `test_*.py` or `*_test.py`, functions named `test_*`, and classes named `Test*` that have no `__init__`.

### Most-used flags

| Flag | Does |
|---|---|
| `-v` / `-vv` | Verbose (show each test / full diffs) |
| `-q` | Quiet |
| `-x` | Stop at first failure |
| `--maxfail=<n>` | Stop after n failures |
| `-k "<expr>"` | Select tests by name |
| `-m "<marker>"` | Select by marker, e.g. `-m smoke` |
| `-s` | Show `print()` output (don't capture) |
| `--lf` | Rerun only last failed |
| `--ff` | Failed first, then the rest |
| `--tb=short` / `--tb=line` | Shorter tracebacks |
| `-rA` | Summary of all outcomes at the end |
| `--pdb` | Open debugger on failure |
| `--durations=10` | Show 10 slowest tests |
| `--collect-only` | List tests without running |
| `-n auto` | Run in parallel (needs `pytest-xdist`) |
| `--cov=<pkg>` | Coverage (needs `pytest-cov`) |
| `--junitxml=report.xml` | JUnit report for CI |

### Assertions

```python
def test_examples():
    assert add(2, 3) == 5                         # equality
    assert "error" not in response.text           # membership
    assert user["active"] is True                 # identity (True/False/None)
    assert len(items) == 3, "expected 3 items"    # custom failure message
    assert 0.1 + 0.2 == pytest.approx(0.3)        # float comparison
    assert set(actual) == {"a", "b"}              # order-insensitive
```

```python
import pytest

def test_raises():
    with pytest.raises(ValueError, match="positive"):   # expect an exception
        set_price(-1)
```

> pytest rewrites plain `assert` so failures show both values. You don't need `assertEqual`. (`unittest` uses `self.assertEqual`; it's the older built-in style and still common in legacy code.)

### Arrange, Act, Assert

```python
def test_cart_total():
    cart = Cart()                         # Arrange: set up state
    cart.add("book", price=10, qty=2)
    total = cart.total()                  # Act: do the thing
    assert total == 20                    # Assert: check the result
```

### Fixtures (setup/teardown)

```python
import pytest

@pytest.fixture
def user():                               # setup only
    return {"name": "Ana", "role": "qa"}

@pytest.fixture
def db():
    conn = connect("<test-db-url>")       # setup
    yield conn                            # the test runs here
    conn.close()                          # teardown (runs even if test fails)

def test_user_role(user):                 # request a fixture by argument name
    assert user["role"] == "qa"
```

| Scope | Created once per… |
|---|---|
| `function` (default) | test |
| `class` | test class |
| `module` | `.py` file |
| `session` | whole test run (e.g. a login token, a browser) |

```python
@pytest.fixture(scope="session")
def api_token():
    return get_token("<user>", "<pass>")
```

> Put shared fixtures in `tests/conftest.py`. pytest loads them automatically, no import needed.

### Built-in fixtures worth knowing

| Fixture | Use it to… |
|---|---|
| `tmp_path` | Get a fresh temp folder (`Path`) per test |
| `monkeypatch` | Temporarily change env vars, attributes, dict items |
| `capsys` | Capture `print` output (`capsys.readouterr().out`) |
| `caplog` | Assert on log messages |
| `request` | Inspect the current test (name, markers, params) |

```python
def test_env(monkeypatch):
    monkeypatch.setenv("BASE_URL", "http://localhost")   # undone after the test
```

### Parametrize (data-driven tests)

```python
@pytest.mark.parametrize(
    "email, valid",
    [
        ("ana@test.com", True),
        ("no-at-sign.com", False),
        ("", False),
    ],
    ids=["valid", "missing-at", "empty"],                # readable test names
)
def test_email_validation(email, valid):
    assert is_valid_email(email) is valid
```

### Markers

```python
@pytest.mark.smoke                        # custom tag → run with -m smoke
def test_homepage_loads(): ...

@pytest.mark.skip(reason="BUG-123")       # always skip
def test_broken(): ...

@pytest.mark.skipif(sys.platform == "win32", reason="Linux only")
def test_linux(): ...

@pytest.mark.xfail(reason="known bug BUG-456")   # expected to fail
def test_known_issue(): ...
```

> Register custom markers in `pyproject.toml` (see [section 9](#9-shortcuts-aliases-and-config)) or pytest warns about unknown marks.

### Mocking

```python
from unittest.mock import patch, MagicMock

def test_payment_api_down():
    with patch("app.payments.requests.post") as fake_post:   # patch where it's USED
        fake_post.return_value.status_code = 503
        assert pay(10) == "retry later"
        fake_post.assert_called_once()                        # verify the call
```

> With `pytest-mock` installed, the `mocker` fixture does the same thing with less nesting: `mocker.patch("app.payments.requests.post")`.

### Useful testing plugins

| Plugin | Adds |
|---|---|
| `pytest-cov` | Coverage reports |
| `pytest-xdist` | Parallel runs (`-n auto`) |
| `pytest-html` | HTML report (`--html=report.html`) |
| `pytest-mock` | `mocker` fixture |
| `pytest-rerunfailures` | `--reruns 2` for flaky tests |
| `pytest-playwright` | Browser UI testing (`page` fixture) |
| `pytest-bdd` | Gherkin `.feature` files (Given/When/Then) |
| `faker` (library) | Realistic fake test data |
| `requests` / `httpx` (libraries) | HTTP/API testing |

---

## 5. Inspecting and Debugging

### Quick inspection

```python
type(x)                     # what type is it?
isinstance(x, dict)         # type check (preferred over type() ==)
dir(x)                      # list attributes/methods
help(str.split)             # docs in the terminal
repr(x)                     # unambiguous representation
vars(obj)                   # instance attributes as a dict
print(f"{x=}")              # prints name and value
from pprint import pprint
pprint(big_dict)            # pretty-print nested data
```

### The debugger (`breakpoint()` / pdb)

```python
def calculate(order):
    total = sum(order.items)
    breakpoint()            # execution pauses here → pdb prompt
    return total * 1.1
```

| pdb command | Does |
|---|---|
| `n` | Next line (step over) |
| `s` | Step into function |
| `c` | Continue until next breakpoint |
| `r` | Run until current function returns |
| `l` / `ll` | List code around line / whole function |
| `p <expr>` / `pp <expr>` | Print / pretty-print a value |
| `w` | Where am I (stack) |
| `u` / `d` | Move up / down the stack |
| `b <line>` | Set breakpoint at line |
| `interact` | Full Python shell in current scope |
| `q` | Quit |

```bash
pytest --pdb                       # drop into pdb at the failure point
pytest --trace                     # drop into pdb at the START of each test
python -m pdb script.py            # run a whole script under the debugger
```

> In VS Code, click left of a line number to set a breakpoint, then right-click a test → **Debug Test**.

### Reading a traceback

```
Traceback (most recent call last):
  File "tests/test_cart.py", line 8, in test_total     ← where your test called it
    assert cart.total() == 20
  File "app/cart.py", line 14, in total                ← deeper call
    return sum(i.price for i in self.items)
AttributeError: 'dict' object has no attribute 'price' ← READ THIS FIRST
```

> Read the **last line** first (error type + message), then move up to find the first file that's yours.

### Common errors → likely cause

| Error | Usually means |
|---|---|
| `ModuleNotFoundError` | Package not installed in **this** env, or wrong interpreter selected |
| `ImportError: cannot import name` | Typo, circular import, or a local file shadowing a library |
| `NameError` | Variable used before it's defined, or a typo |
| `TypeError` | Wrong type or wrong number of arguments (`None` where a value was expected) |
| `AttributeError: 'NoneType'…` | A function returned `None` (e.g. a failed lookup) |
| `KeyError` | Dict key missing. Use `.get()` or check the data |
| `IndexError` | List index out of range |
| `IndentationError` | Mixed tabs/spaces or wrong indent level |
| `UnicodeDecodeError` | Add `encoding="utf-8"` when opening files |
| `fixture '<x>' not found` | Typo, or `conftest.py` not in a parent folder of the test |

### Logging (better than print in test frameworks)

```python
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

log.debug("raw payload: %s", payload)     # hidden at INFO level
log.info("Created user %s", user_id)
log.warning("Retrying request")
log.error("Login failed", exc_info=True)  # includes the traceback
```

```bash
pytest -o log_cli=true --log-cli-level=INFO    # show logs live during tests
```

### Environment checks

```bash
python -c "import sys; print(sys.executable)"   # which Python is running?
python -m pip show <pkg>                        # installed version + location
python -m pip list                              # everything installed in this env
python -m pip check                             # broken/conflicting dependencies
```

---

## 6. Undoing Mistakes and Recovering

| I want to… | Use this |
|---|---|
| Uninstall a package | `uv remove <pkg>` / `pip uninstall <pkg>` |
| Go back to a specific version | `uv add "<pkg>==<version>"` / `pip install "<pkg>==<version>"` |
| Rebuild a broken env ⚠️ | `deactivate`, delete `.venv`, then `uv sync` (or `python -m venv .venv` + `pip install -r requirements.txt`) |
| Undo a package I installed globally by accident | `python -m pip uninstall <pkg>` *outside* the venv (check with `pip list --user`) |
| Fix "works on my machine" | Reinstall from the lockfile: `uv sync` / `pip install -r requirements.txt` |
| Stop a hung script or test | `Ctrl+C` |
| Exit the REPL | `exit()` or `Ctrl+D` (Linux/macOS) / `Ctrl+Z` then Enter (Windows) |
| Escape the debugger | `q` |
| Reload an edited module in the REPL | `import importlib; importlib.reload(<module>)` |
| Clear stale pytest state | `pytest --cache-clear` |
| Clear stale bytecode | Delete `__pycache__` folders ⚠️ (safe, Python regenerates them) |
| Discard my changes to a file | `git restore <file>` ⚠️ loses uncommitted edits |
| Recover a list/dict I mutated in the REPL | There's no undo. Next time, `copy.deepcopy()` before experimenting |
| Temporarily disable a test | `@pytest.mark.skip(reason="<ticket>")`, not deleting or commenting it out |

---

## 7. Advanced but Useful Features

### Comprehensions

```python
squares = [n * n for n in range(5)]                    # list
evens = [n for n in nums if n % 2 == 0]                # with filter
by_id = {u["id"]: u for u in users}                    # dict
unique_domains = {e.split("@")[1] for e in emails}     # set
failed = [t.name for t in results if not t.passed]     # typical QA use
```

### Type hints (modern syntax)

```python
def find_user(user_id: int) -> dict | None:            # 3.10+ union syntax
    ...

names: list[str] = []                                  # built-in generics (3.9+)
config: dict[str, int] = {}
```

> Older code uses `from typing import List, Dict, Optional` (`Optional[dict]` means `dict | None`). Check hints with `mypy` or `pyright`. Python itself doesn't enforce them.

### Dataclasses (clean test data objects)

```python
from dataclasses import dataclass, field

@dataclass
class User:
    name: str
    email: str
    roles: list[str] = field(default_factory=list)      # safe mutable default
    active: bool = True

u = User("Ana", "ana@test.com")
print(u)                                               # User(name='Ana', ...)
u == User("Ana", "ana@test.com")                       # True (compares fields)
```

### Generators (lazy sequences)

```python
def read_big_log(path):
    with open(path, encoding="utf-8") as f:
        for line in f:
            if "ERROR" in line:
                yield line                             # one at a time, low memory

for err in read_big_log("app.log"):
    print(err)
```

### Decorators

```python
import functools, time

def retry(times: int = 3):
    def decorator(func):
        @functools.wraps(func)                         # keeps the original name/docs
        def wrapper(*args, **kwargs):
            for attempt in range(times):
                try:
                    return func(*args, **kwargs)
                except AssertionError:
                    if attempt == times - 1:
                        raise
                    time.sleep(1)
        return wrapper
    return decorator

@retry(times=3)
def check_status():
    assert get_status() == "ready"
```

### Context managers

```python
from contextlib import contextmanager

@contextmanager
def timer(label: str):
    start = time.perf_counter()
    yield                                              # the with-block runs here
    print(f"{label}: {time.perf_counter() - start:.2f}s")

with timer("checkout flow"):
    run_checkout()
```

### Handy standard library

| Module | Use it for |
|---|---|
| `pathlib` | Files and paths |
| `json`, `csv` | Test data |
| `datetime` | Dates, timestamps (`datetime.now()`, `timedelta`) |
| `re` | Regex: `re.search(r"\d{3}", text)` |
| `random`, `uuid` | Random/unique test data (`uuid.uuid4()`) |
| `os`, `os.environ` | Environment variables (`os.environ.get("BASE_URL")`) |
| `subprocess` | Run shell commands: `subprocess.run([...], check=True)` |
| `logging` | Structured logs |
| `collections` | `Counter`, `defaultdict` |
| `itertools` | `product` (combinations for test matrices), `chain` |
| `copy` | `deepcopy` nested data |
| `unittest.mock` | Mocks and patches |
| `time` | `sleep`, `perf_counter` |

```python
from itertools import product
for browser, lang in product(["chromium", "firefox"], ["en", "pt"]):
    print(browser, lang)                               # every combination → test matrix
```

### Async (you'll meet it in Playwright and httpx)

```python
import asyncio

async def fetch(n):
    await asyncio.sleep(1)                             # non-blocking wait
    return n

async def main():
    results = await asyncio.gather(fetch(1), fetch(2)) # run concurrently
    print(results)

asyncio.run(main())
```

> For tests, start with the **sync** APIs (`playwright.sync_api`, `requests`). Only switch to async if you really need it.

---

## 8. Real-World Workflows

### Recipe 1: Start a new test project

```bash
uv init qa-project && cd qa-project            # 1. create project
uv add --dev pytest pytest-cov ruff            # 2. add test tools
mkdir tests && touch tests/conftest.py         # 3. test folder + shared fixtures
uv run pytest                                  # 4. confirm it runs (0 tests)
git init && echo ".venv/" >> .gitignore        # 5. version control
```

### Recipe 2: Write and run your first test

1. Create `tests/test_math.py`:

   ```python
   def add(a: int, b: int) -> int:
       return a + b

   def test_add():
       assert add(2, 3) == 5
   ```

2. Run it: `uv run pytest -v`
3. Break it on purpose (`== 6`) and read the failure output. Then fix it.

### Recipe 3: API test with `requests`

```bash
uv add --dev requests
```

```python
# tests/test_api.py
import requests
import pytest

BASE_URL = "<https://api.example.com>"

@pytest.fixture(scope="session")
def session():
    s = requests.Session()                                     # reuse connections
    s.headers.update({"Authorization": "Bearer <token>"})
    yield s
    s.close()

def test_get_user(session):
    r = session.get(f"{BASE_URL}/users/1", timeout=10)         # ⚠️ always set a timeout
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == 1
    assert "email" in body

def test_create_user(session):
    payload = {"name": "Ana", "email": "ana@test.com"}
    r = session.post(f"{BASE_URL}/users", json=payload, timeout=10)
    assert r.status_code == 201
    assert r.json()["name"] == payload["name"]

def test_unauthorized():
    r = requests.get(f"{BASE_URL}/users/1", timeout=10)        # no token
    assert r.status_code in (401, 403)
```

> Check status code, then schema/keys, then values. Also test the negative paths (401, 404, 422 with bad payloads).

### Recipe 4: Data-driven tests from a JSON file

```python
# tests/data/login_cases.json → [{"user": "admin", "pwd": "ok", "expected": true}, ...]
import json
from pathlib import Path
import pytest

CASES = json.loads((Path(__file__).parent / "data" / "login_cases.json").read_text())

@pytest.mark.parametrize("case", CASES, ids=lambda c: c["user"])
def test_login(case):
    assert login(case["user"], case["pwd"]) is case["expected"]
```

### Recipe 5: Browser UI test with Playwright

```bash
uv add --dev pytest-playwright                 # 1. install the plugin
uv run playwright install chromium             # 2. download a browser
```

```python
# tests/test_ui_login.py
from playwright.sync_api import Page, expect

def test_login_success(page: Page):                        # page fixture comes from the plugin
    page.goto("<https://app.example.com/login>")
    page.get_by_label("Email").fill("<email>")
    page.get_by_label("Password").fill("<password>")
    page.get_by_role("button", name="Log in").click()
    expect(page.get_by_text("Welcome")).to_be_visible()    # auto-waits, no sleep()
```

```bash
uv run pytest --headed                         # watch the browser
uv run pytest --browser firefox                # another browser
uv run pytest --tracing retain-on-failure      # save trace for failed tests
uv run playwright show-trace <trace.zip>       # replay step by step
uv run playwright codegen <url>                # record clicks → generates code
```

> Prefer user-facing locators: `get_by_role`, `get_by_label`, `get_by_text`, `get_by_test_id`. CSS/XPath selectors break more easily.

### Recipe 6: Page Object Model (keep UI tests maintainable)

```python
# pages/login_page.py
from playwright.sync_api import Page

class LoginPage:
    def __init__(self, page: Page):
        self.page = page
        self.email = page.get_by_label("Email")
        self.password = page.get_by_label("Password")
        self.submit = page.get_by_role("button", name="Log in")

    def open(self):
        self.page.goto("<base_url>/login")

    def login(self, email: str, pwd: str):
        self.email.fill(email)
        self.password.fill(pwd)
        self.submit.click()

# tests/test_login.py
def test_login(page):
    lp = LoginPage(page)
    lp.open()
    lp.login("<email>", "<password>")
    expect(page).to_have_url("<base_url>/dashboard")
```

### Recipe 7: Debug a failing test

1. Rerun only the failure with detail: `pytest --lf -vv`
2. Read the last line of the traceback, then find the first frame that's in your code.
3. Add `breakpoint()` just before the failing line, or run `pytest --lf --pdb`.
4. Inspect with `p <var>`, step with `n`/`s`.
5. If it fails only sometimes, run it many times: `pytest <test> --count=20` (needs `pytest-repeat`) or `-p no:randomly` to rule out order effects.
6. Fix it, then run the full suite to check nothing else broke.

### Recipe 8: Reports for CI / sharing

```bash
pytest --junitxml=reports/junit.xml                    # CI tools read this
pytest --html=reports/report.html --self-contained-html   # needs pytest-html
pytest --cov=src --cov-report=term-missing             # coverage + missed lines
pytest --cov=src --cov-report=html                     # browsable htmlcov/index.html
```

### Recipe 9: Minimal GitHub Actions CI

```yaml
# .github/workflows/tests.yml
name: tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v6
      - run: uv sync
      - run: uv run pytest --junitxml=junit.xml
```

---

## 9. Shortcuts, Aliases and Config

### pytest config in `pyproject.toml`

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]                          # where to look
addopts = "-ra --strict-markers --tb=short"    # default flags
markers = [
    "smoke: quick critical-path checks",
    "regression: full regression suite",
    "slow: takes > 5s",
]
log_cli_level = "INFO"
```

### A starter `conftest.py`

```python
# tests/conftest.py
import os
import pytest

@pytest.fixture(scope="session")
def base_url() -> str:
    return os.environ.get("BASE_URL", "http://localhost:8000")   # override per environment

def pytest_addoption(parser):                                    # custom CLI flag
    parser.addoption("--env", default="staging")

@pytest.fixture(scope="session")
def env(request) -> str:
    return request.config.getoption("--env")                     # pytest --env prod
```

### Ruff (linter + formatter)

```toml
[tool.ruff]
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "B"]          # errors, pyflakes, import sorting, bugbear
```

```bash
uv run ruff check . --fix              # lint + auto-fix
uv run ruff format .                   # format (Black-compatible)
```

### Shell aliases (`~/.bashrc` / `~/.zshrc`)

```bash
alias va="source .venv/bin/activate"   # activate env
alias pt="uv run pytest"               # run tests
alias ptf="uv run pytest --lf -vv"     # rerun failures with detail
alias pts="uv run pytest -m smoke"     # smoke suite
```

### REPL tricks

| Shortcut | Does |
|---|---|
| `_` | Last result |
| `Tab` | Autocomplete |
| `↑` / `↓` | History |
| `help(<obj>)` | Docs |
| `python -i script.py` | Run script, then stay in the REPL with its variables |
| `python -m http.server` | Instant local web server (handy for test pages) |
| `python -m json.tool <file.json>` | Pretty-print/validate JSON |

### `.gitignore` essentials

```
.venv/
__pycache__/
.pytest_cache/
.coverage
htmlcov/
reports/
.env
```

> ⚠️ Never commit `.env` files, tokens or passwords. Load secrets with `os.environ` or `python-dotenv`.

---

## 10. Common Pitfalls

| Pitfall | Problem | Fix |
|---|---|---|
| Mutable default argument `def f(x=[])` | The same list is shared across every call | `def f(x=None): x = x or []`, or `field(default_factory=list)` |
| `is` vs `==` | `is` checks identity, not value | Use `==` for values. Use `is` only with `None`, `True`, `False` |
| Copying with `b = a` | Both names point to the same list/dict | `a.copy()` (shallow) or `copy.deepcopy(a)` (nested) |
| Float math | `0.1 + 0.2 != 0.3` | `pytest.approx`, `math.isclose`, or `decimal.Decimal` for money |
| Changing a list while looping over it | Skips items | Loop over a copy (`for x in items[:]`) or build a new list |
| Naming your file `requests.py`, `pytest.py`, `json.py` | Shadows the real library → strange `ImportError`s | Rename the file and delete `__pycache__` |
| Wrong interpreter in the editor | "Installed but `ModuleNotFoundError`" | Select the `.venv` interpreter. Check `sys.executable` |
| Bare `except:` | Swallows every error, even Ctrl+C, and hides bugs | Catch specific exceptions |
| `time.sleep()` in UI tests | Slow and flaky | Use Playwright auto-waiting / `expect(...)` |
| Tests that depend on each other | Pass alone, fail together (or the reverse) | Each test sets up its own data via fixtures |
| Missing `timeout=` in `requests` | A test can hang forever | Always pass `timeout=<seconds>` |
| `assert (a, "msg")` | A non-empty tuple is always True, so this never fails | `assert a, "msg"` (no parentheses) |
| Patching the wrong place | The mock isn't used | Patch where the name is *looked up*: `app.module.requests`, not `requests` |
| Late binding in loops: `[lambda: i for i in range(3)]` | All lambdas return 2 | `lambda i=i: i` |
| Mixing tabs and spaces | `IndentationError` | Configure the editor to use 4 spaces |
| Hardcoded URLs/credentials | Can't switch environments, and secrets leak | Env vars + fixtures (`base_url`) |
| Using `--reruns` to hide flaky tests | Real bugs get masked | Rerun to *diagnose*, then fix the root cause |

---

## 11. Glossary

| Term | Meaning |
|---|---|
| Interpreter | The program (`python`) that executes your code |
| REPL | Interactive prompt (`>>>`): Read, Eval, Print, Loop |
| Module | A single `.py` file you can import |
| Package | A folder of modules (usually with `__init__.py`); also an installable library |
| PyPI | Python Package Index, where `pip`/`uv` download packages from |
| pip | The standard package installer |
| uv | A fast modern tool for Python versions, envs, and dependencies |
| Virtual environment (venv) | An isolated folder with its own Python and packages, one per project |
| `pyproject.toml` | Modern project config: metadata, deps, tool settings |
| Lockfile | A file pinning exact dependency versions (`uv.lock`) for reproducible installs |
| `site-packages` | The folder inside an env where installed libraries live |
| Dunder | "Double underscore" names like `__init__`, `__name__`, `__repr__` |
| f-string | `f"..."` string with `{expressions}` inside |
| Mutable / immutable | Can / can't be changed in place (list vs tuple) |
| Iterable | Anything you can loop over |
| Generator | A function using `yield` that produces values lazily |
| Decorator | `@something` that wraps a function to add behavior |
| Context manager | An object used with `with` that handles setup/cleanup |
| Type hint | An optional annotation like `x: int`, not enforced at runtime |
| Exception | An error object raised at runtime and caught with `try/except` |
| Traceback | The error report showing the chain of calls that led to an exception |
| PEP 8 | The official Python style guide |
| Linter / formatter | Tools that find problems / auto-format code (Ruff, Black) |
| Test runner | A tool that discovers and runs tests (pytest, unittest) |
| Assertion | A check that must be true (`assert x == y`), otherwise the test fails |
| Fixture | Reusable setup/teardown injected into tests by argument name |
| `conftest.py` | pytest file for shared fixtures/hooks, auto-loaded |
| Parametrize | Running one test with many input sets |
| Marker | A tag on a test (`@pytest.mark.smoke`) used to select or skip |
| Mock / stub | A fake object replacing a real dependency (API, DB) in a test |
| Monkeypatch | Temporarily replacing an attribute or env var during a test |
| Coverage | % of code lines executed by your tests |
| Flaky test | A test that passes and fails without any code change |
| Page Object Model (POM) | A pattern that wraps each UI page in a class of locators and actions |
| Locator | How a UI test finds an element (role, label, test id, CSS) |
| Headless | A browser running without a visible window |
| CI | Continuous Integration: automatically running tests on every push/PR |
| JUnit XML | Standard test-result format that CI tools read |
