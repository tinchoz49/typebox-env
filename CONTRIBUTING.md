# Contributing to typebox-env

## Issue Contributions

When opening a new issue or commenting on existing issues on this repository
please make sure discussions are related to concrete technical issues.

Try to be *friendly* (we are not animals :monkey: or bad people :rage4:) and explain correctly how I can reproduce your issue.

## Code Contributions

This document will guide you through the contribution process.

### Step 1: Fork

Fork the project [on GitHub](https://github.com/tinchoz49/typebox-env) and check out your copy locally.

```bash
$ git clone git@github.com:tinchoz49/typebox-env.git
$ cd typebox-env
$ npm install
$ git remote add upstream git://github.com/tinchoz49/typebox-env.git
```

### Step 2: Branch

Create a feature branch and start hacking:

```bash
$ git checkout -b my-feature-branch -t origin/main
```

### Step 3: Test

Bug fixes and features **should come with tests**. I use [node:test](https://nodejs.org/api/test.html) to do that.

```bash
$ npm test
```

### Step 4: Lint

Make sure the linter is happy and that all tests pass. Please, do not submit
patches that fail either check.

I use [Standard Extended](https://github.com/tinchoz49/eslint-config-standard-ext) to do that.

```bash
$ npm run lint
```

### Step 5: Commit

Make sure git knows your name and email address:

```bash
$ git config --global user.name "Bruce Wayne"
$ git config --global user.email "bruce@batman.com"
```

Writing good commit logs is important. A commit log should describe what
changed and why.

### Step 6: Push

```bash
$ git push origin my-feature-branch
```

### Step 7: Make a pull request ;)
