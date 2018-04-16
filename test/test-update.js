'use strict'

const t = require('./utils')
const e = require('../')

/**
 * put
 */

// Dicts

t.equal(e.put({}, 'one', 1), {one: 1})
t.equal(e.put({one: 1}, 'two', 2), {one: 1, two: 2})

// Replaces non-structures with dicts
t.equal(e.put(undefined, 'one', 1), {one: 1})
t.equal(e.put(null, 'one', 1), {one: 1})
t.equal(e.put('replace me', 'one', 1), {one: 1})
t.equal(e.put(0b01010101, 'one', 1), {one: 1})
t.equal(e.put(Promise.resolve(), 'one', 1), {one: 1})
t.equal(e.put(e.put, 'one', 1), {one: 1})

// Compatible with symbol keys
t.equal(e.put({}, Symbol.for('one'), 1), {[Symbol.for('one')]: 1})

// Coerces non-symbol keys to strings
t.equal(e.put(null, 0, 'one'), {0: 'one'})
t.equal(e.put({}, 0, 'one'), {0: 'one'})
t.equal(e.put({}, true, 'one'), {true: 'one'})
t.equal(e.put({}, undefined, 'one'), {undefined: 'one'})

// Rejects non-primitive keys to help avoid stupid errors
t.throws(() => e.put(undefined, {}, undefined), `satisfy test`)
t.throws(() => e.put(undefined, [], undefined), `satisfy test`)

// Setting a property to nil removes it
t.equal(e.put({one: 1}, 'one', null), {})
t.equal(e.put({one: 1}, 'one', undefined), {})
t.equal(e.put(undefined, undefined, undefined), {})
t.equal(e.put({one: null}, 'one', null), {})
t.equal(e.put({one: undefined}, 'one', null), {})
t.equal(e.put({one: undefined}, 'one', null), {})

// Removes all other nil properties
t.equal(e.put({one: null}, 'two', 2), {two: 2})
t.equal(e.put({one: undefined}, 'two', 2), {two: 2})
t.equal(e.put({one: undefined, two: 2}, 'two', null), {})
// t.equal(e.put({one: undefined, two: 2}, 'two', 2), {})

// Preserves original if property would remain equal or missing
{
  const src = {one: {two: 2}, three: NaN}
  t.is(e.put(src, 'one', {two: 2}), src)
  t.is(e.put(src, 'three', NaN), src)
}
{
  const src = {one: NaN}
  t.is(e.put(src, 'two', null), src)
  t.is(e.put(src, 'two', undefined), src)
}

// Preserves inner references unaffected by put
{
  const src = {replace: {one: 1}, keep: [{nan: NaN, nil: null}]}
  const out = e.put(src, 'replace', 1)
  t.equal(out, {replace: 1, keep: [{nan: NaN, nil: null}]})
  t.is(src.keep, out.keep)
}

// Preserves inner references affected by put when result is equal
{
  const src = {one: {two: [2, NaN], three: [3]}}
  const out = e.put(src, 'one', {two: [2, NaN], three: 3})
  t.equal(out, {one: {two: [2, NaN], three: 3}})
  t.is(src.one.two, out.one.two)
}

// Lists

// Append
t.equal(e.put([], 0, 'one'), ['one'])
t.equal(e.put(['one'], 1, 'two'), ['one', 'two'])
// Replace
t.equal(e.put(['one'], 0, 'three'), ['three'])
t.equal(e.put(['one', 'two'], 0, 'three'), ['three', 'two'])
t.equal(e.put(['one', 'two'], 1, 'three'), ['one', 'three'])
t.equal(e.put(['one', 'two'], 0, null), [null, 'two'])
// Validate index
t.throws(() => e.put([], -1, 'one'), `satisfy test`)
t.throws(() => e.put([], 2, 'one'), `out of bounds`)
t.throws(() => e.put([], '0', 'one'), `satisfy test`)

// Setting elements to nil doesn't completely remove them from a list
t.equal(e.put(['one', 'two'], 0, null), [null, 'two'])

// Preserves references when result is equal
{
  const src = [{one: 1}, {two: 2}]
  t.is(e.put(src, 0, {one: 1}), src)
  t.is(e.put(src, 1, {two: 2, three: null}), src)
}
{
  const src = [{one: 1}, {two: 2}]
  t.is(e.put(src, 1, {two: 2}), src)
}
{
  const src = [{list: []}, NaN]
  t.is(e.put(src, 0, {list: []}), src)
}

/**
 * putIn
 */

// Root

