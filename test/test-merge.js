'use strict'

/* eslint-disable max-len */

/**
 * TODO
 *   port remaining tests from './test-old'
 *   remove putRoot and patchRoot tests
 */

const {expectIs, expectEq, testBy} = require('./utils-defs')
const {putRoot, patchRoot, putIn, patchIn} = require('../lib/emerge')

const tests = module.exports = []

/**
 * putRoot
 */

{
  const list = [{one: 1}, 2, 3]
  const dict = {one: 1, list}

  tests.push(...[
    expectIs(putRoot, [],                                undefined),
    expectIs(putRoot, [1, NaN],                          NaN),
    expectIs(putRoot, [list, list],                      list),
    expectIs(putRoot, [list, [{one: 1}, 2, 3]],          list),
    expectIs(putRoot, [dict, list],                      list),
    expectIs(putRoot, [dict, {one: 1, list}],            dict),
    expectIs(putRoot, [dict, {one: 1, list, two: null}], dict),
    expectEq(putRoot, [dict, {one: 1, two: 2}],          {one: 1, two: 2}),
    expectEq(putRoot, [{one: null}, {}],                 {}),
    expectEq(putRoot, [{one: null}, {one: undefined}],   {}),
    testBy(putRoot,   [dict, {list}],                    x => x.list === list),
  ])
}

/**
 * patchRoot
 */

{
  const list = [{one: 1}, 2, 3]
  const dict = {one: 1, list}

  tests.push(...[
    expectIs(patchRoot, [],                                undefined),
    expectIs(patchRoot, [1, NaN],                          NaN),
    expectIs(patchRoot, [list, list],                      list),
    expectIs(patchRoot, [list, [{one: 1}, 2, 3]],          list),
    expectIs(patchRoot, [dict, list],                      list),
    expectIs(patchRoot, [dict, {one: 1, list}],            dict),
    expectIs(patchRoot, [dict, {one: 1, list, two: null}], dict),
    expectIs(patchRoot, [dict, {list}],                    dict),
    expectEq(patchRoot, [dict, {one: 1, two: 2}],          {one: 1, list, two: 2}),
    expectEq(patchRoot, [{one: null}, {}],                 {}),
    expectEq(patchRoot, [{one: null}, {two: 2}],           {two: 2}),
  ])
}

/**
 * putIn
 */

/* Root-level */

// Primitives

tests.push(...[
  expectIs(putIn, [1,     [],  2],    2),
  expectIs(putIn, ['one', [], 'two'], 'two')
])

// Lists

{
  const emptyList = []
  const emptyDict = {}
  const smallDict = {one: 1}
  const smallList = [smallDict, 2, 3]

  tests.push(...[
    // Differentiate between empty list and dict
    expectIs(putIn, [{}, [], emptyList], emptyList),
    expectIs(putIn, [[], [], emptyDict], emptyDict),

    // Maintain reference if value is unchanged
    expectIs(putIn, [smallList, [], [{one: 1}, 2, 3]], smallList),

    // Maintain element references whose values are unchanged
    testBy(putIn, [smallList, [], [{one: 1}, 2]], x => x[0] === smallDict)
  ])
}

// Dicts

{
  const emptyDict = {}
  const smallDict = {one: 1}
  const list      = [smallDict, 2, 3]
  const meanDict  = {one: 1, list}

  tests.push(...[
    expectIs(putIn, [null,     [], emptyDict], emptyDict),
    expectIs(putIn, [null,     [], meanDict],  meanDict),
    expectIs(putIn, [meanDict, [], meanDict],  meanDict),
    expectIs(putIn, [meanDict, [], null],      null),

    // Drop nil props
    expectEq(putIn, [{one: 1}, [], {one: null}],      {}),
    expectEq(putIn, [{one: 1}, [], {one: undefined}], {}),
    expectEq(putIn, [{one: 1}, [], {}],               {}),

    // Maintain reference if value is unchanged
    expectIs(putIn, [smallDict, [], {one: 1, two: null}], smallDict),
    expectIs(putIn, [meanDict, [], {one: 1, two: null, list: [{one: 1}, 2, 3]}], meanDict),

    // Maintain prop references whose values are unchanged
    expectEq(putIn, [meanDict, [], {one: null, list: [{one: 1}, 2, 3]}], {list}),
    testBy(putIn, [meanDict, [], {one: null, list: [{one: 1}, 2, 3]}], x => x.list === list)
  ])
}

/* Nested */

// Primitives

{
  tests.push(...[
    expectEq(putIn, [null, ['one'], 1],        {one: 1}),
    expectEq(putIn, [1,    ['one'], 1],        {one: 1}),
    expectEq(putIn, [null, ['one', 'two'], 2], {one: {two: 2}}),
    expectEq(putIn, [1,    ['one', 'two'], 2], {one: {two: 2}}),
  ])
}

