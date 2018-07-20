'use strict'

const {is, eq, throws} = require('./utils')
const e = require('../')

/**
 * put
 */

// Dicts

eq(e.put(null, 'one', 10),      {one: 10})
eq(e.put(undefined, 'one', 10), {one: 10})
eq(e.put({}, 'one', 10),        {one: 10})
eq(e.put({one: 10}, 'two', 20), {one: 10, two: 20})

// Rejects non-dict, non-list operands
throws(() => e.put('not dict', 'one', 10),        `satisfy test`)
throws(() => e.put(0b01010101, 'one', 10),        `satisfy test`)
throws(() => e.put(Promise.resolve(), 'one', 10), `satisfy test`)
throws(() => e.put(e.put, 'one', 10),             `satisfy test`)

// In inner updates, restrictions are relaxed
eq(e.put({one: {}}, 'one', 10), {one: 10})
eq(e.put({one: []}, 'one', 10), {one: 10})
eq(e.put({one: 10}, 'one', {}), {one: {}})
eq(e.put({one: 10}, 'one', []), {one: []})

// Compatible with symbol keys
eq(e.put({}, Symbol.for('one'), 10), {[Symbol.for('one')]: 10})

// Coerces non-symbol keys to strings
eq(e.put(null, 0, 'one'),       {0: 'one'})
eq(e.put({}, 0, 'one'),         {0: 'one'})
eq(e.put({}, true, 'one'),      {true: 'one'})
eq(e.put({}, undefined, 'one'), {undefined: 'one'})

// Rejects non-primitive keys to help avoid stupid errors
throws(() => e.put(undefined, {}, undefined), `satisfy test`)
throws(() => e.put(undefined, [], undefined), `satisfy test`)

// Setting a property to nil removes it
eq(e.put({one: 10}, 'one', null),           {})
eq(e.put({one: 10}, 'one', undefined),      {})
eq(e.put(undefined, undefined, undefined), {})
eq(e.put({one: null}, 'one', null),        {})
eq(e.put({one: undefined}, 'one', null),   {})
eq(e.put({one: undefined}, 'one', null),   {})

// Removes all other nil properties
eq(e.put({one: null}, 'two', 20),                 {two: 20})
eq(e.put({one: undefined}, 'two', 20),            {two: 20})
eq(e.put({one: undefined, two: 20}, 'two', null), {})

// Preserves original if property would remain equal or missing
{
  const src = {one: {two: 20}, three: NaN}
  is(e.put(src, 'one', {two: 20}), src)
  is(e.put(src, 'three', NaN), src)
}
{
  const src = {one: NaN}
  is(e.put(src, 'two', null), src)
  is(e.put(src, 'two', undefined), src)
}

// Preserves inner references unaffected by put
{
  const src = {replace: {one: 10}, keep: [{nan: NaN, nil: null}]}
  const out = e.put(src, 'replace', 10)
  eq(out, {replace: 10, keep: [{nan: NaN, nil: null}]})
  is(src.keep, out.keep)
}

// Preserves inner references affected by put when result is equal
{
  const src = {one: {two: [20, NaN], three: [30]}}
  const out = e.put(src, 'one', {two: [20, NaN], three: 30})
  eq(out, {one: {two: [20, NaN], three: 30}})
  is(src.one.two, out.one.two)
}


// Lists

// Append
eq(e.put([], 0, 'one'),      ['one'])
eq(e.put(['one'], 1, 'two'), ['one', 'two'])
// Replace
eq(e.put(['one'], 0, 'three'),        ['three'])
eq(e.put(['one', 'two'], 0, 'three'), ['three', 'two'])
eq(e.put(['one', 'two'], 1, 'three'), ['one', 'three'])
eq(e.put(['one', 'two'], 0, null),    [null, 'two'])
// Validate index
throws(() => e.put([], -1, 'one'),  `satisfy test`)
throws(() => e.put([], 2, 'one'),   `out of bounds`)
throws(() => e.put([], '0', 'one'), `satisfy test`)

