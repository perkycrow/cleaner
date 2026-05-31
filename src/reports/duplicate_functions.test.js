import {describe, test, expect} from 'vitest'
import {collectFunctionDeclarations, findDuplicateFunctions} from './duplicate_functions.js'


describe('collectFunctionDeclarations', () => {

    test('collects function declarations with metadata', () => {
        const fns = collectFunctionDeclarations('function add (a, b) {\n  return a + b\n}')
        expect(fns).toHaveLength(1)
        expect(fns[0]).toMatchObject({name: 'add', params: 2, line: 1})
    })

    test('ignores class methods and arrow consts', () => {
        const content = 'class A {\n  toJSON () {}\n}\nconst f = () => {}'
        expect(collectFunctionDeclarations(content)).toHaveLength(0)
    })

    test('returns nothing on parse error', () => {
        expect(collectFunctionDeclarations('not js {')).toEqual([])
    })

})


describe('findDuplicateFunctions', () => {

    const files = {
        'a.js': 'function clamp (v) {\n  return v\n}',
        'b.js': 'function clamp (v) {\n  return v\n}',
        'c.js': 'function unique () {\n  return 1\n}'
    }
    const readFile = file => files[file]

    test('reports names declared in more than one file', () => {
        const dups = findDuplicateFunctions(Object.keys(files), readFile)
        expect(dups).toHaveLength(1)
        expect(dups[0].name).toBe('clamp')
        expect(dups[0].count).toBe(2)
    })

    test('marks identical bodies', () => {
        const dups = findDuplicateFunctions(Object.keys(files), readFile)
        expect(dups[0].identicalBody).toBe(true)
    })

    test('ignores common-prefix names (init, get, add...) and camelCase variants', () => {
        const ignored = {
            'a.js': 'function initEvents () {}\nfunction getX () {}\nfunction addChild () {}',
            'b.js': 'function initEvents () {}\nfunction getX () {}\nfunction addChild () {}'
        }
        expect(findDuplicateFunctions(Object.keys(ignored), file => ignored[file])).toHaveLength(0)
    })

    test('does not over-ignore distinct words (maintain, address, getter)', () => {
        const kept = {
            'a.js': 'function maintain () {}\nfunction address () {}',
            'b.js': 'function maintain () {}\nfunction address () {}'
        }
        const dups = findDuplicateFunctions(Object.keys(kept), file => kept[file])
        expect(dups.map(d => d.name).sort()).toEqual(['address', 'maintain'])
    })

    test('flags same name with different body too (not identical)', () => {
        const diff = {
            'a.js': 'function go () {\n  return 1\n}',
            'b.js': 'function go () {\n  return 2\n}'
        }
        const dups = findDuplicateFunctions(Object.keys(diff), file => diff[file])
        expect(dups[0].identicalBody).toBe(false)
    })

})