// Does a root-level put, replacing with the new value
// The new value may be a primitive
t.equal(e.putIn(undefined, [], undefined), undefined)
t.equal(e.putIn(undefined, [], null), null)
t.equal(e.putIn('one', [], {one: 1}), {one: 1})
t.equal(e.putIn({one: 1}, [], 'one'), 'one')

// Must preserve references where possible
{
  const src = {one: 1, two: {three: NaN}}
  t.is(e.putIn(src, [], {one: 1, two: {three: NaN}}), src)
}

// Dicts

// Replaces non-structures with dicts
t.equal(e.putIn(undefined, ['one'], 1), {one: 1})
t.equal(e.putIn(null, ['one'], 1), {one: 1})
t.equal(e.putIn('replace me', ['one'], 1), {one: 1})
t.equal(e.putIn(0b01010101, ['one'], 1), {one: 1})
t.equal(e.putIn(Promise.resolve(), ['one'], 1), {one: 1})
t.equal(e.putIn(e.putIn, ['one'], 1), {one: 1})

// Compatible with symbol keys
t.equal(e.putIn({}, [Symbol.for('one')], 1), {[Symbol.for('one')]: 1})

// Coerces non-symbol keys to strings
t.equal(e.putIn(null, [0], 'one'), {0: 'one'})
t.equal(e.putIn({}, [0], 'one'), {0: 'one'})
t.equal(e.putIn({}, [true], 'one'), {true: 'one'})
t.equal(e.putIn({}, [undefined], 'one'), {undefined: 'one'})

// Rejects invalid paths to help avoid stupid errors
t.throws(() => e.putIn(undefined, undefined, undefined), `satisfy test`)
t.throws(() => e.putIn(undefined, 'one', undefined), `satisfy test`)
t.throws(() => e.putIn(undefined, {}, undefined), `satisfy test`)
t.throws(() => e.putIn(undefined, ['one', {}], undefined), `satisfy test`)

// Lists

// Append
t.equal(e.putIn([], [0], 'one'), ['one'])
t.equal(e.putIn(['one'], [1], 'two'), ['one', 'two'])
t.equal(e.putIn(['one', 'two'], [0], 'three'), ['three', 'two'])
t.equal(e.putIn({one: ['two']}, ['one', 1], 'three'), {one: ['two', 'three']})
// Replace
t.equal(e.putIn(['one'], [0], 'two'), ['two'])
t.equal(e.putIn(['one', 'two'], [0], 'three'), ['three', 'two'])
t.equal(e.putIn(['one', 'two'], [1], 'three'), ['one', 'three'])
t.equal(e.putIn(['one', 'two'], [0], null), [null, 'two'])
t.equal(e.putIn({one: ['two', 'three']}, ['one', 0], null), {one: [null, 'three']})
// Validate index
t.throws(() => e.putIn([], [-1], 'one'), `satisfy test`)
t.throws(() => e.putIn([], [2], 'one'), `out of bounds`)
t.throws(() => e.putIn([], ['0'], 'one'), `satisfy test`)

// Setting elements to nil doesn't completely remove them from a list
t.equal(e.putIn(['one', 'two'], [0], null), [null, 'two'])

// Misc

// Converts non-structures to missing dicts at any depth
t.equal(e.putIn(undefined, ['one', 'two'], 2), {one: {two: 2}})
t.equal(e.putIn({three: 3}, ['one', 'two'], 2), {one: {two: 2}, three: 3})
t.equal(e.putIn({}, ['one', 0], 'one'), {one: {0: 'one'}})
t.equal(e.putIn([], [0, 'one', 'two'], 2), [{one: {two: 2}}])
t.equal(e.putIn(['one'], [1, 'two'], 2), ['one', {two: 2}])
t.equal(e.putIn({one: []}, ['one', 0, 'two'], 2), {one: [{two: 2}]})
// Even for keys that look like list indices
t.equal(e.putIn(undefined, [0, 1, 2], 'one'), {0: {1: {2: 'one'}}})

// Setting a property to nil removes it, while creating missing nested dicts
// and replacing non-structures with dicts. Doesn't remove list items.
t.equal(e.putIn(undefined, ['one'], null), {})
t.equal(e.putIn(undefined, ['one'], undefined), {})
t.equal(e.putIn({one: 1}, ['one'], null), {})
t.equal(e.putIn({one: 1}, ['one'], undefined), {})
t.equal(e.putIn({one: {two: 2}}, ['one'], null), {})
t.equal(e.putIn({one: null}, ['one'], null), {})
t.equal(e.putIn({one: undefined}, ['one'], null), {})
t.equal(e.putIn(undefined, [undefined], undefined), {})
t.equal(e.putIn(undefined, ['one', 'two'], null), {one: {}})
t.equal(e.putIn({one: {two: 2}}, ['one', 'two'], null), {one: {}})
t.equal(e.putIn({one: {two: 2}, three: 3}, ['one', 'two'], null), {one: {}, three: 3})
t.equal(e.putIn([], [0], null), [null])
t.equal(e.putIn([{one: 1}], [0, 'one'], null), [{}])
t.equal(e.putIn([{one: null, two: 2, three: 3}], [0, 'two'], null), [{three: 3}])

