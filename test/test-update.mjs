/* eslint-disable array-bracket-spacing */

import * as t from './utils.mjs'
import * as e from '../emerge.mjs'

/* put */

// Dicts

t.equal(e.put(null, 'one', 10),      {one: 10})
t.equal(e.put(undefined, 'one', 10), {one: 10})
t.equal(e.put({}, 'one', 10),        {one: 10})
t.equal(e.put({one: 10}, 'two', 20), {one: 10, two: 20})

// Rejects non-dict, non-list operands
t.throws(() => e.put('not dict', 'one', 10),        `satisfy test`)
t.throws(() => e.put(0b01010101, 'one', 10),        `satisfy test`)
t.throws(() => e.put(Promise.resolve(), 'one', 10), `satisfy test`)
t.throws(() => e.put(e.put, 'one', 10),             `satisfy test`)

// In inner updates, operand restrictions are relaxed
t.equal(e.put({one: {}}, 'one', 10), {one: 10})
t.equal(e.put({one: []}, 'one', 10), {one: 10})
t.equal(e.put({one: 10}, 'one', {}), {one: {}})
t.equal(e.put({one: 10}, 'one', []), {one: []})

// Coerces finite numeric keys to strings
t.equal(e.put(null, 0,       'one'), {0: 'one'})
t.equal(e.put({},   0,       'one'), {0: 'one'})
t.equal(e.put({},   123.456, 'one'), {123.456: 'one'})

// Rejects invalid keys to help avoid stupid errors. (Breaking change in 0.5.0:
// also rejects primitive keys that aren't strings or finite numbers.)
t.throws(() => e.put({}, NaN,               undefined), `satisfy test`)
t.throws(() => e.put({}, Infinity,          undefined), `satisfy test`)
t.throws(() => e.put({}, true,              undefined), `satisfy test`)
t.throws(() => e.put({}, undefined,         undefined), `satisfy test`)
t.throws(() => e.put({}, {},                undefined), `satisfy test`)
t.throws(() => e.put({}, [],                undefined), `satisfy test`)
t.throws(() => e.put({}, Symbol.for('one'), undefined), `unexpected symbol`)

// No special rules for setting a nil property (breaking change in 0.5.0)
t.equal(e.put({one: 10},        'one', null),        {one: null})
t.equal(e.put({one: null},      'one', null),        {one: null})
t.equal(e.put({one: 10},        'one', undefined),   {one: undefined})
t.equal(e.put({one: undefined}, 'one', undefined),   {one: undefined})
t.equal(e.put({one: undefined}, 'one', null),        {one: null})
t.equal(e.put({one: null},      'one', undefined),   {one: undefined})

// Does not remove existing nil properties (breaking change in 0.5.0)
t.equal(e.put({one: null},               'two', 20),   {one: null, two: 20})
t.equal(e.put({one: undefined},          'two', 20),   {one: undefined, two: 20})
t.equal(e.put({one: undefined, two: 20}, 'two', null), {one: undefined, two: null})

// Preserves original if result would remain equal
{
  const src = {one: {two: 20}, three: NaN}
  t.is(e.put(src, 'one', {two: 20}), src)
  t.is(e.put(src, 'three', NaN), src)
}

// Preserves inner references unaffected by put
{
  const src = {replace: {one: 10}, keep: [{nan: NaN, nil: null}]}
  const out = e.put(src, 'replace', 10)
  t.equal(out, {replace: 10, keep: [{nan: NaN, nil: null}]})
  t.is(src.keep, out.keep)
}

// Preserves inner references affected by put when result is equal
{
  const src = {one: {two: [20, NaN], three: [30]}}
  const out = e.put(src, 'one', {two: [20, NaN], three: 30})
  t.equal(out, {one: {two: [20, NaN], three: 30}})
  t.is(src.one.two, out.one.two)
}

// Lists

// Append
t.equal(e.put([], 0, 'one'),      ['one'])
t.equal(e.put(['one'], 1, 'two'), ['one', 'two'])

// Replace
t.equal(e.put(['one'], 0, 'three'),        ['three'])
t.equal(e.put(['one', 'two'], 0, 'three'), ['three', 'two'])
t.equal(e.put(['one', 'two'], 1, 'three'), ['one', 'three'])
t.equal(e.put(['one', 'two'], 0, null),    [null, 'two'])