// Setting elements to nil doesn't completely remove them from a list
eq(e.put(['one', 'two'], 0, null), [null, 'two'])

// Preserves references when result is equal
{
  const src = [{one: 10}, {two: 20}]
  is(e.put(src, 0, {one: 10}), src)
  is(e.put(src, 1, {two: 20, three: null}), src)
}
{
  const src = [{one: 10}, {two: 20}]
  is(e.put(src, 1, {two: 20}), src)
}
{
  const src = [{list: []}, NaN]
  is(e.put(src, 0, {list: []}), src)
}

/**
 * putIn
 */

// Root

// Does a root-level put, replacing with the new value
// The new value may be a primitive
eq(e.putIn(undefined, [], undefined), undefined)
eq(e.putIn(undefined, [], null), null)
eq(e.putIn('one', [], {one: 10}), {one: 10})
eq(e.putIn({one: 10}, [], 'one'), 'one')

// Must preserve references where possible
{
  const src = {one: 10, two: {three: NaN}}
  is(e.putIn(src, [], {one: 10, two: {three: NaN}}), src)
}

// Dicts

// Accepts null and undefined
eq(e.putIn(null, ['one'], 10), {one: 10})
eq(e.putIn(undefined, ['one'], 10), {one: 10})

// Rejects non-dict, non-list operands
throws(() => eq(e.putIn('replace me', ['one'], 10), {one: 10}),      `satisfy test`)
throws(() => eq(e.putIn(0b01010101, ['one'], 10), {one: 10}),        `satisfy test`)
throws(() => eq(e.putIn(Promise.resolve(), ['one'], 10), {one: 10}), `satisfy test`)
throws(() => eq(e.putIn(e.putIn, ['one'], 10), {one: 10}),           `satisfy test`)

// In inner updates, restrictions are relaxed
eq(e.putIn({one: {}}, ['one'], 10), {one: 10})
eq(e.putIn({one: []}, ['one'], 10), {one: 10})
eq(e.putIn({one: 10}, ['one'], {}), {one: {}})
eq(e.putIn({one: 10}, ['one'], []), {one: []})

// Compatible with symbol keys
eq(e.putIn({}, [Symbol.for('one')], 10), {[Symbol.for('one')]: 10})

// Coerces non-symbol keys to strings
eq(e.putIn(null, [0], 'one'),       {0: 'one'})
eq(e.putIn({}, [0], 'one'),         {0: 'one'})
eq(e.putIn({}, [true], 'one'),      {true: 'one'})
eq(e.putIn({}, [undefined], 'one'), {undefined: 'one'})

// Rejects invalid paths to help avoid stupid errors
throws(() => e.putIn(undefined, undefined, undefined),   `satisfy test`)
throws(() => e.putIn(undefined, 'one', undefined),       `satisfy test`)
throws(() => e.putIn(undefined, {}, undefined),          `satisfy test`)
throws(() => e.putIn(undefined, ['one', {}], undefined), `satisfy test`)

// Lists

// Append
eq(e.putIn([], [0], 'one'), ['one'])
eq(e.putIn(['one'], [1], 'two'), ['one', 'two'])
eq(e.putIn(['one', 'two'], [0], 'three'), ['three', 'two'])
eq(e.putIn({one: ['two']}, ['one', 1], 'three'), {one: ['two', 'three']})
// Replace
eq(e.putIn(['one'], [0], 'two'), ['two'])
eq(e.putIn(['one', 'two'], [0], 'three'), ['three', 'two'])
eq(e.putIn(['one', 'two'], [1], 'three'), ['one', 'three'])
eq(e.putIn(['one', 'two'], [0], null), [null, 'two'])
eq(e.putIn({one: ['two', 'three']}, ['one', 0], null), {one: [null, 'three']})
// Validate index
throws(() => e.putIn([], [-1], 'one'), `satisfy test`)
throws(() => e.putIn([], [2], 'one'), `out of bounds`)
throws(() => e.putIn([], ['0'], 'one'), `satisfy test`)