// Lists

{
  const list = [{one: 'one'}, 'two', 'three']

  tests.push(...[
    // Insert and append
    expectEq(putIn, [['one', 'two'], [0], 'three'], ['three', 'two']),
    expectEq(putIn, [['one', 'two'], [1], 'three'], ['one', 'three']),
    expectEq(putIn, [[],             [0], 'one'],   ['one']),
    expectEq(putIn, [['one'],        [1], 'two'],   ['one', 'two']),
    expectEq(putIn, [['one', 'two'], [2], 'three'], ['one', 'two', 'three']),

    // Maintain reference if value is unchanged
    expectIs(putIn, [list, [0], {one: 'one', two: null}], list),

    // Drop list when index out of bounds
    expectEq(putIn, [['one'], [2],  'two'], {2: 'two'}),
    expectEq(putIn, [['one'], [-1], 'two'], {'-1': 'two'}),

    // Drop list when key demands dict
    expectEq(putIn, [['one', 'two'], ['0'], 'one'], {0: 'one'}),
    // (comparison with integer index)
    expectEq(putIn, [['one', 'two'], [0],   'one'], ['one', 'two']),
  ])
}

// Dicts

{
  const dict = {one: 1, list: [{one: 1}, 'two', 'three']}

  tests.push(...[
    // Create missing path
    expectEq(putIn, [{},        ['one'], 1],           {one: 1}),
    expectEq(putIn, [{},        ['one', 'two'], 2],    {one: {two: 2}}),
    expectEq(putIn, [{},        ['one', 'two'], null], {one: {}}),
    expectEq(putIn, [{one: []}, ['one', 'two'], null], {one: {}}),

    // Drop nil props
    expectEq(putIn, [{one: {two: 2}, three: 3}, ['one'],        null], {three: 3}),
    expectEq(putIn, [{one: {two: 2}, three: 3}, ['one', 'two'], null], {one: {}, three: 3}),

    // Maintain reference if value is unchanged
    expectIs(putIn, [dict, ['one'], 1],                  dict),
    expectIs(putIn, [dict, ['two'], null],               dict),
    expectIs(putIn, [dict, ['list', 0, {one: 1}], null], dict),
    expectIs(putIn, [dict, ['list', 1], 'two'],          dict),
  ])
}

// Mixed

{
  tests.push(...[
    expectEq(
      putIn,
      [[{one: 1}, 'two'], [0, 'one'], 'one!'],
      [{one: 'one!'}, 'two']
    ),
    expectEq(
      putIn,
      [{list: ['one', 'two'], three: 3}, ['list', 0], 'one!'],
      {list: ['one!', 'two'], three: 3}
    ),
  ])
}

/**
 * patchIn
 */

{
  tests.push(...[
    // Merge dicts
    expectEq(patchIn, [{one: 1},        [],               {two: 2}],          {one: 1, two: 2}),
    expectEq(patchIn, [{one: {two: 2}}, [],               {one: {three: 3}}], {one: {two: 2, three: 3}}),
    expectEq(patchIn, [{one: {two: 2}}, ['one'],          {three: 3}],        {one: {two: 2, three: 3}}),
    expectEq(patchIn, [{one: {two: 2}}, ['one', 'three'], 3],                 {one: {two: 2, three: 3}}),

    // Merge lists
    expectEq(
      patchIn,
      [{one: [{two: 2}]}, [], {one: [{three: 3}]}],
      {one: [{two: 2, three: 3}]}
    ),
    expectEq(
      patchIn,
      [{one: [{two: 2}]}, ['one'], [{three: 3}]],
      {one: [{two: 2, three: 3}]}
    ),
    expectEq(
      patchIn,
      [{one: [{two: 2}]}, ['one', 0], {three: 3}],
      {one: [{two: 2, three: 3}]}
    ),
    expectEq(
      patchIn,
      [{one: [{two: 2}]}, ['one', 0, 'three'], 3],
      {one: [{two: 2, three: 3}]}
    ),
  ])

  const dict = {one: {two: [2], three: [3]}, five: NaN}

  // Drop nil props

  tests.push(...[
    expectEq(patchIn, [dict, [], {one: null}],      {five: NaN}),
    expectEq(patchIn, [dict, ['one'], null],        {five: NaN}),
    expectEq(patchIn, [dict, ['one'], {two: null}], {one: {three: [3]}, five: NaN}),
    expectEq(patchIn, [dict, ['one', 'two'], null], {one: {three: [3]}, five: NaN}),
  ])

  // Maintain reference if value is unchanged

  tests.push(...[
    expectIs(patchIn, [dict, [], {one: {}}],                         dict),
    expectIs(patchIn, [dict, [], {one: {three: [3]}, twelve: null}], dict),
  ])
}