// Validate index
t.throws(() => e.put([], -1, 'one'),  `satisfy test`)
t.throws(() => e.put([], 2, 'one'),   `out of bounds`)
t.throws(() => e.put([], '0', 'one'), `satisfy test`)

// Setting elements to nil doesn't completely remove them from a list
t.equal(e.put(['one', 'two'], 0, null), [null, 'two'])

// Preserves references when result is equal
{
  const src = [{one: 10}, {two: NaN}]
  t.is(e.put(src, 0, {one: 10}), src)
  t.is(e.put(src, 1, {two: NaN}), src)
}
{
  const src = [{one: 10}, {two: 20}]
  t.is(e.put(src, 1, {two: 20}), src)
}
{
  const src = [{list: []}, NaN]
  t.is(e.put(src, 0, {list: []}), src)
}

/* putIn */

// Root

// Does a root-level put, replacing with the new value
// The new value may be a primitive
t.equal(e.putIn(undefined, [], undefined), undefined)
t.equal(e.putIn(undefined, [], null), null)
t.equal(e.putIn('one', [], {one: 10}), {one: 10})
t.equal(e.putIn({one: 10}, [], 'one'), 'one')

// Must preserve references where possible
{
  const src = {one: 10, two: {three: NaN}}
  t.is(e.putIn(src, [], {one: 10, two: {three: NaN}}), src)
}

// Dicts

// Accepts nil, defaulting to `{}`
t.equal(e.putIn(null,      ['one'], 10), {one: 10})
t.equal(e.putIn(undefined, ['one'], 10), {one: 10})

// Rejects non-dict, non-list operands when path is non-empty
t.throws(() => e.putIn('replace me',      ['one'], 10), `satisfy test`)
t.throws(() => e.putIn(0b01010101,        ['one'], 10), `satisfy test`)
t.throws(() => e.putIn(Promise.resolve(), ['one'], 10), `satisfy test`)
t.throws(() => e.putIn(e.putIn,           ['one'], 10), `satisfy test`)

// In inner updates, operand restrictions are relaxed
t.equal(e.putIn({one: {}}, ['one'], 10), {one: 10})
t.equal(e.putIn({one: []}, ['one'], 10), {one: 10})
t.equal(e.putIn({one: 10}, ['one'], {}), {one: {}})
t.equal(e.putIn({one: 10}, ['one'], []), {one: []})

// Coerces finite numeric keys to strings
t.equal(e.putIn(null, [0],       'one'), {0: 'one'})
t.equal(e.putIn({},   [0],       'one'), {0: 'one'})
t.equal(e.putIn({},   [123.456], 'one'), {123.456: 'one'})

// Rejects invalid paths to help avoid stupid errors. (Breaking change in 0.5.0:
// also rejects primitive keys that aren't strings or finite numbers.)
t.throws(() => e.putIn({}, undefined,           undefined), `satisfy test`)
t.throws(() => e.putIn({}, 'one',               undefined), `satisfy test`)
t.throws(() => e.putIn({}, {},                  undefined), `satisfy test`)
t.throws(() => e.putIn({}, ['one', {}],         undefined), `satisfy test`)
t.throws(() => e.putIn({}, [Infinity],          undefined), `satisfy test`)
t.throws(() => e.putIn({}, [true],              undefined), `satisfy test`)
t.throws(() => e.putIn({}, [undefined],         undefined), `satisfy test`)
t.throws(() => e.putIn({}, [{}],                undefined), `satisfy test`)
t.throws(() => e.putIn({}, [[]],                undefined), `satisfy test`)
t.throws(() => e.putIn({}, [Symbol.for('one')], undefined), `unexpected symbol`)

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
t.equal(e.putIn(undefined, ['one', 'two'], 20), {one: {two: 20}})
t.equal(e.putIn({three: 30}, ['one', 'two'], 20), {one: {two: 20}, three: 30})
t.equal(e.putIn({}, ['one', 0], 'one'), {one: {0: 'one'}})
t.equal(e.putIn([], [0, 'one', 'two'], 20), [{one: {two: 20}}])
t.equal(e.putIn(['one'], [1, 'two'], 20), ['one', {two: 20}])
t.equal(e.putIn({one: []}, ['one', 0, 'two'], 20), {one: [{two: 20}]})
// Even for keys that look like list indexes
t.equal(e.putIn(undefined, [0, 1, 2], 'one'), {0: {1: {2: 'one'}}})

