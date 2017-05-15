'use strict'

const {call, expect, to} = require('../test-utils')
const {putBy, put, putIn, patchBy, patch, merge} = require('../lib/emerge')

function pass (a, b) {return b}

/**
 * putBy
 */

expect(call(putBy, pass),                  to.eq(undefined))
expect(call(putBy, pass, undefined, null), to.eq(null))
expect(call(putBy, pass, 1,         '1'),  to.eq('1'))

expect(call(putBy, pass, {one: 1, two: 2}, {one: 1, nan: NaN}), to.equal({one: 1, nan: NaN}))

{
  const prev = {one: 1, nan: NaN}
  expect(call(putBy, pass, prev, {one: 1, nan: NaN, nil: null}), to.eq(prev))
}

expect(call(putBy, pass, ['one'], ['one', NaN]), to.equal(['one', NaN]))

{
  const prev = ['one', NaN]
  expect(call(putBy, pass, prev, ['one', NaN]), to.eq(prev))
}

expect(call(putBy, pass, ['one'], ['two', 'three']), to.equal(['two', 'three']))

expect(call(putBy, pass, ['one'], {one: 1}), to.equal({one: 1}))

expect(call(putBy, pass, {one: 1}, ['one']), to.equal(['one']))

expect(
  call(
    putBy,
    ((prev, next, key) => prev + next + key),
    {one: 'prev', two: 'prev'},
    {one: 'next', three: 'next'}
  ),
  to.equal({one: 'prevnextone', three: 'undefinednextthree'})
)

expect(
  call(putBy, ((prev, next, key) => prev + next + key), ['one'], ['two', 'three']),
  to.equal(['onetwo0', 'undefinedthree1'])
)

expect(
  call(putBy, pass, {one: 1, two: 2, three: null}, {one: undefined, two: 2}),
  to.equal({two: 2})
)

// Non-plain objects are replaced wholesale
{
  const next = Object.create({one: 1})
  expect(call(putBy, pass, {one: 1}, next), to.eq(next))
}

/**
 * put
 *
 * Implemented with putBy, we only need to test patching
 */

expect(call(put, [{list: []}, NaN], [{list: []}, NaN]),     to.preserveReference)
expect(call(put, [{one: 1}],        [{one: 1, two: null}]), to.preserveReference)
expect(call(put, [{}],              [{nil: null}]),         to.preserveReference)

expect(
  call(put, [{one: 1}], [{one: 1}, NaN]),
  to.equal([{one: 1}, NaN])
)
expect(
  call(put, [{one: 1}], [{one: 1}, NaN]),
  ({args: [[dict]], returned: [newDict]}) => ({
    ok: newDict === dict,
    comment: `Must preserve inner references unaffected by merge`,
  })
)

/**
 * putIn
 *
 * Implemented with put, we only need to test nested patching
 */

// Append, insert
expect(call(putIn, ['one', 'two'], [0], 'three'), to.equal(['three', 'two']))
expect(call(putIn, ['one', 'two'], [1], 'three'), to.equal(['one', 'three']))
expect(call(putIn, [],             [0], 'one'),   to.equal(['one']))
expect(call(putIn, ['one'],        [1], 'two'),   to.equal(['one', 'two']))
expect(call(putIn, ['one', 'two'], [2], 'three'), to.equal(['one', 'two', 'three']))

expect(
  call(putIn, [{one: 'one'}, 'two', 'three'], [0], {one: 'one', two: null}),
  to.preserveReference
)

// Drop entire list when index is out of bounds
expect(call(putIn, ['one'], [2],  'two'), to.equal({2: 'two'}))
expect(call(putIn, ['one'], [-1], 'two'), to.equal({'-1': 'two'}))

// Drop entire list when key demands dict
expect(call(putIn, ['one', 'two'], ['0'], 'three'), to.equal({0: 'three'}))
// (comparison with integer index)
expect(call(putIn, ['one', 'two'], [0],   'one'),   to.equal(['one', 'two']))

// Create missing path
expect(call(putIn, {},        ['one'], 1),           to.equal({one: 1}))
expect(call(putIn, {},        ['one', 'two'], 2),    to.equal({one: {two: 2}}))
expect(call(putIn, {},        ['one', 'two'], null), to.equal({}))
expect(call(putIn, {one: []}, ['one', 'two'], null), to.equal({one: []}))