// Setting elements to nil doesn't completely remove them from a list
eq(e.putIn(['one', 'two'], [0], null), [null, 'two'])

// Misc

// Converts non-structures to missing dicts at any depth
eq(e.putIn(undefined, ['one', 'two'], 20), {one: {two: 20}})
eq(e.putIn({three: 30}, ['one', 'two'], 20), {one: {two: 20}, three: 30})
eq(e.putIn({}, ['one', 0], 'one'), {one: {0: 'one'}})
eq(e.putIn([], [0, 'one', 'two'], 20), [{one: {two: 20}}])
eq(e.putIn(['one'], [1, 'two'], 20), ['one', {two: 20}])
eq(e.putIn({one: []}, ['one', 0, 'two'], 20), {one: [{two: 20}]})
// Even for keys that look like list indices
eq(e.putIn(undefined, [0, 1, 2], 'one'), {0: {1: {2: 'one'}}})

// Setting a property to nil removes it, while creating missing nested dicts
// and replacing non-structures with dicts. Doesn't remove list items.
eq(e.putIn(undefined, ['one'], null), {})
eq(e.putIn(undefined, ['one'], undefined), {})
eq(e.putIn({one: 10}, ['one'], null), {})
eq(e.putIn({one: 10}, ['one'], undefined), {})
eq(e.putIn({one: {two: 20}}, ['one'], null), {})
eq(e.putIn({one: null}, ['one'], null), {})
eq(e.putIn({one: undefined}, ['one'], null), {})
eq(e.putIn(undefined, [undefined], undefined), {})
eq(e.putIn(undefined, ['one', 'two'], null), {one: {}})
eq(e.putIn({one: {two: 20}}, ['one', 'two'], null), {one: {}})
eq(e.putIn({one: {two: 20}, three: 30}, ['one', 'two'], null), {one: {}, three: 30})
eq(e.putIn([], [0], null), [null])
eq(e.putIn([{one: 10}], [0, 'one'], null), [{}])
eq(e.putIn([{one: null, two: 20, three: 30}], [0, 'two'], null), [{three: 30}])

// Removes all nil properties
eq(e.putIn({one: null}, [], {one: null}), {})
eq(e.putIn({one: undefined}, [], {one: null}), {})
eq(e.putIn({one: null, two: 20}, ['two'], null), {})
// eq(e.putIn({one: null, two: 20}, ['two'], 20), {two: 20})
eq(e.putIn({one: {two: 20, three: null}, four: null}, ['one', 'two'], NaN), {one: {two: NaN}})
eq(e.putIn([{one: null}], [], [{}]), [{}])
eq(e.putIn({one: [{two: null, three: 30}]}, ['one', 0, 'three'], null), {one: [{}]})

// Preserves original if result would remain equal,
// or if property would remain equal or missing
{
  const src = {one: 10, two: [NaN]}
  const out = e.putIn(src, [], {one: 10, two: [NaN]})
  is(src, out)
}
{
  const src = {one: 10, two: [NaN]}
  const out = e.putIn(src, ['two'], [NaN])
  is(src, out)
}
{
  const src = {one: null}
  const out = e.putIn(src, ['two'], null)
  is(src, out)
}

// Preserves unaffected inner references
{
  const src = {replace: {one: 10}, keep: [{nan: NaN, nil: null}]}
  const out = e.putIn(src, ['replace'], 10)
  eq(out, {replace: 10, keep: [{nan: NaN, nil: null}]})
  is(src.keep, out.keep)
}
{
  const src = [{one: [10]}, {two: [20]}]
  const out = e.putIn(src, [1, 'two', 0], NaN)
  eq(out, [{one: [10]}, {two: [NaN]}])
  is(src.one, out.one)
}