// Removes all nil properties
t.equal(e.putIn({one: null}, [], {one: null}), {})
t.equal(e.putIn({one: undefined}, [], {one: null}), {})
t.equal(e.putIn({one: null, two: 2}, ['two'], null), {})
// t.equal(e.putIn({one: null, two: 2}, ['two'], 2), {two: 2})
t.equal(e.putIn({one: {two: 2, three: null}, four: null}, ['one', 'two'], NaN), {one: {two: NaN}})
t.equal(e.putIn([{one: null}], [], [{}]), [{}])
t.equal(e.putIn({one: [{two: null, three: 3}]}, ['one', 0, 'three'], null), {one: [{}]})

// Preserves original if result would remain equal,
// or if property would remain equal or missing
{
  const src = {one: 1, two: [NaN]}
  const out = e.putIn(src, [], {one: 1, two: [NaN]})
  t.is(src, out)
}
{
  const src = {one: 1, two: [NaN]}
  const out = e.putIn(src, ['two'], [NaN])
  t.is(src, out)
}
{
  const src = {one: null}
  const out = e.putIn(src, ['two'], null)
  t.is(src, out)
}

// Preserves unaffected inner references
{
  const src = {replace: {one: 1}, keep: [{nan: NaN, nil: null}]}
  const out = e.putIn(src, ['replace'], 1)
  t.equal(out, {replace: 1, keep: [{nan: NaN, nil: null}]})
  t.is(src.keep, out.keep)
}
{
  const src = [{one: [1]}, {two: [2]}]
  const out = e.putIn(src, [1, 'two', 0], NaN)
  t.equal(out, [{one: [1]}, {two: [NaN]}])
  t.is(src.one, out.one)
}

// Preserves affected inner references when result is equal
{
  const src = {one: [{two: [NaN]}, {three: [3]}]}
  {
    const out = e.putIn(src, ['one'], [{two: [NaN]}, {four: 4}])
    t.equal(out, {one: [{two: [NaN]}, {four: 4}]})
    t.is(src.one[0], out.one[0])
  }
  {
    const out = e.putIn(src, ['one', 0, 'two'], [NaN])
    t.is(src, out)
  }
}
{
  const src = {one: 1, list: [{one: 1}, 'two', 'three']}
  t.is(e.putIn(src, ['one'],     1),        src)
  t.is(e.putIn(src, ['two'],     null),     src)
  t.is(e.putIn(src, ['list', 0], {one: 1}), src)
  t.is(e.putIn(src, ['list', 1], 'two'),    src)
}
{
  const src = [{one: 1}, {two: 2}]
  const out = e.putIn(src, [0], {one: 1})
  t.is(src, out)
}
{
  const src = [{one: 1}, {two: 2}]
  const out = e.putIn(src, [0, 'three'], 3)
  t.equal(out, [{one: 1, three: 3}, {two: 2}])
  t.is(src[1], out[1])
}

t.equal(
  e.putIn([{one: 1}, 'two'], [0, 'one'], 'one!'),
  [{one: 'one!'}, 'two']
)

t.equal(
  e.putIn({list: ['one', 'two'], three: 3}, ['list', 0], 'one!'),
  {list: ['one!', 'two'], three: 3}
)

/**
 * patch
 */

// Ignores non-dicts, always returns a dict
t.equal(e.patch(), {})
t.equal(e.patch(undefined), {})
t.equal(e.patch(undefined, null), {})
t.equal(e.patch(['one']), {})

// Combines dicts, ignoring other args
t.equal(e.patch({one: 1}, null, {two: 2}, ['one'], {three: 3}), {one: 1, two: 2, three: 3})

// Combines dicts, dropping nil props
t.equal(e.patch({one: 1, two: 2}, {one: null, three: 3}), {two: 2, three: 3})

// Dicts are combined only 1 level deep
t.equal(e.patch({one: {two: 2}}, {one: {three: 3}}), {one: {three: 3}})

