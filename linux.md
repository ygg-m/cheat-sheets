# Linux Cheat Sheet for QA Testers

A practical command-line reference, from setup and daily commands to log digging, debugging and test workflows, written for software QA.

## Table of Contents

1. [Setup and Configuration](#1-setup-and-configuration)
2. [Core Concepts](#2-core-concepts)
3. [Everyday Commands](#3-everyday-commands)
4. [Inspecting, Debugging, Troubleshooting](#4-inspecting-debugging-troubleshooting)
5. [Undoing Mistakes and Recovering](#5-undoing-mistakes-and-recovering)
6. [Advanced but Useful Features](#6-advanced-but-useful-features)
7. [Real-World QA Workflows](#7-real-world-qa-workflows)
8. [Shortcuts, Aliases and Config](#8-shortcuts-aliases-and-config)
9. [Common Pitfalls](#9-common-pitfalls)
10. [Glossary](#10-glossary)

---

## 1. Setup and Configuration

### Ways to get a Linux environment

| Option | Good for | Notes |
|---|---|---|
| **WSL2** (Windows) | Quick start without leaving Windows | `wsl --install` in an admin PowerShell (Ubuntu by default) |
| **Virtual machine** (VirtualBox, VMware, GNOME Boxes) | Safe sandbox you can break | Take a **snapshot** before experimenting |
| **Docker container** | Disposable, reproducible test environments | `docker run -it --rm ubuntu bash` |
| **Dual boot / bare metal** | Daily driver, full performance | Back up first; partitioning is risky ⚠️ |
| **Cloud VM** (AWS, GCP, Azure) | Practising on real "servers" | Access through SSH |

> Most QA jobs use Linux through **SSH to test servers**, **Docker**, and **CI runners**, not a Linux desktop. Get comfortable in the terminal first.

### Package managers by distro family

| Task | Debian / Ubuntu (`apt`) | Fedora / RHEL (`dnf`) | Arch (`pacman`) |
|---|---|---|---|
| Refresh and upgrade everything | `sudo apt update && sudo apt upgrade` | `sudo dnf upgrade` | `sudo pacman -Syu` |
| Install | `sudo apt install <pkg>` | `sudo dnf install <pkg>` | `sudo pacman -S <pkg>` |
| Remove | `sudo apt remove <pkg>` | `sudo dnf remove <pkg>` | `sudo pacman -Rns <pkg>` |
| Search | `apt search <term>` | `dnf search <term>` | `pacman -Ss <term>` |
| Package info | `apt show <pkg>` | `dnf info <pkg>` | `pacman -Si <pkg>` |
| List installed | `apt list --installed` | `dnf list installed` | `pacman -Q` |
| Which package owns a file | `dpkg -S <file>` | `rpm -qf <file>` | `pacman -Qo <file>` |
| Clean cache | `sudo apt autoremove && sudo apt clean` | `sudo dnf clean all` | `sudo pacman -Sc` |

> `apt` is the modern front end. Older tutorials use `apt-get` / `apt-cache`, which do the same jobs.
> On Arch, avoid partial upgrades: always `-Syu`, never just `-Sy <pkg>`.

### First-time setup (Ubuntu example)

```bash
sudo apt update && sudo apt upgrade -y                # bring the system up to date
sudo apt install -y git curl wget jq tree htop tmux   # core tools
sudo apt install -y ripgrep fd-find shellcheck        # fast search + bash linter
sudo apt install -y python3 python3-venv python3-pip  # Python for pytest/scripts
git config --global user.name "<Your Name>"           # identity for commits
git config --global user.email "<you@example.com>"
ssh-keygen -t ed25519 -C "<you@example.com>"          # create an SSH key
cat ~/.ssh/id_ed25519.pub                             # public key to paste into GitHub/servers
```

> On Ubuntu `fd` is installed as `fdfind`. Add `alias fd=fdfind` if you want the short name.

### QA toolbox

| Tool | What it's for in QA |
|---|---|
| `curl` | Send HTTP requests, test APIs, check status codes and timings |
| `jq` | Read, filter and compare JSON responses |
| `git` | Pull test repos, check out branches under test |
| `python3` + `venv` | pytest, Robot Framework, helper scripts |
| `node` / `npm` (via `nvm`) | Playwright, Cypress, Jest |
| `docker` / `docker compose` | Throwaway environments, services under test |
| `htop` | Watch CPU and memory while testing |
| `ripgrep` (`rg`) | Very fast search through code and logs |
| `tmux` | Several terminals in one; sessions that survive SSH drops |
| `shellcheck` | Catch bugs in your bash scripts |

### Shell config files

| File | Loaded when | Put here |
|---|---|---|
| `~/.bashrc` | Every new interactive bash shell | Aliases, functions, prompt, history settings |
| `~/.profile` or `~/.bash_profile` | Login shells (SSH, TTY login) | Environment variables such as `PATH` |
| `~/.zshrc` | Every interactive zsh shell | Same as `.bashrc`, for zsh users |
| `/etc/environment` | System-wide, all users | Global variables (needs `sudo`) |

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc  # add a folder to PATH
source ~/.bashrc                                          # reload without reopening the terminal
echo "$SHELL"                                             # which shell you're using
```

---

## 2. Core Concepts

### How the pieces connect

```text
  +----------------------------------------------------------+
  |  You: type a command                                     |
  +----------------------------+-----------------------------+
                               |
  +----------------------------v-----------------------------+
  |  Terminal emulator (GNOME Terminal, Konsole, WSL window) |
  +----------------------------+-----------------------------+
                               |
  +----------------------------v-----------------------------+
  |  Shell (bash / zsh): expands *, $VAR, ~ then runs it     |
  +-------------+------------------------------+-------------+
                |  builtins (cd, export)       |  starts programs
                |  run inside the shell        v
                |               +--------------------------------+
                |               | Processes: ls, grep, python,   |
                |               | your app under test            |
                |               +---------------+----------------+
                |                               |  system calls
  +-------------v-------------------------------v--------------+
  |  Kernel: processes, memory, files, network, devices        |
  +----------------------------+-------------------------------+
                               |
  +----------------------------v-------------------------------+
  |  Hardware: CPU, RAM, disk, network card                    |
  +------------------------------------------------------------+
```

### Streams, pipes and exit codes

```text
                stdin (0)                 stdout (1)
  keyboard/file ---------> [ command ] ---------> terminal / file / next command
                               |
                               +---- stderr (2) ----> terminal (errors, warnings)

  cmd1 | cmd2 | cmd3     stdout of each command feeds stdin of the next
  echo $?                exit code of the last command: 0 = success, anything else = failure
```

> **Exit codes are what CI uses to decide pass or fail.** A test runner that exits `0` means green, whatever it printed.

### Key ideas

- **Everything is a file**: documents, folders, devices (`/dev/sda`), even running processes (`/proc/<pid>`).
- **Case-sensitive**: `Report.txt` and `report.txt` are different files.
- **Extensions are optional**: a file is executable because of its permissions, not its name.
- **Paths**: absolute `/home/<user>/app`, relative `./app`, `~` = your home, `.` = here, `..` = parent.
- **Users**: you work as a normal user; `root` is the admin; `sudo` runs one command as root.

### Filesystem layout

| Path | Contains |
|---|---|
| `/` | Root of the whole tree (no drive letters) |
| `/home/<user>` | Your files and dotfiles (`~`) |
| `/etc` | System and app configuration |
| `/var/log` | Log files (check here when something breaks) |
| `/tmp` | Temporary files, often wiped on reboot |
| `/usr/bin`, `/usr/local/bin` | Installed programs |
| `/opt` | Third-party apps installed manually |
| `/proc`, `/sys` | Live kernel and process info (virtual) |
| `/dev` | Devices |
| `/mnt`, `/media` | Mounted drives (WSL: `/mnt/c` = Windows C:) |
| `/root` | Root user's home |

### Permissions

```text
-rwxr-xr--  1  qa  testers  4096  Nov 27 10:00  run_tests.sh
| |  |  |      |    |
| |  |  |      |    +-- group owner
| |  |  |      +------- user owner
| |  |  +-- others: r--  read only
| |  +----- group:  r-x  read + execute
| +-------- owner:  rwx  read + write + execute
+---------- type:   - file, d directory, l symlink
```

| Letter | Value | On a file | On a directory |
|---|---|---|---|
| `r` | 4 | Read contents | List entries (`ls`) |
| `w` | 2 | Modify | Create, delete, rename entries |
| `x` | 1 | Run as a program | Enter it (`cd`) |

| Mode | Meaning | Typical use |
|---|---|---|
| `755` | rwx r-x r-x | Scripts, directories |
| `644` | rw- r-- r-- | Normal files |
| `600` | rw- --- --- | Private keys, secrets |
| `700` | rwx --- --- | Private directories (`~/.ssh`) |

### Processes and signals

| Signal | Number | Sent by | Effect |
|---|---|---|---|
| `SIGINT` | 2 | `Ctrl+C` | Ask the foreground program to stop |
| `SIGTERM` | 15 | `kill <pid>` (default) | Polite stop; app can clean up |
| `SIGKILL` | 9 | `kill -9 <pid>` | Immediate kill; no cleanup ⚠️ |
| `SIGHUP` | 1 | Closing the terminal | Often "reload config" for daemons |
| `SIGTSTP` | 20 | `Ctrl+Z` | Pause; resume with `fg` / `bg` |
| `SIGSTOP` / `SIGCONT` | 19 / 18 | `kill -STOP` / `kill -CONT` | Freeze / unfreeze (handy to simulate a hung service) |

---

## 3. Everyday Commands

### Navigation

```bash
pwd        # where am I?
ls -lah    # long list, include hidden files, human-readable sizes
ls -lt     # sort by modification time, newest first
cd <dir>   # go into a directory
cd         # go home (same as cd ~)
cd -       # go back to the previous directory
cd ..      # up one level
tree -L 2  # show folder tree, 2 levels deep
```

### Files and directories

```bash
touch <file>               # create empty file / update timestamp
mkdir -p <a/b/c>           # create nested dirs, no error if they exist
cp <src> <dest>            # copy a file
cp -r <srcdir> <destdir>   # copy a directory recursively
mv <old> <new>             # move or rename
rm <file>                  # delete a file ⚠️ no trash bin
rm -r <dir>                # delete a directory and everything inside ⚠️
rmdir <dir>                # delete only if empty (safe)
ln -s <target> <linkname>  # create a symbolic link (shortcut)
file <file>                # detect what kind of file it really is
stat <file>                # size, permissions, timestamps
```

> ⚠️ `rm` is permanent. Use `rm -i` (asks first) or install `trash-cli` (`trash <file>`) while you're learning.

### Viewing files

```bash
cat <file>               # print whole file
less <file>              # scroll through a file (best for big logs)
head -n 20 <file>        # first 20 lines
tail -n 50 <file>        # last 50 lines
tail -f <file>           # follow a file live as it grows (logs!)
wc -l <file>             # count lines
diff -u <file1> <file2>  # show differences (unified format)
```

| `less` key | Action |
|---|---|
| `/<text>` then `n` / `N` | Search forward, next / previous match |
| `g` / `G` | Go to top / bottom |
| `F` | Follow mode, like `tail -f` (`Ctrl+C` to stop) |
| `-N` | Toggle line numbers |
| `q` | Quit |

### Searching

```bash
grep "<text>" <file>                 # lines containing text
grep -rn "<text>" <dir>              # recursive, with line numbers
grep -i "<text>" <file>              # case-insensitive
grep -v "<text>" <file>              # lines NOT matching
grep -c "<text>" <file>              # count matching lines
grep -E "error|fail|timeout" <file>  # extended regex, several patterns
grep -C 3 "<text>" <file>            # 3 lines of context around each match (-A after, -B before)
rg "<text>"                          # ripgrep: faster, recursive, respects .gitignore
find . -name "*.log"                 # find files by name
find . -type f -mmin -30             # files modified in the last 30 minutes
find . -size +100M                   # files larger than 100 MB
type <cmd>                           # what a command is (alias, builtin, file)
which <cmd>                          # path of the program that will run
```

### Redirection and pipes

| Syntax | Meaning |
|---|---|
| `cmd > file` | Send stdout to file, **overwriting** it ⚠️ |
| `cmd >> file` | Append stdout to file |
| `cmd 2> file` | Send stderr (errors) to file |
| `cmd &> file` | Send stdout and stderr to file (bash). Older form: `cmd > file 2>&1` |
| `cmd 2>/dev/null` | Throw errors away |
| `cmd < file` | Use file as input |
| `cmd1 \| cmd2` | Pipe output of cmd1 into cmd2 |
| `cmd \| tee file` | Show output **and** save it (great for test runs) |
| `cmd1 && cmd2` | Run cmd2 only if cmd1 succeeded |
| `cmd1 \|\| cmd2` | Run cmd2 only if cmd1 failed |
| `cmd1 ; cmd2` | Run both regardless |
| `$(cmd)` | Insert the output of cmd (older form: backticks `` `cmd` ``) |

### Permissions and ownership

```bash
chmod +x <script.sh>              # make a script executable
chmod 644 <file>                  # set exact permissions
chmod -R u+rwX <dir>              # recursive; X = execute only on dirs
sudo chown <user>:<group> <file>  # change owner
whoami                            # current user
id                                # user id, groups
sudo <cmd>                        # run one command as root
sudo -i                           # open a root shell ⚠️ exit as soon as you're done
```

### Processes and jobs

```bash
ps aux                        # all processes
pgrep -a <name>               # find processes by name, with full command
htop                          # interactive monitor (top is the built-in fallback)
kill <pid>                    # ask a process to stop (SIGTERM)
kill -9 <pid>                 # force kill ⚠️ last resort
pkill -f "<pattern>"          # kill by matching the full command line
<cmd> &                       # run in background
jobs                          # list background jobs in this shell
fg %1                         # bring job 1 to the foreground
bg %1                         # resume a paused job in the background
nohup <cmd> > out.log 2>&1 &  # keep running after you log out
time <cmd>                    # how long a command takes
```

### System info

```bash
cat /etc/os-release  # distro and version (put this in bug reports)
uname -r             # kernel version
hostnamectl          # hostname, OS, architecture
uptime               # time since boot + load average
df -h                # disk space per filesystem
du -sh *             # size of each item in current dir
free -h              # memory usage
nproc                # number of CPU cores
lsblk                # disks and partitions
```

### Networking basics

```bash
ip a                 # network interfaces and IPs (old: ifconfig)
ip r                 # routing table / default gateway
ping -c 4 <host>     # is the host reachable? (4 packets)
curl -I <url>        # fetch only HTTP response headers
wget <url>           # download a file
ss -tulpn            # listening ports and which process owns them (old: netstat -tulpn)
dig +short <domain>  # DNS lookup (old: nslookup)
hostname -I          # this machine's IP addresses
```

### Archives

```bash
tar -czf <archive.tar.gz> <dir>     # create gzip archive
tar -xzf <archive.tar.gz>           # extract
tar -xzf <archive.tar.gz> -C <dir>  # extract into a specific dir
tar -tzf <archive.tar.gz>           # list contents without extracting
zip -r <archive.zip> <dir>          # create zip
unzip <archive.zip>                 # extract zip
```

| `tar` flag | Meaning |
|---|---|
| `-c` / `-x` / `-t` | Create / extract / list |
| `-z` / `-j` / `-J` | gzip / bzip2 / xz compression |
| `-f <file>` | Archive file name (always last of the flags) |
| `-v` | Verbose: show each file |

### Getting help

```bash
man <cmd>          # full manual (q to quit, / to search)
<cmd> --help       # short usage summary
tldr <cmd>         # community examples (install: tldr)
help <builtin>     # help for shell builtins like cd, export
apropos <keyword>  # search manuals by keyword
```

---

## 4. Inspecting, Debugging, Troubleshooting

### Logs

```bash
journalctl -u <service>                       # logs for one systemd service
journalctl -u <service> -f                    # follow live
journalctl -u <service> --since "15 min ago"  # recent window
journalctl -u <service> --since "2026-11-27 10:00" --until "2026-11-27 10:30"
journalctl -p err -b                          # errors and worse since last boot
journalctl -k                                 # kernel messages
sudo dmesg -T | tail -n 30                    # kernel ring buffer with readable times
ls -lt /var/log/                              # classic log files, newest first
sudo tail -f /var/log/syslog                  # Ubuntu/Debian (RHEL: /var/log/messages)
```

> When reporting a bug, add the **exact time window**, the **service name**, and the relevant log lines, not the whole log.

### Services (systemd)

```bash
systemctl status <service>             # running? last log lines? exit code?
sudo systemctl start|stop|restart <service>
sudo systemctl enable --now <service>  # start now and at every boot
systemctl is-active <service>          # prints active/inactive (scriptable)
systemctl list-units --failed          # everything that failed
systemctl cat <service>                # show the unit file (how it's started)
```

> Older tutorials use `service <name> status`. It still works on most systems but just calls systemd.

### Network and HTTP

```bash
ss -tulpn | grep :<port>  # who is listening on this port?
sudo lsof -i :<port>      # same, alternative view
curl -v <url>             # full request/response, TLS and headers
curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" <url>  # status + total time
curl -w "dns:%{time_namelookup} connect:%{time_connect} ttfb:%{time_starttransfer}\n" -o /dev/null -s <url>
nc -zv <host> <port>      # is a TCP port open?
dig <domain>              # DNS details
cat /etc/hosts            # local hostname overrides
mtr <host>                # live traceroute (where is the network slow?)
```

### Processes and resources

```bash
htop                                     # CPU / memory per process (F6 to sort)
ps aux --sort=-%mem | head               # top memory users
ps aux --sort=-%cpu | head               # top CPU users
vmstat 1                                 # system stats every second
free -h                                  # RAM and swap
df -h                                    # disk space
df -i                                    # inodes (can run out even with free space)
du -h --max-depth=1 <dir> | sort -h      # what's eating disk space
lsof -p <pid>                            # files and sockets a process has open
strace -f -e trace=openat,connect <cmd>  # which files/hosts a program tries to reach
```

> `strace` is great for "it fails with no useful message": you'll often see the exact missing file or refused connection.

### Debugging commands and scripts

```bash
echo $?                 # exit code of the last command
bash -x <script.sh>     # print each line as it runs
set -x  /  set +x       # turn tracing on/off inside a script
type -a <cmd>           # all definitions (alias? function? which binary?)
env | sort              # all environment variables
printenv <VAR>          # one variable
ldd <binary>            # shared libraries (finds "library not found" issues)
shellcheck <script.sh>  # static analysis for bash scripts
```

### Symptom → what to check

| Symptom | Check first |
|---|---|
| `command not found` | Installed? `type <cmd>`, `echo $PATH`, typo, venv not activated |
| `Permission denied` | `ls -l`, `chmod +x`, wrong owner, need `sudo`? |
| `Address already in use` | `ss -tulpn \| grep :<port>`, then stop the old process |
| `Connection refused` | Nothing listening on that port: service down or wrong port |
| Connection **timeout** | Firewall, wrong host/IP, network route |
| `No space left on device` | `df -h`, `df -i`, `du`, old logs, Docker images |
| App killed randomly | `dmesg -T \| grep -i oom` (out-of-memory killer) |
| Works locally, fails in CI | Env vars, file paths/case, timezone, missing deps, CRLF line endings |
| Hostname doesn't resolve | `dig`, `/etc/hosts`, `/etc/resolv.conf` |
| Everything is slow | `htop`, `vmstat 1`, `df -h`, `free -h` |

---

## 5. Undoing Mistakes and Recovering

| I want to… / I just… | Do this |
|---|---|
| Stop a running command | `Ctrl+C` |
| Unfreeze a frozen terminal (pressed `Ctrl+S`) | `Ctrl+Q` |
| Fix a garbled terminal (after `cat` on a binary) | Type `reset` and Enter |
| Get out of `vim` | `Esc` then `:q!` (quit without saving) or `:wq` (save) |
| Get out of `nano` | `Ctrl+X` (it asks whether to save) |
| Get out of `less` / `man` | `q` |
| Kill a process that ignores `Ctrl+C` | `Ctrl+Z`, then `kill %1`; if stuck, `kill -9 %1` |
| Undo `rm` | No trash. Check `git restore <file>`, backups or VM snapshots. Stop writing to that disk. |
| Undo overwrite with `>` | Same as above. Prevent with `set -o noclobber` |
| Undo a bad `chmod -R` | `find <dir> -type d -exec chmod 755 {} +` then `find <dir> -type f -exec chmod 644 {} +` |
| Undo a bad `chown` in home | `sudo chown -R "$USER":"$USER" ~` |
| Broke `~/.bashrc` (shell errors on start) | Run `bash --norc`, fix the file, or restore `~/.bashrc.bak` |
| Broke a file in `/etc` | `sudo cp <file>.bak <file>` (always back up first: `sudo cp <file>{,.bak}`) |
| A package upgrade broke something | apt: `sudo apt install <pkg>=<version>`; dnf: `sudo dnf history undo last`; pacman: `sudo pacman -U /var/cache/pacman/pkg/<pkg-old>.pkg.tar.zst` |
| Disk full | `sudo journalctl --vacuum-size=200M`, clean `/tmp`, `docker system prune` ⚠️ removes stopped containers and unused images |
| SSH dropped and killed my long job | Prevention: run it inside `tmux` and use `tmux attach` after reconnecting |
| Forgot what I ran | `history \| grep <word>` or `Ctrl+R` |
| VM experiment went badly | Restore the snapshot |

> Safety habits: `cp <file>{,.bak}` before editing configs, `alias rm='rm -i'`, `set -o noclobber`, and VM snapshots before risky changes.

---

## 6. Advanced but Useful Features

### Text-processing toolkit

| Tool | Use it to… | Example |
|---|---|---|
| `cut` | Take columns by delimiter | `cut -d',' -f2 users.csv` |
| `sort` | Sort lines (`-n` numeric, `-r` reverse, `-h` human sizes) | `sort -t',' -k3 -n data.csv` |
| `uniq` | Collapse duplicate adjacent lines (`-c` counts) | `sort \| uniq -c` |
| `awk` | Columns, filters, quick math | `awk '{print $1}' access.log` |
| `sed` | Find and replace in a stream | `sed 's/staging/prod/g' cfg` |
| `tr` | Translate or delete characters | `tr -d '\r' < win.txt > unix.txt` |
| `xargs` | Turn input lines into arguments | `cat ids.txt \| xargs -I{} curl -s <url>/{}` |
| `column` | Align text into a table | `column -t -s',' data.csv` |

```bash
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head  # top 10 client IPs
awk '$9 >= 500' access.log                        # HTTP 5xx lines (status in column 9)
awk -F',' '{sum += $3} END {print sum}' data.csv  # sum column 3 of a CSV
sed -n '100,150p' app.log                         # print only lines 100-150
sed -i.bak 's/localhost/127.0.0.1/g' config.ini   # edit in place, keep a .bak ⚠️
```

### JSON with `jq`

```bash
curl -s <url> | jq .                  # pretty-print
jq '.data | length' response.json     # count items
jq '.users[] | .email' response.json  # one field from each item
jq -r '.token' login.json             # raw string (no quotes), good for variables
jq '.results[] | select(.status == "failed")' r.json # filter objects
jq '{id, name}' user.json             # keep only some keys
jq -S . a.json > a.sorted.json        # sort keys (for stable diffs)
```

### `find` with actions

```bash
find . -name "*.tmp" -print                      # 1) look first
find . -name "*.tmp" -delete                     # 2) then delete ⚠️
find . -name "*.log" -exec grep -l "ERROR" {} +  # which log files contain ERROR
find . -name "*.py" -print0 | xargs -0 wc -l     # count lines safely (handles spaces)
```

### Environment variables

```bash
export BASE_URL="https://staging.example.com"  # set for this shell and child processes
echo "$BASE_URL"                               # read it
BASE_URL=http://localhost:3000 pytest          # set only for one command
unset BASE_URL                                 # remove it
set -a; source .env; set +a                    # load every KEY=value from a .env file
```

### Bash scripting essentials

```bash
#!/usr/bin/env bash
set -euo pipefail                       # exit on error, on unset vars, on failed pipes

BASE_URL="${1:-http://localhost:8080}"  # first argument, or a default
fails=0

check() {
  local path="$1" expected="$2" code
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL$path")
  if [[ "$code" == "$expected" ]]; then
    echo "PASS $path -> $code"
  else
    echo "FAIL $path -> $code (expected $expected)" >&2
    return 1
  fi
}

check /health 200   || fails=$((fails + 1))
check /no-such 404  || fails=$((fails + 1))

echo "Failures: $fails"
exit $(( fails > 0 ))                   # non-zero exit = CI marks the job failed
```

| Syntax | Meaning |
|---|---|
| `"$var"` | Always quote variables (spaces in values won't break things) |
| `'text'` | Literal, no expansion; `"text"` expands `$var` and `$(cmd)` |
| `$1 $2`, `$@`, `$#` | Arguments, all arguments, number of arguments |
| `$?` | Exit code of the last command |
| `${var:-default}` | Use default if unset or empty |
| `${var:?msg}` | Abort with msg if unset or empty (protects `rm`) |
| `[[ -f f ]]` / `[[ -d d ]]` | File exists / directory exists |
| `[[ -z $s ]]` / `[[ -n $s ]]` | String empty / not empty |
| `[[ $a -eq $b ]]` | Numeric compare (`-ne -lt -le -gt -ge`) |
| `$(( a + b ))` | Integer math |

```bash
for f in *.log; do echo "== $f"; grep -c ERROR "$f"; done  # loop over files
while IFS= read -r line; do echo "id: $line"; done < ids.txt # loop over lines of a file
for i in {1..5}; do echo "run $i"; done                    # numeric range
```

> Old tutorials use `[ ]` (single brackets) and backticks. In bash, prefer `[[ ]]` and `$( )`.

### SSH and file transfer

```bash
ssh <user>@<host>                                  # log in
ssh -i ~/.ssh/<key> <user>@<host>                  # log in with a specific key
ssh <user>@<host> 'df -h && uptime'                # run a command remotely, no shell
ssh-copy-id <user>@<host>                          # install your key (no more passwords)
scp <file> <user>@<host>:/tmp/                     # copy a file up
scp <user>@<host>:/var/log/<app>.log .             # copy a file down
rsync -avz --progress <dir>/ <user>@<host>:<dir>/  # sync folders (resumable, only changes)
ssh -L 5433:localhost:5432 <user>@<host>           # tunnel: local port 5433 -> remote DB 5432
```

`~/.ssh/config` saves typing (`ssh staging` instead of the full command):

```sshconfig
Host staging                        # short name you type
    HostName <staging.example.com>  # real host or IP
    User <user>                     # remote username
    IdentityFile ~/.ssh/id_ed25519  # key to use
```

### `tmux` (persistent terminal sessions)

| Action | Command / keys |
|---|---|
| New named session | `tmux new -s <name>` |
| Detach (leave it running) | `Ctrl+b` then `d` |
| List / reattach | `tmux ls` / `tmux attach -t <name>` |
| Split vertical / horizontal | `Ctrl+b` `%` / `Ctrl+b` `"` |
| Move between panes | `Ctrl+b` + arrow key |
| New window / next window | `Ctrl+b` `c` / `Ctrl+b` `n` |
| Scroll back | `Ctrl+b` `[` (then arrows, `q` to exit) |

> Classic QA layout: left pane runs the app, right pane tails the logs, bottom pane runs tests.

### Scheduling with cron

```bash
crontab -e  # edit your scheduled jobs
crontab -l  # list them
```

```text
# ┌ minute (0-59)  ┌ hour (0-23)  ┌ day of month  ┌ month  ┌ day of week (0=Sun)
  0               2              *               *        1-5   /home/<user>/run_tests.sh >> /home/<user>/nightly.log 2>&1
```

> Cron runs with a minimal `PATH` and from your home directory. Use absolute paths and always redirect output to a log.

### Docker for disposable test environments

```bash
docker run -it --rm ubuntu:24.04 bash  # throwaway Linux shell
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=test postgres:16  # test DB in the background
docker ps                              # running containers
docker logs -f <container>             # follow container logs
docker exec -it <container> bash       # shell inside a running container
docker compose up -d                   # start the stack in docker-compose.yml
docker compose logs -f <service>       # logs for one service
docker compose down                    # stop and remove containers
docker compose down -v                 # also delete volumes (data) ⚠️
```

> Add yourself to the `docker` group to skip `sudo`: `sudo usermod -aG docker $USER`, then log out and in.

### Simulating bad conditions (negative testing)

```bash
fallocate -l 2G /tmp/bigfile                                  # instantly create a 2 GB file (fill disk, upload limits)
truncate -s 10M test_10mb.bin                                 # file of an exact size
head -c 5M /dev/urandom > random.bin                          # 5 MB of random bytes (corrupt/binary uploads)
touch "file with spaces.txt" "ação_ünïcödé.txt"               # tricky filenames
kill -STOP <pid>  ;  kill -CONT <pid>                         # freeze / unfreeze a service (timeouts, retries)
sudo systemctl stop <dependency>                              # take a dependency down
echo "127.0.0.1 <api.dependency.com>" | sudo tee -a /etc/hosts  # point a host to nowhere ⚠️ remove after
faketime '2026-12-31 23:59:50' <cmd>                          # run with a fake clock (install: faketime)
TZ=Asia/Tokyo <cmd>                                           # run in another timezone
stress-ng --cpu 4 --vm 1 --vm-bytes 1G --timeout 60s # CPU and memory pressure (install: stress-ng)
sudo tc qdisc add dev <iface> root netem delay 300ms loss 5%  # slow, lossy network ⚠️
sudo tc qdisc del dev <iface> root                            # remove the network delay again
```

---

## 7. Real-World QA Workflows

### Recipe 1: Investigate a bug from application logs

```bash
tail -f app.log | grep --line-buffered -iE "error|exception|warn"  # 1) watch live while you reproduce
grep -n "2026-11-27 10:4" app.log | head                # 2) jump to the time of the failure
grep -C 10 "<request-id>" app.log                       # 3) full context around one request
grep -oE "[A-Za-z]+Exception" app.log | sort | uniq -c | sort -rn  # 4) which errors happen most
grep "<request-id>" app.log > evidence_<ticket-id>.txt  # 5) save evidence for the bug report
```

### Recipe 2: Test an API endpoint with `curl`

```bash
read -rs TOKEN  # 1) paste token without it showing or entering history
curl -s https://<api>/users/1 -H "Authorization: Bearer $TOKEN" | jq .  # 2) GET and pretty-print
curl -i https://<api>/users/1 -H "Authorization: Bearer $TOKEN"  # 3) include status + headers
curl -s -X POST https://<api>/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name": "QA Test", "email": "qa+1@example.com"}' | jq .  # 4) POST JSON
curl -s -X POST https://<api>/users -H "Content-Type: application/json" -d @payload.json  # 5) body from a file
curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" https://<api>/health  # 6) status + timing
```

### Recipe 3: Run a Python test suite and keep the results

```bash
cd <project>                                     # 1) go to the repo
python3 -m venv .venv                            # 2) create an isolated environment (once)
source .venv/bin/activate                        # 3) activate it
pip install -r requirements.txt                  # 4) install dependencies
pytest -v 2>&1 | tee "run_$(date +%F_%H%M).log"  # 5) run, see output, save a timestamped log
echo "pytest exit code: ${PIPESTATUS[0]}"        # 6) real exit code (not tee's)
deactivate                                       # 7) leave the venv
```

### Recipe 4: Smoke-check that a service is up

```bash
systemctl is-active <service>                           # 1) process running?
ss -tulpn | grep :<port>                                # 2) listening on the expected port?
curl -fsS http://localhost:<port>/health && echo OK     # 3) answers correctly? (-f fails on HTTP errors)
journalctl -u <service> --since "5 min ago" -p warning  # 4) any warnings since it started?
```

### Recipe 5: Collect logs from a remote test server

```bash
ssh <user>@<host> 'sudo journalctl -u <service> --since "1 hour ago" --no-pager' > <service>_$(date +%F).log  # 1) stream logs straight to your machine
ssh <user>@<host> 'cat /etc/os-release; uname -r; df -h; free -h' > env_info.txt  # 2) capture environment details
rsync -avz <user>@<host>:/var/log/<app>/ ./evidence/<app>-logs/  # 3) pull a whole log folder
```

### Recipe 6: Compare responses before and after a deploy (regression)

```bash
curl -s https://<api>/products | jq -S . > before.json  # 1) snapshot before (keys sorted)
# ... deploy happens ...
curl -s https://<api>/products | jq -S . > after.json   # 2) snapshot after
diff -u before.json after.json                          # 3) see exactly what changed
diff <(jq -S . a.json) <(jq -S . b.json)                # one-liner with process substitution
```

### Recipe 7: Reproduce a flaky test

```bash
fails=0
for i in $(seq 1 20); do      # 1) run the same test 20 times
  pytest tests/test_login.py -q > /dev/null 2>&1 || { fails=$((fails + 1)); echo "run $i FAILED"; }
done
echo "$fails/20 runs failed"  # 2) report the failure rate
watch -n 2 'curl -s -o /dev/null -w "%{http_code}\n" localhost:<port>/health'  # 3) watch an endpoint every 2s
```

### Recipe 8: Spin up a throwaway environment with Docker Compose

```bash
git clone <repo-url> && cd <repo>  # 1) get the project
docker compose up -d               # 2) start app + DB + dependencies
docker compose ps                  # 3) everything "running"/"healthy"?
docker compose logs -f <service>   # 4) watch logs in another pane
docker compose exec <service> sh   # 5) poke around inside the container
docker compose down -v             # 6) tear down and wipe data for a clean next run ⚠️
```

---

## 8. Shortcuts, Aliases and Config

### Terminal keyboard shortcuts

| Keys | Action |
|---|---|
| `Tab` / `Tab Tab` | Autocomplete / show all options |
| `Ctrl+R` | Search command history (press again for older matches) |
| `Ctrl+C` | Cancel current command |
| `Ctrl+D` | End input / exit the shell |
| `Ctrl+L` | Clear screen |
| `Ctrl+A` / `Ctrl+E` | Jump to start / end of line |
| `Ctrl+U` / `Ctrl+K` | Delete to start / to end of line |
| `Ctrl+W` | Delete previous word |
| `Alt+B` / `Alt+F` | Move back / forward one word |
| `Alt+.` | Insert last argument of the previous command |
| `Ctrl+Shift+C` / `Ctrl+Shift+V` | Copy / paste in most terminal emulators |
| `Ctrl+Z` | Pause the foreground program |

### History and expansion tricks

```bash
!!                                     # repeat last command
sudo !!                                # repeat last command with sudo
!$                                     # last argument of the previous command
history | grep curl                    # find a past command
!<number>                              # rerun command by its history number
cp config.yml{,.bak}                   # = cp config.yml config.yml.bak
mkdir -p tests/{unit,integration,e2e}  # create three folders at once
```

### Aliases (`~/.bashrc`)

```bash
alias ll='ls -lah'                                  # detailed listing
alias ..='cd ..'                                    # up one level
alias ...='cd ../..'                                # up two levels
alias grep='grep --color=auto'                      # highlight matches
alias rm='rm -i'                                    # confirm before deleting
alias cp='cp -i'                                    # confirm before overwriting
alias mv='mv -i'                                    # confirm before overwriting
alias ports='ss -tulpn'                             # listening ports
alias update='sudo apt update && sudo apt upgrade'  # adjust for dnf/pacman
alias venv='source .venv/bin/activate'              # activate project venv
alias dps='docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'  # compact docker ps
```

### Functions (`~/.bashrc`)

```bash
mkcd() { mkdir -p "$1" && cd "$1"; }              # make dir and enter it
httpcode() { curl -s -o /dev/null -w '%{http_code}\n' "$1"; }  # httpcode <url>
logerr() { grep -inE 'error|exception|fail' "$1" | tail -n "${2:-20}"; }  # logerr <file> [lines]
serve() { python3 -m http.server "${1:-8000}"; }  # quick static server for test files
envinfo() { cat /etc/os-release | head -n 2; uname -r; nproc; free -h | head -n 2; }  # paste into bug reports
```

### History and safety settings (`~/.bashrc`)

```bash
HISTSIZE=10000            # commands kept in memory
HISTFILESIZE=20000        # commands kept on disk
HISTCONTROL=ignoreboth    # skip duplicates and lines starting with a space
HISTTIMEFORMAT='%F %T  '  # timestamps in history (useful for bug timelines)
shopt -s histappend       # don't overwrite history from other terminals
set -o noclobber          # '>' won't overwrite files (use '>|' to force)
```

> Start a command with a **space** to keep it out of history (works with `HISTCONTROL=ignoreboth`), handy for commands that contain secrets.

---

## 9. Common Pitfalls

| Pitfall | Why it hurts | How to avoid it |
|---|---|---|
| Unquoted variables: `rm $file` | A name with spaces becomes several arguments | Always quote: `"$file"` |
| `rm -rf "$DIR/"` with an empty `$DIR` | Becomes `rm -rf /` ⚠️ | `rm -rf "${DIR:?}/"` and `set -u` |
| Using `sudo` for everything | Root-owned files in your home; bigger blast radius | Use sudo only when needed; fix with `sudo chown -R "$USER": <dir>` |
| `chmod -R 777` to "fix" permissions | Opens files to everyone; hides the real bug | Set the exact permission you need |
| `>` instead of `>>` | Overwrites the file | `set -o noclobber`; double-check |
| `pytest \| tee log` reports success | `$?` is tee's exit code, not pytest's: CI stays green | `set -o pipefail` or `${PIPESTATUS[0]}` |
| Windows line endings (CRLF) | `bad interpreter: /bin/bash^M` | `dos2unix <file>` or `sed -i 's/\r$//' <file>`; set Git `core.autocrlf` |
| Case sensitivity | Passes on Windows/macOS, fails on Linux CI | Match exact file and import name case |
| Working under `/mnt/c` in WSL | Very slow, permission oddities | Keep projects in `~` inside Linux |
| `curl <url> \| bash` from the internet | Runs unknown code as you | Download, read, then run |
| `kill -9` as the first option | No cleanup: corrupt data, stale lock files | `kill` first, `-9` only if it ignores you |
| `tail -f \| grep \| ...` shows nothing | grep buffers output in pipes | `grep --line-buffered` |
| Testing only as root | Hides permission bugs real users will hit | Test as a normal user |
| Cron job works by hand, not in cron | Different `PATH`, working dir and env | Absolute paths, log output, set needed env vars |
| `sed -i` without a backup | One wrong regex destroys the file ⚠️ | `sed -i.bak ...` or test without `-i` first |
| Date/time tests pass locally, fail in CI | Different timezone or locale | Pin `TZ=UTC`, `LC_ALL=C` in tests |
| `Ctrl+S` "froze" the terminal | It's flow control, not a crash | Press `Ctrl+Q` |

---

## 10. Glossary

| Term | Meaning |
|---|---|
| **Kernel** | Core of the OS; manages hardware, processes, memory, files |
| **Distro** | A Linux distribution: kernel + tools + package manager (Ubuntu, Fedora, Arch) |
| **Shell** | Program that reads and runs your commands (bash, zsh) |
| **Terminal** | The window that hosts the shell |
| **Root** | The admin superuser (UID 0) |
| **sudo** | Run a single command with root privileges |
| **Package manager** | Installs, updates and removes software (apt, dnf, pacman) |
| **Repository** | Online source of packages for a package manager |
| **PATH** | List of directories the shell searches for commands |
| **Environment variable** | Named value passed to programs (`BASE_URL`, `HOME`) |
| **Dotfile** | Hidden config file starting with `.` (`~/.bashrc`) |
| **stdin / stdout / stderr** | Input, normal output, error output (0, 1, 2) |
| **Pipe (`\|`)** | Sends one command's output into another's input |
| **Redirection** | Sending a stream to or from a file (`>`, `>>`, `<`, `2>`) |
| **Exit code** | Number a command returns; `0` = success |
| **Process / PID** | A running program / its numeric ID |
| **Signal** | Message sent to a process (`SIGTERM`, `SIGKILL`) |
| **Daemon / service** | Background process (web server, database) |
| **systemd** | Init system that starts and manages services |
| **journal** | systemd's log store, read with `journalctl` |
| **Mount** | Attaching a disk or filesystem into the directory tree |
| **Inode** | Record holding a file's metadata; a disk can run out of them |
| **Symlink** | Shortcut that points to another path |
| **Permissions (rwx)** | Read, write and execute rights for owner, group and others |
| **Glob** | Shell wildcard pattern (`*.log`, `test_?.py`) |
| **Regex** | Pattern language used by grep, sed, awk |
| **Shebang** | First line of a script that picks the interpreter (`#!/usr/bin/env bash`) |
| **SSH** | Encrypted remote login and command execution |
| **Port** | Numbered network endpoint a service listens on (80, 443, 5432) |
| **localhost / 127.0.0.1** | This same machine |
| **Cron** | Scheduler for recurring jobs |
| **Container** | Isolated process with its own filesystem (Docker) that shares the host kernel |
| **VM** | Full virtual computer with its own kernel |
| **WSL** | Windows Subsystem for Linux: real Linux running inside Windows |
| **TTY** | A terminal device; "no TTY" errors come from non-interactive sessions |
