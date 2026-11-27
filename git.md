# Git Cheatsheet

A quick reference for everyday Git work. Anything in `<angle brackets>` is a placeholder you replace.

---

## Table of Contents

1. [Setup & Config](#1-setup--config)
2. [Starting a Repository](#2-starting-a-repository)
3. [The Basic Workflow](#3-the-basic-workflow)
4. [Inspecting Changes](#4-inspecting-changes)
5. [Branches](#5-branches)
6. [Merging & Rebasing](#6-merging--rebasing)
7. [Remotes (GitHub, GitLab…)](#7-remotes-github-gitlab)
8. [Undoing Things](#8-undoing-things)
9. [Stashing](#9-stashing)
10. [Tags](#10-tags)
11. [History & Searching](#11-history--searching)
12. [.gitignore](#12-gitignore)
13. [Handy Aliases](#13-handy-aliases)
14. [Common Workflows](#14-common-workflows)
15. [Glossary](#15-glossary)

---

## 1. Setup & Config

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main     # new repos start on "main"
git config --global core.editor "code --wait"   # or vim, nano...
git config --global pull.rebase false           # pull = merge (default behaviour)
git config --global color.ui auto

git config --list                 # show all settings
git config --global --edit        # open global config in your editor
git help <command>                # full manual for a command
git <command> -h                  # short help
```

**Config levels:** `--system` (all users) → `--global` (your user, `~/.gitconfig`) → `--local` (this repo, `.git/config`). The most specific wins.

---

## 2. Starting a Repository

```bash
git init                          # turn current folder into a repo
git init <folder>                 # create a new folder as a repo
git clone <url>                   # copy a remote repo
git clone <url> <folder>          # clone into a specific folder
git clone --depth 1 <url>         # shallow clone (latest commit only)
```

---

## 3. The Basic Workflow

```
Working Directory  --git add-->  Staging Area  --git commit-->  Local Repo  --git push-->  Remote
```

```bash
git status                        # what's changed / staged / untracked
git status -s                     # short format

git add <file>                    # stage a file
git add .                         # stage everything in current folder
git add -A                        # stage all changes (incl. deletions) in whole repo
git add -p                        # stage interactively, chunk by chunk

git commit -m "Message"           # commit staged changes
git commit -am "Message"          # stage tracked files + commit (skips new files)
git commit --amend                # edit the last commit (message and/or content)
git commit --amend --no-edit      # add staged changes to last commit, keep message

git rm <file>                     # delete file and stage the deletion
git rm --cached <file>            # stop tracking, but keep the file on disk
git mv <old> <new>                # rename/move and stage it
```

### Good commit messages

```
Short summary in imperative mood (≤ 50 chars)

Optional body explaining *what* and *why*, wrapped at ~72 chars.
```

Examples: `Add login form validation`, `Fix crash when cart is empty`.
Many teams use [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.

---

## 4. Inspecting Changes

```bash
git diff                          # unstaged changes vs. staging area
git diff --staged                 # staged changes vs. last commit
git diff HEAD                     # all changes vs. last commit
git diff <branch1>..<branch2>     # compare two branches
git diff <commit1> <commit2>      # compare two commits
git diff --stat                   # summary: files and line counts only

git show <commit>                 # show a commit's changes
git show <commit>:<file>          # show a file as it was in that commit
```

---

## 5. Branches

```bash
git branch                        # list local branches
git branch -a                     # list local + remote branches
git branch -v                     # with last commit on each

git branch <name>                 # create branch (don't switch)
git switch <name>                 # switch to branch
git switch -c <name>              # create + switch
git switch -                      # go back to previous branch

git branch -m <new-name>          # rename current branch
git branch -d <name>              # delete (only if merged)
git branch -D <name>              # force delete

git branch --merged               # branches already merged into current
git branch --no-merged            # branches not merged yet
```

> **Older syntax:** `git checkout <branch>` and `git checkout -b <branch>` do the same as `switch`. You'll see them a lot in tutorials.

---

## 6. Merging & Rebasing

```bash
git merge <branch>                # merge <branch> into current branch
git merge --no-ff <branch>        # always create a merge commit
git merge --squash <branch>       # combine all changes into one staged change
git merge --abort                 # cancel a merge with conflicts

git rebase <branch>               # replay current commits on top of <branch>
git rebase -i HEAD~3              # interactively edit last 3 commits
git rebase --continue             # after fixing conflicts
git rebase --abort                # cancel and go back

git cherry-pick <commit>          # apply one specific commit to current branch
```

### Interactive rebase commands

| Command  | Effect                                      |
|----------|---------------------------------------------|
| `pick`   | keep commit as-is                           |
| `reword` | keep commit, edit message                   |
| `edit`   | stop to amend the commit                    |
| `squash` | merge into previous commit, combine messages|
| `fixup`  | merge into previous commit, drop message    |
| `drop`   | delete commit                               |

### Resolving conflicts

1. Git marks conflicted files — check with `git status`.
2. Open the file and look for:
   ```
   <<<<<<< HEAD
   your version
   =======
   their version
   >>>>>>> other-branch
   ```
3. Edit to the final version and remove the markers.
4. `git add <file>`
5. `git commit` (merge) or `git rebase --continue` (rebase).

### Merge vs. Rebase

| Merge                                  | Rebase                                    |
|----------------------------------------|-------------------------------------------|
| Keeps full history, adds a merge commit| Linear, cleaner history                   |
| Safe on shared branches                | Rewrites history — **don't rebase commits others already pulled** |

---

## 7. Remotes (GitHub, GitLab…)

```bash
git remote -v                     # list remotes with URLs
git remote add origin <url>       # add a remote named "origin"
git remote set-url origin <url>   # change a remote's URL
git remote remove <name>          # remove a remote

git fetch                         # download changes, don't merge
git fetch --prune                 # also remove deleted remote branches
git pull                          # fetch + merge
git pull --rebase                 # fetch + rebase

git push                          # push current branch
git push -u origin <branch>       # push and set upstream (first push)
git push origin --delete <branch> # delete remote branch
git push --force-with-lease       # safer force push (after rebase/amend)
git push --tags                   # push all tags
```

> ⚠️ Avoid plain `git push --force` on shared branches. `--force-with-lease` refuses if someone else pushed in the meantime.

---

## 8. Undoing Things

### Quick decision table

| I want to…                                   | Command                              |
|----------------------------------------------|--------------------------------------|
| Discard unstaged changes in a file           | `git restore <file>`                 |
| Unstage a file (keep changes)                | `git restore --staged <file>`        |
| Fix the last commit message                  | `git commit --amend`                 |
| Undo last commit, keep changes staged        | `git reset --soft HEAD~1`            |
| Undo last commit, keep changes unstaged      | `git reset HEAD~1`                   |
| Undo last commit and **throw away** changes  | `git reset --hard HEAD~1` ⚠️          |
| Undo a commit that's already pushed          | `git revert <commit>`                |
| Remove untracked files                       | `git clean -n` (preview) → `git clean -fd` ⚠️ |
| Restore a file from an older commit          | `git restore --source=<commit> <file>` |
| Recover "lost" commits after a bad reset     | `git reflog` → `git reset --hard <hash>` |

### reset modes

| Mode       | Moves HEAD | Staging area | Working files |
|------------|:----------:|:------------:|:-------------:|
| `--soft`   | ✅         | kept         | kept          |
| `--mixed` (default) | ✅ | reset     | kept          |
| `--hard`   | ✅         | reset        | **reset** ⚠️   |

> **Rule of thumb:** `reset` rewrites history (local only). `revert` adds a new commit that undoes an old one (safe for shared branches).

> **`git reflog` is your safety net.** It records where HEAD has been, so you can almost always get back a commit you "lost".

---

## 9. Stashing

Temporarily shelve changes without committing.

```bash
git stash                         # stash tracked changes
git stash -u                      # include untracked files
git stash push -m "wip: login"    # stash with a message
git stash list                    # list stashes
git stash show -p stash@{0}       # see what's in a stash
git stash pop                     # apply latest + remove it
git stash apply stash@{1}         # apply specific stash, keep it
git stash drop stash@{0}          # delete a stash
git stash clear                   # delete all stashes
git stash branch <name>           # new branch from a stash
```

---

## 10. Tags

```bash
git tag                           # list tags
git tag v1.0.0                    # lightweight tag
git tag -a v1.0.0 -m "Release 1.0"  # annotated tag (recommended)
git tag -a v1.0.0 <commit>        # tag an older commit
git show v1.0.0                   # tag details
git push origin v1.0.0            # push one tag
git push --tags                   # push all tags
git tag -d v1.0.0                 # delete local tag
git push origin --delete v1.0.0   # delete remote tag
```

---

## 11. History & Searching

```bash
git log                           # full history
git log --oneline                 # one line per commit
git log --oneline --graph --all   # visual branch graph
git log -n 5                      # last 5 commits
git log -p <file>                 # history of a file with diffs
git log --follow <file>           # history across renames
git log --author="Name"           # by author
git log --since="2 weeks ago"     # by date
git log --grep="bug"              # search commit messages
git log -S "functionName"         # commits that added/removed this text
git log main..feature             # commits in feature but not in main

git blame <file>                  # who last changed each line
git shortlog -sn                  # commit count per author

git grep "text"                   # search tracked files
```

### Finding the commit that introduced a bug (great for QA!)

```bash
git bisect start
git bisect bad                    # current commit is broken
git bisect good <commit>          # this older commit worked
# Git checks out a commit in the middle — test it, then:
git bisect good                   # or: git bisect bad
# ...repeat until Git names the first bad commit
git bisect reset                  # return to where you started

git bisect run <test-script>      # automate it with a script (exit 0 = good)
```

### Referring to commits

| Syntax        | Meaning                              |
|---------------|--------------------------------------|
| `HEAD`        | current commit                       |
| `HEAD~1`      | parent of HEAD (one commit back)     |
| `HEAD~3`      | three commits back                   |
| `HEAD^2`      | second parent (of a merge commit)    |
| `a1b2c3d`     | short commit hash                    |
| `main@{yesterday}` | where `main` was yesterday      |

---

## 12. .gitignore

Create a `.gitignore` file in the repo root:

```gitignore
# Dependencies
node_modules/
venv/

# Build output
dist/
build/

# Environment / secrets
.env
*.key

# OS & editor junk
.DS_Store
Thumbs.db
.vscode/
.idea/

# Logs
*.log

# Exceptions
!important.log        # "!" re-includes a file
```

```bash
git check-ignore -v <file>        # why is this file ignored?
git rm -r --cached .              # untrack everything, then re-add
git add .                         #   (use after updating .gitignore)
```

Templates for most languages: <https://github.com/github/gitignore>

---

## 13. Handy Aliases

```bash
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.sw switch
git config --global alias.br branch
git config --global alias.cm "commit -m"
git config --global alias.lg "log --oneline --graph --all --decorate"
git config --global alias.last "log -1 HEAD"
git config --global alias.unstage "restore --staged"
```

Now `git lg` shows a pretty graph, `git st` shows status, etc.

---

## 14. Common Workflows

### Feature branch (most common)

```bash
git switch main
git pull
git switch -c feature/login-form
# ...work, add, commit...
git push -u origin feature/login-form
# Open a Pull Request / Merge Request on GitHub/GitLab
# After it's merged:
git switch main
git pull
git branch -d feature/login-form
```

### Keep your branch up to date with main

```bash
git switch feature/login-form
git fetch origin
git rebase origin/main            # or: git merge origin/main
# fix conflicts if any
git push --force-with-lease       # only needed if you rebased
```

### Clean up commits before a PR

```bash
git rebase -i origin/main         # squash/reword your commits
git push --force-with-lease
```

### Committed to the wrong branch

```bash
git switch correct-branch
git cherry-pick <commit>
git switch wrong-branch
git reset --hard HEAD~1           # remove it from the wrong branch
```

### Start a new project and push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin git@github.com:<user>/<repo>.git
git push -u origin main
```

---

## 15. Glossary

| Term            | Meaning                                                        |
|-----------------|----------------------------------------------------------------|
| **Repository**  | A project folder tracked by Git (history lives in `.git/`)     |
| **Commit**      | A snapshot of your files at a point in time                    |
| **Staging area**| Where you prepare changes before committing (a.k.a. *index*)   |
| **Branch**      | A movable pointer to a line of commits                         |
| **HEAD**        | Pointer to the commit you're currently on                      |
| **Detached HEAD** | You're on a commit, not a branch — `git switch -c <name>` to keep work |
| **Remote**      | A copy of the repo on another server (usually `origin`)        |
| **Upstream**    | The remote branch your local branch tracks                     |
| **Fetch**       | Download remote changes without merging                        |
| **Pull**        | Fetch + merge (or rebase)                                      |
| **Merge**       | Combine histories with a merge commit                          |
| **Rebase**      | Replay commits on top of another base                          |
| **Fast-forward**| Merge that just moves the pointer forward, no merge commit     |
| **Stash**       | Temporary storage for uncommitted changes                      |
| **Tag**         | A fixed label on a commit, typically for releases              |
| **Reflog**      | Local log of everywhere HEAD has pointed — used for recovery   |
| **PR / MR**     | Pull Request (GitHub) / Merge Request (GitLab) — a review before merging |
