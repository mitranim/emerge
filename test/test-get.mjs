import * as t from './utils.mjs'
import * as e from '../emerge.mjs'

const tree = {
  one: 'one',
  two: {three: {four: [4, 5]}},
}

t.is(e.get(),                                  undefined)
t.is(e.get(undefined, 'one'),                  undefined)
t.is(e.get('one',     'length'),               'one'.length)
t.is(e.get({one: 1},  'one'),                  1)
t.is(e.get([10, 20],  1),                      20)

t.is(e.getIn(null, ['one']),                   undefined)
t.is(e.getIn(tree, []),                        tree)
t.is(e.getIn(tree, ['two']),                   tree.two)
t.is(e.getIn(tree, ['one']),                   tree.one)
t.is(e.getIn(tree, ['one', 'length']),         tree.one.length)
t.is(e.getIn(tree, ['two', 'three', 'four']),  tree.two.three.four)
t.is(e.getIn(tree, [Symbol()]),                undefined)

t.is(e.scan(),                                 undefined)
t.is(e.scan(null, 'one'),                      undefined)
t.is(e.scan(tree),                             tree)
t.is(e.scan(tree, 'two'),                      tree.two)
t.is(e.scan(tree, 'one'),                      tree.one)
t.is(e.scan(tree, 'one', 'length'),            tree.one.length)
t.is(e.scan(tree, 'two', 'three', 'four'),     tree.two.three.four)
t.is(e.scan(tree, Symbol()),                   undefined)