// No special rules for setting a nil property (breaking change in 0.5.0)
// No special rules for setting a nil property (breaking change in 0.5.0)
t.equal(e.putIn(undefined,                          ['one'],        null),      {one: null})
t.equal(e.putIn({one: undefined},                   ['one'],        null),      {one: null})
t.equal(e.putIn({one: 10},                          ['one'],        null),      {one: null})
t.equal(e.putIn(undefined,                          ['one'],        undefined), {one: undefined})
t.equal(e.putIn({one: undefined},                   ['one'],        undefined), {one: undefined})
t.equal(e.putIn({one: 10},                          ['one'],        undefined), {one: undefined})
t.equal(e.putIn({one: {two: 20}},                   ['one'],        null),      {one: null})
t.equal(e.putIn({one: null},                        ['one'],        null),      {one: null})
t.equal(e.putIn({one: null},                        ['one'],        undefined), {one: undefined})
t.equal(e.putIn({one: undefined},                   ['one'],        null),      {one: null})
t.equal(e.putIn(undefined,                          ['one', 'two'], null),      {one: {two: null}})
t.equal(e.putIn({one: {two: 20}},                   ['one', 'two'], null),      {one: {two: null}})
t.equal(e.putIn({one: {two: 20}, three: 30},        ['one', 'two'], null),      {one: {two: null}, three: 30})
t.equal(e.putIn([],                                 [0],            null),      [null])
t.equal(e.putIn([{one: 10}],                        [0, 'one'],     null),      [{one: null}])
t.equal(e.putIn([{one: null, two: 20, three: 30}],  [0, 'two'],     null),      [{one: null, two: null, three: 30}])

// Does not remove existing nil properties (breaking change in 0.5.0)
t.equal(e.putIn({one: null},                   [],             {one: null}), {one: null})
t.equal(e.putIn({one: undefined},              [],             {one: null}), {one: null})
t.equal(e.putIn({one: null},                   ['two'],        20),          {one: null, two: 20})
t.equal(e.putIn({one: undefined},              ['two'],        20),          {one: undefined, two: 20})
t.equal(e.putIn({one: undefined, two: 20},     ['two'],        null),        {one: undefined, two: null})
t.equal(e.putIn({one: null, two: 20},          ['two'],        null),        {one: null, two: null})
t.equal(e.putIn({one: null, two: 20},          ['two'],        20),          {one: null, two: 20})
t.equal(e.putIn({one: {two: 20}, three: null}, ['one', 'two'], NaN),         {one: {two: NaN}, three: null})
t.equal(e.putIn([{one: null, two: 20}],        [0, 'two'],     null),        [{one: null, two: null}])

// Preserves original if result would remain equal
{
  const src = {one: 10, two: [NaN]}
  const out = e.putIn(src, [], {one: 10, two: [NaN]})
  t.is(src, out)
}
{
  const src = {one: 10, two: [NaN]}
  const out = e.putIn(src, ['two'], [NaN])
  t.is(src, out)
}

// Preserves unaffected inner references
{
  const src = {replace: {one: 10}, keep: [{nan: NaN, nil: null}]}
  const out = e.putIn(src, ['replace'], 10)
  t.equal(out, {replace: 10, keep: [{nan: NaN, nil: null}]})
  t.is(src.keep, out.keep)
}
{
  const src = [{one: [10]}, {two: [20]}]
  const out = e.putIn(src, [1, 'two', 0], NaN)
  t.equal(out, [{one: [10]}, {two: [NaN]}])
  t.is(src.one, out.one)
}

// Preserves affected inner references when result is equal
{
  const src = {one: [{two: [NaN]}, {three: [30]}]}
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
  const src = {one: 10, list: [{one: 10}, 'two', 'three']}
  t.is(e.putIn(src, ['one'],     10),        src)
  t.is(e.putIn(src, ['list', 0], {one: 10}), src)
  t.is(e.putIn(src, ['list', 1], 'two'),    src)
}
{
  const src = [{one: 10}, {two: 20}]
  const out = e.putIn(src, [0], {one: 10})
  t.is(src, out)
}
{
  const src = [{one: 10}, {two: 20}]
  const out = e.putIn(src, [0, 'three'], 30)
  t.equal(out, [{one: 10, three: 30}, {two: 20}])
  t.is(src[1], out[1])
}

