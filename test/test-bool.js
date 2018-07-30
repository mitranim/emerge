'use strict'

const {create} = Object
const {is} = require('./utils')
const e = require('../')


is(e.is(), true)
is(e.is(null, undefined), false)
is(e.is(1, 1), true)
is(e.is(NaN, NaN), true)
is(e.is(-0, +0), true)
is(e.is('1', 1), false)
is(e.is({}, {}), false)


is(e.equal([], []), true)
is(e.equal({}, {}), true)
is(e.equal({}, []), false)
is(e.equal(create(null), create(null)), true)
is(e.equal(create({}), create({})), false, `non-plain objects shouldn't compare equal`)

is(
  e.equal(
    {one: {two: {three: NaN}}, four: [4, 4], five: 'five'},
    {one: {two: {three: NaN}}, four: [4, 4], five: 'five'}
  ),
  true
)

is(
  e.equal(
    {one: {two: {three: NaN}}, four: [4, 4], five: 'five'},
    {one: {two: {three: NaN}}, four: [4, 4], five: 'five', six: 6}
  ),
  false
)


// Should add an example of an equality function with support for arbitrary types.

is(e.equalBy([1],     [1],     e.is),    true)
is(e.equalBy([1, {}], [1, {}], e.is),    false)
is(e.equalBy([1, {}], [1, {}], e.equal), true)