// Preserves references where possible
{
  const src = {one: [{two: [NaN]}]}
  t.is(e.patch(src), src)
  t.is(e.patch(src, {}), src)
  t.is(e.patch(src, {one: [{two: [NaN]}]}), src)
}
{
  const src = {one: {two: 2}, three: [3]}
  const out = e.patch(src, {three: 3})
  t.equal(out, {one: {two: 2}, three: 3})
  t.is(src.one, out.one)
}

// Works with multiple args
t.equal(e.patch({one: 1}, {two: 2}, {three: 3}), {one: 1, two: 2, three: 3})
t.equal(e.patch(undefined, {two: 2}, {three: 3}), {two: 2, three: 3})

/**
 * merge
 */

// Ignores non-dicts, always returns a dict
t.equal(e.merge(), {})
t.equal(e.merge(undefined), {})
t.equal(e.merge(undefined, null), {})
t.equal(e.merge(['one']), {})

// Combines dicts, ignoring other args
t.equal(e.merge({one: 1}, null, {two: 2}, ['one'], {three: 3}), {one: 1, two: 2, three: 3})

// Combines dicts, dropping nil props
t.equal(e.merge({one: 1, two: 2}, {one: null, three: 3}), {two: 2, three: 3})

// Dicts are combined at any depth
t.equal(e.merge({one: {two: 2}}, {one: {three: 3}}), {one: {two: 2, three: 3}})

// Preserves references where possible
{
  const src = {one: [{two: [NaN]}]}
  t.is(e.merge(src), src)
  t.is(e.merge(src, {}), src)
  t.is(e.merge(src, {one: [{two: [NaN]}]}), src)
}
{
  const src = {one: {two: 2}, three: [3]}
  const out = e.merge(src, {three: 3})
  t.equal(out, {one: {two: 2}, three: 3})
  t.is(src.one, out.one)
}

// Works with multiple args
t.equal(e.merge({one: 1}, {two: 2}, {three: 3}), {one: 1, two: 2, three: 3})
t.equal(e.merge(undefined, {two: 2}, {three: 3}), {two: 2, three: 3})

/**
 * insertAtIndex
 */

// Append
t.equal(e.insertAtIndex([], 0, 'one'), ['one'])
t.equal(e.insertAtIndex(['one'], 1, 'two'), ['one', 'two'])
t.equal(e.insertAtIndex(['one', 'two'], 2, 'three'), ['one', 'two', 'three'])

// Insert
t.equal(e.insertAtIndex(['one'], 0, 'two'), ['two', 'one'])
t.equal(e.insertAtIndex(['one', 'two'], 1, 'three'), ['one', 'three', 'two'])

// Replace any non-list with an empty list
t.equal(e.insertAtIndex(undefined, 0, 'one'), ['one'])
t.equal(e.insertAtIndex({0: 10, 1: 20}, 0, 'one'), ['one'])

// Validate index
t.throws(() => e.insertAtIndex([], 0.1, 'one'), `satisfy test`)
t.throws(() => e.insertAtIndex([], -1, 'one'), `satisfy test`)
t.throws(() => e.insertAtIndex([], 2, 'one'), `out of bounds`)
t.throws(() => e.insertAtIndex([], '0', 'one'), `satisfy test`)
t.throws(() => e.insertAtIndex([], null, 'one'), `satisfy test`)
t.throws(() => e.insertAtIndex(undefined, -1, 'one'), `satisfy test`)
t.throws(() => e.insertAtIndex({}, -1, 'one'), `satisfy test`)

/**
 * removeAtIndex
 */

// Remove, ignoring out-of-bounds index
t.equal(e.removeAtIndex([], 0), [])
t.equal(e.removeAtIndex(['one'], 0), [])
t.equal(e.removeAtIndex(['one'], 1), ['one'])
t.equal(e.removeAtIndex(['one'], -1), ['one'])
t.equal(e.removeAtIndex(['one', 'two'], 0), ['two'])
t.equal(e.removeAtIndex(['one', 'two'], 1), ['one'])
t.equal(e.removeAtIndex(['one', 'two'], 2), ['one', 'two'])

// Replace any non-list with an empty list
t.equal(e.removeAtIndex(undefined, 0), [])
t.equal(e.removeAtIndex({0: 10, 1: 20}, 0), [])

// Validate index (any integer is ok)
t.throws(() => e.removeAtIndex([], 0.1), `satisfy test`)
t.throws(() => e.removeAtIndex(['one'], '0'), `satisfy test`)
t.throws(() => e.removeAtIndex(['one'], 'one'), `satisfy test`)
t.throws(() => e.removeAtIndex(['one'], null), `satisfy test`)