t.equal(
  e.putIn([{one: 10}, 'two'], [0, 'one'], 'one!'),
  [{one: 'one!'}, 'two'],
)

t.equal(
  e.putIn({list: ['one', 'two'], three: 30}, ['list', 0], 'one!'),
  {list: ['one!', 'two'], three: 30},
)

/* patch */

// Accepts nil, defaulting to `{}`
t.equal(e.patch(undefined),            {})
t.equal(e.patch(undefined, null),      {})
t.equal(e.patch(undefined, {one: 10}), {one: 10})

// Rejects non-dict inputs
t.throws(() => e.patch('not dict'),         `satisfy test`)
t.throws(() => e.patch(['not dict']),       `satisfy test`)
t.throws(() => e.patch({}, 'not dict'),     `satisfy test`)
t.throws(() => e.patch({}, ['not dict']),   `satisfy test`)

// In inner updates, operand restrictions are relaxed
t.equal(e.patch({one: {}}, {one: 10}), {one: 10})
t.equal(e.patch({one: []}, {one: 10}), {one: 10})
t.equal(e.patch({one: 10}, {one: {}}), {one: {}})
t.equal(e.patch({one: 10}, {one: []}), {one: []})

// Compatible with symbol keys
t.equal(e.patch({}, {[Symbol.for('one')]: 10}), {[Symbol.for('one')]: 10})

// Combines dicts
t.equal(e.patch({one: 10}, null, {two: 20}, null, {three: 30}), {one: 10, two: 20, three: 30})

// Does not remove nil properties (breaking change in 0.5.0)
t.equal(e.patch({one: 10, two: 20}, {one: null, three: 30}), {one: null, two: 20, three: 30})

// Dicts are combined only 1 level deep
t.equal(e.patch({one: {two: 20}}, {one: {three: 30}}), {one: {three: 30}})

// Preserves references where possible
{
  const src = {one: [{two: [NaN]}]}
  t.is(e.patch(src), src)
  t.is(e.patch(src, {}), src)
  t.is(e.patch(src, {one: [{two: [NaN]}]}), src)
}
{
  const src = {one: {two: 20}, three: [30]}
  const out = e.patch(src, {three: 30})
  t.equal(out, {one: {two: 20}, three: 30})
  t.is(src.one, out.one)
}

// Works with multiple args
t.equal(e.patch({one: 10}, {two: 20}, {three: 30}), {one: 10, two: 20, three: 30})
t.equal(e.patch(undefined, {two: 20}, {three: 30}), {two: 20, three: 30})

/* merge */

// Accepts nil, defaulting to `{}`
t.equal(e.merge(undefined),            {})
t.equal(e.merge(undefined, null),      {})
t.equal(e.merge(undefined, {one: 10}), {one: 10})

// Rejects non-dict inputs
t.throws(() => e.merge('not dict'),         `satisfy test`)
t.throws(() => e.merge(['not dict']),       `satisfy test`)
t.throws(() => e.merge({}, {}, 'not dict'), `satisfy test`)

// In inner updates, operand restrictions are relaxed
t.equal(e.merge({one: {}}, {one: 10}), {one: 10})
t.equal(e.merge({one: []}, {one: 10}), {one: 10})
t.equal(e.merge({one: 10}, {one: {}}), {one: {}})
t.equal(e.merge({one: 10}, {one: []}), {one: []})

// Compatible with symbol keys
t.equal(e.merge({}, {[Symbol.for('one')]: 10}), {[Symbol.for('one')]: 10})

// Combines dicts
t.equal(e.merge({one: 10}, null, {two: 20}, null, {three: 30}), {one: 10, two: 20, three: 30})

// Does not remove nil properties (breaking change in 0.5.0)
t.equal(e.merge({one: 10, two: 20}, {one: null, three: 30}), {one: null, two: 20, three: 30})

// Dicts are combined at any depth
t.equal(e.merge({one: {two: 20}}, {one: {three: 30}}), {one: {two: 20, three: 30}})

