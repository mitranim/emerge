'use strict'

const {create} = Object
const {expectIs} = require('./utils-defs')
const {is, equal, equalBy} = require('../lib/emerge')

module.exports = [
  /**
   * is
   */

  expectIs(is, [],                true),
  expectIs(is, [null, undefined], false),
  expectIs(is, [NaN, NaN],        true),
  expectIs(is, [1, '1'],          false),
  expectIs(is, [{}, {}],          false),

  /**
   * equal
   */

  expectIs(equal, [[], []], true),

  expectIs(equal, [{}, {}], true),

  expectIs(equal, [create(null), create(null)], true),

  expectIs(equal, [create({}), create({})], false),

  expectIs(equal, [
    {one: {two: {three: NaN}}, four: [4, 4], five: 'five'},
    {one: {two: {three: NaN}}, four: [4, 4], five: 'five'}
  ], true),

  expectIs(equal, [
    {one: {two: {three: NaN}}, four: [4, 4], five: 'five'},
    {one: {two: {three: NaN}}, four: [4, 4], five: 'five', six: 6}
  ], false),

  /**
   * equalBy
   */

  expectIs(equalBy, [is,    [1],     [1]],     true),
  expectIs(equalBy, [is,    [1, {}], [1, {}]], false),
  expectIs(equalBy, [equal, [1, {}], [1, {}]], true)
]
