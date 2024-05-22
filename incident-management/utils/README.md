# Contributed Utilities

Contributed utilities are organised under the following directory structure:

* **bin** - Main entrypoints for utilities
* **config** - Any configuration files
* **lib** - Common library code
* **docs** - README files
* **scripts** - Any associated sell scripts
* **test** - Jest unit tests

## Getting Started

A version of NodeJS of v18.0 or above is required.

To install any dependencies run the following in this directory:

```
npm i 
```

Each utility will provide an entry point in `bin` with documentated usage in a README in `docs` detailing configuration and usage.

## Contributed Code

All contributed utilities should be written in JavaScript and should successfully lint using eslint. 

A utility will consist of:

* An entrypoint under `bin`
* An optional configuration file under  `config`
* A README file under `docs`
* Optional unit tests under `test`

Use can make use of npm modules along with local shared library code in `lib`.


### Entrypoint 

The entrypoint in `bin` should be named after the utility without a `.js` suffix and include shebang:

```
#!/usr/bin/env node
```
 
### Config

If a utility uses a configuration file, it should be placed in `config`, should use the [HJSON](https://hjson.github.io) format and given a `.conf` suffix.

### README

Each utility should supply a README file in `docs`  e.g. `README_<utility_name>.md`. This should detail:

* Required configuration
* Usage
* Any limitations

### Tests

If a utility supplies unit tests, they should be placed under `test`  and should be written using [jest](https://jestjs.io).