// Preserves affected inner references when result is equal
{
  const src = {one: [{two: [NaN]}, {three: [30]}]}
  {
    const out = e.putIn(src, ['one'], [{two: [NaN]}, {four: 4}])
    eq(out, {one: [{two: [NaN]}, {four: 4}]})
    is(src.one[0], out.one[0])
  }
  {
    const out = e.putIn(src, ['one', 0, 'two'], [NaN])
    is(src, out)
  }
}
{
  const src = {one: 10, list: [{one: 10}, 'two', 'three']}
  is(e.putIn(src, ['one'],     10),        src)
  is(e.putIn(src, ['two'],     null),     src)
  is(e.putIn(src, ['list', 0], {one: 10}), src)
  is(e.putIn(src, ['list', 1], 'two'),    src)
}
{
  const src = [{one: 10}, {two: 20}]
  const out = e.putIn(src, [0], {one: 10})
  is(src, out)
}
{
  const src = [{one: 10}, {two: 20}]
  const out = e.putIn(src, [0, 'three'], 30)
  eq(out, [{one: 10, three: 30}, {two: 20}])
  is(src[1], out[1])
}

eq(
  e.putIn([{one: 10}, 'two'], [0, 'one'], 'one!'),
  [{one: 'one!'}, 'two']
)

eq(
  e.putIn({list: ['one', 'two'], three: 30}, ['list', 0], 'one!'),
  {list: ['one!', 'two'], three: 30}
)

/**
 * patch
 */

// Accepts null and undefined
eq(e.patch(undefined),            {})
eq(e.patch(undefined, null),      {})
eq(e.patch(undefined, {one: 10}), {one: 10})

// Rejects non-dict inputs
throws(() => e.patch('not dict'),         `satisfy test`)
throws(() => e.patch(['not dict']),       `satisfy test`)
throws(() => e.patch({}, 'not dict'),     `satisfy test`)
throws(() => e.patch({}, ['not dict']),   `satisfy test`)

// In inner updates, restrictions are relaxed
eq(e.patch({one: {}}, {one: 10}), {one: 10})
eq(e.patch({one: []}, {one: 10}), {one: 10})
eq(e.patch({one: 10}, {one: {}}), {one: {}})
eq(e.patch({one: 10}, {one: []}), {one: []})

// Combines dicts
eq(e.patch({one: 10}, null, {two: 20}, null, {three: 30}), {one: 10, two: 20, three: 30})

// Combines dicts, dropping nil props
eq(e.patch({one: 10, two: 20}, {one: null, three: 30}), {two: 20, three: 30})

// Dicts are combined only 1 level deep
eq(e.patch({one: {two: 20}}, {one: {three: 30}}), {one: {three: 30}})

// Preserves references where possible
{
  const src = {one: [{two: [NaN]}]}
  is(e.patch(src), src)
  is(e.patch(src, {}), src)
  is(e.patch(src, {one: [{two: [NaN]}]}), src)
}
{
  const src = {one: {two: 20}, three: [30]}
  const out = e.patch(src, {three: 30})
  eq(out, {one: {two: 20}, three: 30})
  is(src.one, out.one)
}

// Works with multiple args
eq(e.patch({one: 10}, {two: 20}, {three: 30}), {one: 10, two: 20, three: 30})
eq(e.patch(undefined, {two: 20}, {three: 30}), {two: 20, three: 30})

/**
 * merge
 */

// Accepts null and undefined
eq(e.merge(undefined),            {})
eq(e.merge(undefined, null),      {})
eq(e.merge(undefined, {one: 10}), {one: 10})

// Rejects non-dict inputs
throws(() => e.merge('not dict'),         `satisfy test`)
throws(() => e.merge(['not dict']),       `satisfy test`)
throws(() => e.merge({}, {}, 'not dict'), `satisfy test`)

// In inner updates, restrictions are relaxed
eq(e.merge({one: {}}, {one: 10}), {one: 10})
eq(e.merge({one: []}, {one: 10}), {one: 10})
eq(e.merge({one: 10}, {one: {}}), {one: {}})
eq(e.merge({one: 10}, {one: []}), {one: []})