// Preserves references where possible
{
  const src = {one: [{two: [NaN]}]}
  t.is(e.merge(src), src)
  t.is(e.merge(src, {}), src)
  t.is(e.merge(src, {one: [{two: [NaN]}]}), src)
}
{
  const src = {one: {two: 20}, three: [30]}
  const out = e.merge(src, {three: 30})
  t.equal(out, {one: {two: 20}, three: 30})
  t.is(src.one, out.one)
}

// Works with multiple args
t.equal(e.merge({one: 10}, {two: 20}, {three: 30}), {one: 10, two: 20, three: 30})
t.equal(e.merge(undefined, {two: 20}, {three: 30}), {two: 20, three: 30})

/* insert */

// Append
t.equal(e.insert([], 0, 'one'), ['one'])
t.equal(e.insert(['one'], 1, 'two'), ['one', 'two'])
t.equal(e.insert(['one', 'two'], 2, 'three'), ['one', 'two', 'three'])

// Insert
t.equal(e.insert(['one'], 0, 'two'), ['two', 'one'])
t.equal(e.insert(['one', 'two'], 1, 'three'), ['one', 'three', 'two'])

// Accept nil
t.equal(e.insert(null, 0, 'one'), ['one'])
t.equal(e.insert(undefined, 0, 'one'), ['one'])

// Reject non-list operands
t.throws(() => e.insert('not list', 0, 'value'), `satisfy test`)
t.throws(() => e.insert(0b01010101, 0, 'value'), `satisfy test`)
t.throws(() => e.insert({}, 0, 'value'),         `satisfy test`)

// Validate index
t.throws(() => e.insert([], 0.1, 'one'),       `satisfy test`)
t.throws(() => e.insert([], -1, 'one'),        `satisfy test`)
t.throws(() => e.insert([], 2, 'one'),         `out of bounds`)
t.throws(() => e.insert([], '0', 'one'),       `satisfy test`)
t.throws(() => e.insert([], null, 'one'),      `satisfy test`)
t.throws(() => e.insert(undefined, -1, 'one'), `satisfy test`)

/* remove */

// Dicts

// Accept nil, defaulting to `{}` for any key
t.equal(e.remove(null,      'one'), {})
t.equal(e.remove(undefined, 'one'), {})
t.equal(e.remove(null,      0),     {})
t.equal(e.remove(undefined, 0),     {})

t.equal(e.remove({},                            'one'), {})
t.equal(e.remove({one: 10},                     'one'), {})
t.equal(e.remove({one: 10},                     'two'), {one: 10})
t.equal(e.remove({one: 10, two: 20},            'two'), {one: 10})
t.equal(e.remove({one: 10, two: 20, three: 30}, 'two'), {one: 10, three: 30})

// Rejects non-dict, non-list operands
t.throws(() => e.remove('not dict',        'one'), `satisfy test`)
t.throws(() => e.remove(0b01010101,        'one'), `satisfy test`)
t.throws(() => e.remove(Promise.resolve(), 'one'), `satisfy test`)
t.throws(() => e.remove(e.remove,          'one'), `satisfy test`)

// Coerces finite numeric keys to strings
t.equal(e.remove({0: 10},         0),       {})
t.equal(e.remove({'123.456': 10}, 123.456), {})

// Rejects invalid keys to help avoid stupid errors. (Breaking change in 0.5.0:
// also rejects primitive keys that aren't strings or finite numbers.)
t.throws(() => e.remove({}, NaN),               `satisfy test`)
t.throws(() => e.remove({}, Infinity),          `satisfy test`)
t.throws(() => e.remove({}, true),              `satisfy test`)
t.throws(() => e.remove({}, undefined),         `satisfy test`)
t.throws(() => e.remove({}, {}),                `satisfy test`)
t.throws(() => e.remove({}, []),                `satisfy test`)
t.throws(() => e.remove({}, Symbol.for('one')), `unexpected symbol`)

// Does remove existing nil properties
t.equal(e.remove({one: null},      'one'), {})
t.equal(e.remove({one: undefined}, 'one'), {})

// Preserves original if result would remain equal
{
  const src = {one: {two: 20}, three: NaN}
  t.is(e.remove(src, 'two'), src)
}