// Drop nil props
expect(call(putIn, {one: {two: 2}, three: 3}, ['one'],        null), to.equal({three: 3}))
expect(call(putIn, {one: {two: 2}, three: 3}, ['one', 'two'], null), to.equal({one: {}, three: 3}))
expect(call(putIn, {one: {two: {three: 3}}},  ['one', 'two'], null), to.equal({one: {}}))
// Including keys provided as natural numbers
expect(call(putIn, {one: {10: 'ten'}},    ['one', 10], null),        to.equal({one: {}}))
expect(call(putIn, {one: {two: {10: 3}}}, ['one', 'two', 10], null), to.equal({one: {two: {}}}))

const mixedDict = {one: 1, list: [{one: 1}, 'two', 'three']}

expect(call(putIn, mixedDict, ['one'], 1),            to.preserveReference)
expect(call(putIn, mixedDict, ['two'], null),         to.preserveReference)
expect(call(putIn, mixedDict, ['list', 0], {one: 1}), to.preserveReference)
expect(call(putIn, mixedDict, ['list', 1], 'two'),    to.preserveReference)

expect(
  call(putIn, [{one: 1}, 'two'], [0, 'one'], 'one!'),
  to.equal([{one: 'one!'}, 'two'])
)

expect(
  call(putIn, {list: ['one', 'two'], three: 3}, ['list', 0], 'one!'),
  to.equal({list: ['one!', 'two'], three: 3})
)

/**
 * patchBy
 *
 * We only need to test dict combination, other behaviour is identical to putBy
 */

// Combines dicts
expect(call(patchBy, pass, {one: 1}, {two: 2}), to.equal({one: 1, two: 2}))

// Combines dicts, dropping nil props
expect(call(patchBy, pass, {one: 1, two: 2}, {one: null, three: 3}), to.equal({two: 2, three: 3}))

// Dicts are combined only 1 level deep
expect(call(patchBy, pass, {one: {two: 2}}, {one: {three: 3}}), to.equal({one: {three: 3}}))
expect(call(patchBy, pass, [{one: 1}], [{two: 2}]), to.equal([{two: 2}]))

expect(
  call(patchBy, ((prev, next, key) => prev + next + key), {ten: 'prev'}, {ten: 'next', twenty: 'next'}),
  to.equal({ten: 'prevnextten', twenty: 'undefinednexttwenty'})
)

expect(
  call(patchBy, pass, {one: 1, two: 2, three: null}, {one: undefined, two: 2}),
  to.equal({two: 2})
)

expect(
  call(
    patchBy,
    ((prev, next, key) => prev + next + key),
    {one: 'prev', two: 'prev'},
    {one: 'next', three: 'next'}
  ),
  to.equal({one: 'prevnextone', two: 'prev', three: 'undefinednextthree'})
)

// Non-plain objects are replaced wholesale
{
  const next = Object.create({one: 1})
  expect(call(patchBy, pass, {one: 1}, next), to.eq(next))
}

/**
 * patch
 *
 * We only need to test dict combination, other behaviour is identical to put
 */

// Combines dicts
expect(call(patch, {one: 1}, {two: 2}), to.equal({one: 1, two: 2}))

// Combines dicts, dropping nil props
expect(call(patch, {one: 1, two: 2}, {one: null, three: 3}), to.equal({two: 2, three: 3}))

// Dicts are combined only 1 level deep
expect(call(patch, {one: {two: 2}}, {one: {three: 3}}), to.equal({one: {three: 3}}))
expect(call(patch, [{one: 1}], [{two: 2}]), to.equal([{two: 2}]))

expect(call(patch, {one: 1, nan: NaN}, {three: undefined}), to.preserveReference)

expect(call(patch, [{list: []}, NaN], [{list: []}]), to.equal([{list: []}]))
expect(
  call(patch, [{list: []}, NaN], [{list: []}]),
  ({args: [[dict]], returned: [newDict]}) => ({
    ok: newDict === dict,
    comment: `Must preserve inner references unaffected by merge`,
  })
)

/**
 * merge
 *
 * We only need to test deep dict combination, other behaviour is identical to put
 */

// Combines dicts at any depth
expect(
  call(merge, [{list: [{one: 1, two: 2}]}], [{list: [{two: null, three: 3}]}]),
  to.equal([{list: [{one: 1, three: 3}]}])
)
