'use strict'

const t = require('./utils')
const e = require('../')

function pass(a, b) {return b}

/**
 * putBy
 */

t.is(e.putBy(pass),                  undefined)
t.is(e.putBy(pass, undefined, null), null)
t.is(e.putBy(pass, 1,         '1'),  '1')

t.equal(e.putBy(pass, {one: 1, two: 2}, {one: 1, nan: NaN}), {one: 1, nan: NaN})

{
  const prev = {one: 1, nan: NaN}
  t.is(e.putBy(pass, prev, {one: 1, nan: NaN, nil: null}), prev)
}

t.equal(e.putBy(pass, ['one'], ['one', NaN]), ['one', NaN])

{
  const prev = ['one', NaN]
  t.is(e.putBy(pass, prev, ['one', NaN]), prev)
}

t.equal(e.putBy(pass, ['one'], ['two', 'three']), ['two', 'three'])

t.equal(e.putBy(pass, ['one'], {one: 1}), {one: 1})

t.equal(e.putBy(pass, {one: 1}, ['one']), ['one'])

t.equal(
  e.putBy(
    ((prev, next, key) => prev + next + key),
    {one: 'prev', two: 'prev'},
    {one: 'next', three: 'next'}
  ),
  {one: 'prevnextone', three: 'undefinednextthree'}
)

t.equal(
  e.putBy(((prev, next, key) => prev + next + key), ['one'], ['two', 'three']),
  ['onetwo0', 'undefinedthree1']
)

t.equal(
  e.putBy(pass, {one: 1, two: 2, three: null}, {one: undefined, two: 2}),
  {two: 2}
)

// Non-plain objects are replaced wholesale
{
  const next = Object.create({one: 1})
  t.is(e.putBy(pass, {one: 1}, next), next)
}

/**
 * put
 *
 * Implemented with putBy, we only need to test patching
 */

{
  const src = [{list: []}, NaN]
  t.is(e.put(src, [{list: []}, NaN]), src, `must preserve reference`)
}

{
  const src = [{one: 1}]
  t.is(e.put(src, [{one: 1, two: null}]), src, `must preserve reference`)
}

{
  const src = [{}]
  t.is(e.put(src, [{nil: null}]), src, `must preserve reference`)
}

t.equal(e.put([{one: 1}], [{one: 1}, NaN]), [{one: 1}, NaN])

{
  const src = [{one: 1}]
  const out = e.put(src, [{one: 1}, NaN])
  t.is(src[0], out[0], `must preserve inner references unaffected by merge`)
}

/**
 * putIn
 *
 * Implemented with put, we only need to test nested patching
 */

// Append, insert
t.equal(e.putIn(['one', 'two'], [0], 'three'), ['three', 'two'])
t.equal(e.putIn(['one', 'two'], [1], 'three'), ['one', 'three'])
t.equal(e.putIn([],             [0], 'one'),   ['one'])
t.equal(e.putIn(['one'],        [1], 'two'),   ['one', 'two'])
t.equal(e.putIn(['one', 'two'], [2], 'three'), ['one', 'two', 'three'])

{
  const src = [{one: 'one'}, 'two', 'three']
  t.is(e.putIn(src, [0], {one: 'one', two: null}), src, `must preserve reference`)
}

// Drop entire list when index is out of bounds
t.equal(e.putIn(['one'], [2],  'two'), {2: 'two'})
t.equal(e.putIn(['one'], [-1], 'two'), {'-1': 'two'})

// Drop entire list when key demands dict
t.equal(e.putIn(['one', 'two'], ['0'], 'three'), {0: 'three'})
// (comparison with integer index)
t.equal(e.putIn(['one', 'two'], [0], 'one'), ['one', 'two'])

// Create missing path
t.equal(e.putIn({},        ['one'], 1),           {one: 1})
t.equal(e.putIn({},        ['one', 'two'], 2),    {one: {two: 2}})
t.equal(e.putIn({},        ['one', 'two'], null), {})
t.equal(e.putIn({one: []}, ['one', 'two'], null), {one: []})