// Preserves unaffected inner references
{
  const src = {remove: {one: 10}, keep: [{nan: NaN, nil: null}]}
  const out = e.remove(src, 'remove')
  t.equal(out, {keep: [{nan: NaN, nil: null}]})
  t.is(src.keep, out.keep)
}

// Lists

// Removes first
t.equal(e.remove(['one', 'two', 'three'], 0), ['two', 'three'])

// Removes middle
t.equal(e.remove(['one', 'two', 'three'], 1), ['one', 'three'])

// Removes last
t.equal(e.remove(['one', 'two', 'three'], 2), ['one', 'two'])

// Ignores out-of-bounds index
t.equal(e.remove([],                      -1), [])
t.equal(e.remove([],                      0),  [])
t.equal(e.remove([],                      1),  [])
t.equal(e.remove(['one', 'two', 'three'], -1), ['one', 'two', 'three'])
t.equal(e.remove(['one', 'two', 'three'], 3),  ['one', 'two', 'three'])

// Does remove existing nil properties
t.equal(e.remove([10, null],      1), [10])
t.equal(e.remove([10, undefined], 1), [10])

// Validates index (any integer is ok, anything else is not)
t.throws(() => e.remove([],      0.1),   `satisfy test`)
t.throws(() => e.remove(['one'], '0'),   `satisfy test`)
t.throws(() => e.remove(['one'], 'one'), `satisfy test`)
t.throws(() => e.remove(['one'], null),  `satisfy test`)

// Preserves original if result would remain equal
{
  const src = [{one: {two: 20}}]
  t.is(e.remove(src, 1), src)
}

// Preserves unaffected inner references
{
  const src = [{one: 10}, {two: 20}]
  const out = e.remove(src, 0)
  t.equal(out, [{two: 20}])
  t.is(src[1], out[0])
}

/* removeIn */

// Root

// Removes anything at root level
t.equal(e.removeIn(null,              []), undefined)
t.equal(e.removeIn(undefined,         []), undefined)
t.equal(e.removeIn('replace me',      []), undefined)
t.equal(e.removeIn(NaN,               []), undefined)
t.equal(e.removeIn(Infinity,          []), undefined)
t.equal(e.removeIn(0b01010101,        []), undefined)
t.equal(e.removeIn({},                []), undefined)
t.equal(e.removeIn([],                []), undefined)
t.equal(e.removeIn(Promise.resolve(), []), undefined)
t.equal(e.removeIn(e.removeIn,        []), undefined)

// Dicts

// Accepts nil, defaulting to `{}` for any path
t.equal(e.removeIn(null,      ['one']),        {})
t.equal(e.removeIn(undefined, ['one']),        {})
t.equal(e.removeIn(null,      ['one', 'two']), {})
t.equal(e.removeIn(undefined, ['one', 'two']), {})

// Rejects non-dict, non-list operands when path is non-empty
t.throws(() => e.removeIn('replace me',      ['one']), `satisfy test`)
t.throws(() => e.removeIn(0b01010101,        ['one']), `satisfy test`)
t.throws(() => e.removeIn(Promise.resolve(), ['one']), `satisfy test`)
t.throws(() => e.removeIn(e.removeIn,        ['one']), `satisfy test`)

// In inner updates, operand restrictions are relaxed
t.equal(e.removeIn({one: 10, two: 'replace me'},      ['two']), {one: 10})
t.equal(e.removeIn({one: 10, two: 0b01010101},        ['two']), {one: 10})
t.equal(e.removeIn({one: 10, two: Promise.resolve()}, ['two']), {one: 10})
t.equal(e.removeIn({one: 10, two: e.removeIn},        ['two']), {one: 10})

// Coerces finite numeric keys to strings
t.equal(e.removeIn({one: 10, 0: 10},         [0]),       {one: 10})
t.equal(e.removeIn({one: 10, '123.456': 10}, [123.456]), {one: 10})

// Supports nested paths
t.equal(e.removeIn({one: 10, two: {three: {four: 40}}}, ['two']),                  {one: 10})
t.equal(e.removeIn({one: 10, two: {three: {four: 40}}}, ['two', 'three']),         {one: 10, two: {}})
t.equal(e.removeIn({one: 10, two: {three: {four: 40}}}, ['two', 'three', 'four']), {one: 10, two: {three: {}}})

