'use strict'

/* global Symbol */

const {call, expect, to} = require('../test-utils')
const {get, scan, getIn} = require('../')

const tree = {
  one: 'one',
  two: {three: {four: [4, 5]}},
}

expect(call(get),                                    to.eq(undefined))
expect(call(get, undefined, 'one'),                  to.eq(undefined))
expect(call(get, 'one',     'length'),               to.eq('one'.length))
expect(call(get, {one: 1},  'one'),                  to.eq(1))
expect(call(get, [10, 20],  1),                      to.eq(20))

expect(call(scan),                                   to.eq(undefined))
expect(call(scan, null, 'one'),                      to.eq(undefined))
expect(call(scan, tree),                             to.eq(tree))
expect(call(scan, tree, 'two'),                      to.eq(tree.two))
expect(call(scan, tree, 'one'),                      to.eq(tree.one))
expect(call(scan, tree, 'one', 'length'),            to.eq(tree.one.length))
expect(call(scan, tree, 'two', 'three', 'four'),     to.eq(tree.two.three.four))
expect(call(scan, tree, Symbol()),                   to.eq(undefined))

expect(call(getIn, null, ['one']),                   to.eq(undefined))
expect(call(getIn, tree, []),                        to.eq(tree))
expect(call(getIn, tree, ['two']),                   to.eq(tree.two))
expect(call(getIn, tree, ['one']),                   to.eq(tree.one))
expect(call(getIn, tree, ['one', 'length']),         to.eq(tree.one.length))
expect(call(getIn, tree, ['two', 'three', 'four']),  to.eq(tree.two.three.four))
expect(call(getIn, tree, [Symbol()]),                to.eq(undefined))