// Drop nil props
t.equal(e.putIn({one: {two: 2}, three: 3}, ['one'],        null), {three: 3})
t.equal(e.putIn({one: {two: 2}, three: 3}, ['one', 'two'], null), {one: {}, three: 3})
t.equal(e.putIn({one: {two: {three: 3}}},  ['one', 'two'], null), {one: {}})
// Including keys provided as natural numbers
t.equal(e.putIn({one: {10: 'ten'}},    ['one', 10], null),        {one: {}})
t.equal(e.putIn({one: {two: {10: 3}}}, ['one', 'two', 10], null), {one: {two: {}}})

{
  const src = {one: 1, list: [{one: 1}, 'two', 'three']}
  t.is(e.putIn(src, ['one'],     1),        src, `must preserve reference`)
  t.is(e.putIn(src, ['two'],     null),     src, `must preserve reference`)
  t.is(e.putIn(src, ['list', 0], {one: 1}), src, `must preserve reference`)
  t.is(e.putIn(src, ['list', 1], 'two'),    src, `must preserve reference`)
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
 * patchBy
 *
 * We only need to test dict combination, other behaviour is identical to putBy
 */

// Combines dicts
t.equal(e.patchBy(pass, {one: 1}, {two: 2}), {one: 1, two: 2})

// Combines dicts, dropping nil props
t.equal(e.patchBy(pass, {one: 1, two: 2}, {one: null, three: 3}), {two: 2, three: 3})

// Dicts are combined only 1 level deep
t.equal(e.patchBy(pass, {one: {two: 2}}, {one: {three: 3}}), {one: {three: 3}})
t.equal(e.patchBy(pass, [{one: 1}], [{two: 2}]), [{two: 2}])

t.equal(
  e.patchBy(((prev, next, key) => prev + next + key), {ten: 'prev'}, {ten: 'next', twenty: 'next'}),
  {ten: 'prevnextten', twenty: 'undefinednexttwenty'}
)

t.equal(
  e.patchBy(pass, {one: 1, two: 2, three: null}, {one: undefined, two: 2}),
  {two: 2}
)

t.equal(
  e.patchBy(
    ((prev, next, key) => prev + next + key),
    {one: 'prev', two: 'prev'},
    {one: 'next', three: 'next'}
  ),
  {one: 'prevnextone', two: 'prev', three: 'undefinednextthree'}
)

// Non-plain objects are replaced wholesale
{
  const next = Object.create({one: 1})
  t.is(e.patchBy(pass, {one: 1}, next), next)
}

/**
 * patch
 *
 * We only need to test dict combination, other behaviour is identical to put
 */

// Combines dicts
t.equal(e.patch({one: 1}, {two: 2}), {one: 1, two: 2})

// Combines dicts, dropping nil props
t.equal(e.patch({one: 1, two: 2}, {one: null, three: 3}), {two: 2, three: 3})

// Dicts are combined only 1 level deep
t.equal(e.patch({one: {two: 2}}, {one: {three: 3}}), {one: {three: 3}})
t.equal(e.patch([{one: 1}], [{two: 2}]), [{two: 2}])

{
  const src = {one: 1, nan: NaN}
  t.is(e.patch(src, {three: undefined}), src, `must preserve reference`)
}

t.equal(e.patch([{list: []}, NaN], [{list: []}]), [{list: []}])

{
  const src = [{list: []}, NaN]
  const out = e.patch(src, [{list: []}])
  t.is(src[0], out[0], `must preserve inner references unaffected by merge`)
}

/**
 * merge
 *
 * We only need to test deep dict combination, other behaviour is identical to put
 */

// Combines dicts at any depth
t.equal(
  e.merge([{list: [{one: 1, two: 2}]}], [{list: [{two: null, three: 3}]}]),
  [{list: [{one: 1, three: 3}]}]
)