// Combines dicts
eq(e.merge({one: 10}, null, {two: 20}, null, {three: 30}), {one: 10, two: 20, three: 30})

// Combines dicts, dropping nil props
eq(e.merge({one: 10, two: 20}, {one: null, three: 30}), {two: 20, three: 30})

// Dicts are combined at any depth
eq(e.merge({one: {two: 20}}, {one: {three: 30}}), {one: {two: 20, three: 30}})

// Preserves references where possible
{
  const src = {one: [{two: [NaN]}]}
  is(e.merge(src), src)
  is(e.merge(src, {}), src)
  is(e.merge(src, {one: [{two: [NaN]}]}), src)
}
{
  const src = {one: {two: 20}, three: [30]}
  const out = e.merge(src, {three: 30})
  eq(out, {one: {two: 20}, three: 30})
  is(src.one, out.one)
}

// Works with multiple args
eq(e.merge({one: 10}, {two: 20}, {three: 30}), {one: 10, two: 20, three: 30})
eq(e.merge(undefined, {two: 20}, {three: 30}), {two: 20, three: 30})

/**
 * insertAtIndex
 */

// Append
eq(e.insertAtIndex([], 0, 'one'), ['one'])
eq(e.insertAtIndex(['one'], 1, 'two'), ['one', 'two'])
eq(e.insertAtIndex(['one', 'two'], 2, 'three'), ['one', 'two', 'three'])

// Insert
eq(e.insertAtIndex(['one'], 0, 'two'), ['two', 'one'])
eq(e.insertAtIndex(['one', 'two'], 1, 'three'), ['one', 'three', 'two'])

// Accept nil
eq(e.insertAtIndex(null, 0, 'one'), ['one'])
eq(e.insertAtIndex(undefined, 0, 'one'), ['one'])

// Reject non-list operands
throws(() => e.insertAtIndex('not list', 0, 'value'), `satisfy test`)
throws(() => e.insertAtIndex(0b01010101, 0, 'value'), `satisfy test`)
throws(() => e.insertAtIndex({}, 0, 'value'),         `satisfy test`)

// Validate index
throws(() => e.insertAtIndex([], 0.1, 'one'),       `satisfy test`)
throws(() => e.insertAtIndex([], -1, 'one'),        `satisfy test`)
throws(() => e.insertAtIndex([], 2, 'one'),         `out of bounds`)
throws(() => e.insertAtIndex([], '0', 'one'),       `satisfy test`)
throws(() => e.insertAtIndex([], null, 'one'),      `satisfy test`)
throws(() => e.insertAtIndex(undefined, -1, 'one'), `satisfy test`)

/**
 * removeAtIndex
 */

// Remove, ignoring out-of-bounds index
eq(e.removeAtIndex([], 0), [])
eq(e.removeAtIndex(['one'], 0), [])
eq(e.removeAtIndex(['one'], 1), ['one'])
eq(e.removeAtIndex(['one'], -1), ['one'])
eq(e.removeAtIndex(['one', 'two'], 0), ['two'])
eq(e.removeAtIndex(['one', 'two'], 1), ['one'])
eq(e.removeAtIndex(['one', 'two'], 2), ['one', 'two'])

// Accept nil
eq(e.removeAtIndex(null, 0), [])
eq(e.removeAtIndex(undefined, 0), [])

// Reject non-list operands
throws(() => e.removeAtIndex('not list', 0), `satisfy test`)
throws(() => e.removeAtIndex(0b01010101, 0), `satisfy test`)
throws(() => e.removeAtIndex({}, 0),         `satisfy test`)

// Validate index (any integer is ok)
throws(() => e.removeAtIndex([], 0.1),        `satisfy test`)
throws(() => e.removeAtIndex(['one'], '0'),   `satisfy test`)
throws(() => e.removeAtIndex(['one'], 'one'), `satisfy test`)
throws(() => e.removeAtIndex(['one'], null),  `satisfy test`)