// Does remove existing nil properties
t.equal(e.removeIn({one: 10, two: null},               ['two']),          {one: 10})
t.equal(e.removeIn({one: 10, two: undefined},          ['two']),          {one: 10})
t.equal(e.removeIn({one: 10, two: {three: null}},      ['two', 'three']), {one: 10, two: {}})
t.equal(e.removeIn({one: 10, two: {three: undefined}}, ['two', 'three']), {one: 10, two: {}})

// Rejects invalid paths to help avoid stupid errors. (Breaking change in 0.5.0:
// also rejects primitive keys that aren't strings or finite numbers.)
t.throws(() => e.removeIn({}, undefined),           `satisfy test`)
t.throws(() => e.removeIn({}, 'one'),               `satisfy test`)
t.throws(() => e.removeIn({}, {}),                  `satisfy test`)
t.throws(() => e.removeIn({}, ['one', {}]),         `satisfy test`)
t.throws(() => e.removeIn({}, [Infinity]),          `satisfy test`)
t.throws(() => e.removeIn({}, [true]),              `satisfy test`)
t.throws(() => e.removeIn({}, [undefined]),         `satisfy test`)
t.throws(() => e.removeIn({}, [{}]),                `satisfy test`)
t.throws(() => e.removeIn({}, [[]]),                `satisfy test`)
t.throws(() => e.removeIn({}, [Symbol.for('one')]), `unexpected symbol`)

// Preserves original if result would remain equal
{
  const src = {one: {two: 20}, three: NaN}
  t.is(e.removeIn(src, ['two']), src)
  t.is(e.removeIn(src, ['one', 'two', 'three']), src)
}

// Preserves unaffected inner references
{
  const src = {remove: {one: 10}, keep: [{nan: NaN, nil: null}]}
  const out = e.removeIn(src, ['remove'])
  t.equal(out, {keep: [{nan: NaN, nil: null}]})
  t.is(src.keep, out.keep)
}

// Lists

// Removes first
t.equal(e.removeIn(['one', 'two', 'three'], [0]), ['two', 'three'])

// Removes middle
t.equal(e.removeIn(['one', 'two', 'three'], [1]), ['one', 'three'])

// Removes last
t.equal(e.removeIn(['one', 'two', 'three'], [2]), ['one', 'two'])

// Ignores out-of-bounds indexes
t.equal(e.removeIn(['one', 'two', 'three'], [3]),  ['one', 'two', 'three'])
t.equal(e.removeIn(['one', 'two', 'three'], [-1]), ['one', 'two', 'three'])

// Supports nested paths
t.equal(e.removeIn([['one'], ['two'], ['three']], [0, 0]), [[     ], ['two'], ['three']])
t.equal(e.removeIn([['one'], ['two'], ['three']], [0, 1]), [['one'], ['two'], ['three']])
t.equal(e.removeIn([['one'], ['two'], ['three']], [1, 0]), [['one'], [     ], ['three']])
t.equal(e.removeIn([['one'], ['two'], ['three']], [1, 1]), [['one'], ['two'], ['three']])
t.equal(e.removeIn([['one'], ['two'], ['three']], [2, 0]), [['one'], ['two'], [       ]])
t.equal(e.removeIn([['one'], ['two'], ['three']], [2, 1]), [['one'], ['two'], ['three']])
t.equal(e.removeIn([['one'], ['two'], ['three']], [3, 0]), [['one'], ['two'], ['three']])

// Does remove existing nil properties
t.equal(e.removeIn([10, null],            [1]),    [10])
t.equal(e.removeIn([10, undefined],       [1]),    [10])
t.equal(e.removeIn([10, [20, null]],      [1, 1]), [10, [20]])
t.equal(e.removeIn([10, [20, undefined]], [1, 1]), [10, [20]])

// Preserves original if result would remain equal
{
  const src = [{one: {two: 20}}]
  t.is(e.removeIn(src, [1]), src)
}

// Preserves unaffected inner references
{
  const src = [{one: 10}, {two: 20}]
  const out = e.removeIn(src, [0])
  t.equal(out, [{two: 20}])
  t.is(src[1], out[0])
}
