# Implementation Notes

## Glossary

* `put` = replace property by key / path / index, preserving as many references as possible.
* `remove` = remove property by key / path / index, preserving as many references as possible.
* `patch` = combine dicts, preserving as many references as possible.
* `merge` = deep patch that combines dicts at all levels.
* `nil` = null | undefined.
* `value` = primitive | list | plain dict.

## Internal Glossary

These terms are used for some internal functions analogous to the external API but are more specialized, don't validate inputs as rigorously, etc.

* `assoc` = same as `put`, but checks equality only by reference; used internally by `put` and `putIn`.

## Special Rules

Treat non-value objects atomically: include and replace them entirely, without cloning.

## Performance Notes

Emerge seeks a balance of performance and simplicity.

`put`, `patch` and other functions tend to speculatively create a new data structure before testing it for equality, possibly throwing it away. Should revisit the code and avoid this where possible.

`putIn` could be defined as a recursive `put`, but would be significantly slower due to redundant equality checks on every level. A single nested `put`, with a single equality check, followed by multiple assoc, is much faster.

In modern V8, our simple `fold` and `fold1` seem to perform as a well as an inline loop, and much better than `Array.prototype.reduce`.

In modern V8, native rest and spread has almost no meaningful overhead compared to hardcoding a fixed set of additional parameters.

## TODO

Add benchmarks with large real-world data.
