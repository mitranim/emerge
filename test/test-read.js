'use strict'

/* global Symbol */

const {expectIs} = require('./utils-defs')
const {get, scan, getIn, getAt} = require('../lib/emerge')

const tree = {
  one: 'one',
  two: {three: {four: [4, 5]}}
}

module.exports = [
  expectIs(get, [],                 undefined),
  expectIs(get, [undefined, 'one'], undefined),
  expectIs(get, ['one', 'length'],  'one'.length),
  expectIs(get, [{one: 1}, 'one'],  1),
  expectIs(get, [[10, 20], 1],      20),

  expectIs(scan, [],                             undefined),
  expectIs(scan, [undefined, 'one'],             undefined),
  expectIs(scan, [tree],                         tree),
  expectIs(scan, [tree, 'two'],                  tree.two),
  expectIs(scan, [tree, 'one'],                  tree.one),
  expectIs(scan, [tree, 'one', 'length'],        tree.one.length),
  expectIs(scan, [tree, 'two', 'three', 'four'], tree.two.three.four),
  expectIs(scan, [tree, Symbol()],               undefined),

  expectIs(getIn, [undefined, ['one']],             undefined),
  expectIs(getIn, [tree, []],                       tree),
  expectIs(getIn, [tree, ['two']],                  tree.two),
  expectIs(getIn, [tree, ['one']],                  tree.one),
  expectIs(getIn, [tree, ['one', 'length']],        tree.one.length),
  expectIs(getIn, [tree, ['two', 'three', 'four']], tree.two.three.four),
  expectIs(getIn, [tree, [Symbol()]],               undefined),

  expectIs(getAt, [['one'], undefined],             undefined),
  expectIs(getAt, [[], tree],                       tree),
  expectIs(getAt, [['two'], tree],                  tree.two),
  expectIs(getAt, [['one'], tree],                  tree.one),
  expectIs(getAt, [['one', 'length'], tree],        tree.one.length),
  expectIs(getAt, [['two', 'three', 'four'], tree], tree.two.three.four),
  expectIs(getAt, [[Symbol()], tree],               undefined)
]
