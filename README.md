# @perkycrow/cleaner

Configurable code-quality auditor for JS projects. Generic rules run by default;
framework- and opinion-specific rules are opt-in. Configured with a
`cleaner.config.js` the way ESLint uses `eslint.config` — a preset plus per-rule
overrides, with zero project paths baked into the engine.

## Install

Consumed as a git dependency (not published to npm):

```jsonc
"@perkycrow/cleaner": "github:perkycrow/cleaner#v0.1.0"
```

The CLI is exposed as the `cleaner` bin.

## Usage

```sh
cleaner                 # audit (detailed: hint + file:line per rule)
cleaner --compact       # one-line summary per rule
cleaner --fix           # apply fixable rules (whitespace, imports, comments)
cleaner --fix --dry-run # preview fixes without writing
cleaner --duplicates    # functions declared more than once
cleaner --unused        # files never imported anywhere
cleaner --interactive   # triage comments & eslint-disables one by one (alias -i)
cleaner [path]          # scope to a file or directory
cleaner --json          # machine-readable output
cleaner --config <path> # use a specific config file
```

## Configuration

`cleaner.config.js` exports an object: a `preset`, global `ignore` globs, and
per-rule overrides.

```js
export default {
    preset: 'perky',                       // 'generic' (default) or 'perky'
    ignore: ['dist/**', 'mist_old/**'],
    rules: {
        comments: false,                   // disable a rule
        'missing-docs': {include: ['core/**']},   // enable + scope (opt-in)
        'max-lines': {max: 500},           // rule options
        'multiple-classes': {exclude: ['examples/**']}  // adds to the rule's defaults
    }
}
```

Per rule: `false` disables, `true` enables with defaults, an object enables with
`include` / `exclude` globs (exclude is additive with the rule's defaults) and
options. `include`/`exclude` use picomatch globs.

## Rules

Presets: **generic** enables the `generic` group; **perky** enables everything.

- **generic** (on by default): `whitespace` (fix), `imports` (.js extensions, fix),
  `privacy` (`_` members), `multiple-classes`, `max-lines`.
- **opinion** (off by default): `comments` (fix), `switch`, `test-style` (it/should),
  `test-deep-nesting`, `test-single-describe`, `eslint-disable-justified`,
  `missing-tests`.
- **framework** (off by default): `function-order`, `style-elements`, `dom-utils`,
  `missing-docs`.

## Interactive mode

`cleaner --interactive` walks each comment and unjustified `eslint-disable`
directive, prompting **(k)eep / (d)iscard / (s)kip / (q)uit**:

- comments — keep marks them with `//!` (preserved on later runs); discard removes them.
- eslint-disables — keep appends ` -- clean`; discard removes the directive.

Consecutive standalone `//` lines are treated as one block.

## Reports

- `--duplicates` — function declarations sharing a name across files (common
  lifecycle prefixes like `init`, `get`, `update`… are ignored).
- `--unused` — files never imported (may include legitimate entry points).

## Tests

```sh
yarn test
```
