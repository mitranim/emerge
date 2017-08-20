'use strict'

const {create} = Object
const {call, expect, to} = require('../test-utils')
const {is, equal, equalBy} = require('../')

/**
 * is
 */

expect(call(is),                  to.eq(true))
expect(call(is, null, undefined), to.eq(false))
expect(call(is, 1,    1),         to.eq(true))
expect(call(is, NaN,  NaN),       to.eq(true))
expect(call(is, '1',  1),         to.eq(false))
expect(call(is, {},   {}),        to.eq(false))

/**
 * equal
 */

expect(call(equal, [],           []),           to.eq(true))
expect(call(equal, {},           {}),           to.eq(true))
expect(call(equal, create(null), create(null)), to.eq(true))

expect(
  call(equal, create({}), create({})),
  ({ok, returned}) => ({
    ok: ok && returned === false,
    comment: `non-plain objects shouldn't compare equal`,
  })
)

expect(
  call(
    equal,
    {one: {two: {three: NaN}}, four: [4, 4], five: 'five'},
    {one: {two: {three: NaN}}, four: [4, 4], five: 'five'}
  ),
  to.eq(true)
)

expect(
  call(
    equal,
    {one: {two: {three: NaN}}, four: [4, 4], five: 'five'},
    {one: {two: {three: NaN}}, four: [4, 4], five: 'five', six: 6}
  ),
  to.eq(false)
)

/**
 * equalBy
 */

expect(call(equalBy, is,    [1],     [1]),     to.eq(true))
expect(call(equalBy, is,    [1, {}], [1, {}]), to.eq(false))
expect(call(equalBy, equal, [1, {}], [1, {}]), to.eq(true))
