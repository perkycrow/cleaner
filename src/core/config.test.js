import {describe, test, expect} from 'vitest'
import {defineRule} from './rule.js'
import {createRegistry} from './registry.js'
import {resolveConfig} from './config.js'


function fakeRegistry () {
    return createRegistry([
        defineRule({name: 'whitespace', group: 'generic', check: () => []}),
        defineRule({name: 'comments', group: 'opinion', check: () => []}),
        defineRule({name: 'dom-utils', group: 'framework', check: () => []})
    ])
}


describe('resolveConfig', () => {

    test('default preset (generic) enables only generic rules', () => {
        const {preset, rules} = resolveConfig({}, fakeRegistry())
        expect(preset).toBe('generic')
        expect(rules.whitespace.enabled).toBe(true)
        expect(rules.comments.enabled).toBe(false)
        expect(rules['dom-utils'].enabled).toBe(false)
    })

    test('perky preset enables generic, opinion and framework rules', () => {
        const {rules} = resolveConfig({preset: 'perky'}, fakeRegistry())
        expect(rules.whitespace.enabled).toBe(true)
        expect(rules.comments.enabled).toBe(true)
        expect(rules['dom-utils'].enabled).toBe(true)
    })

    test('user rule false disables a preset-enabled rule', () => {
        const {rules} = resolveConfig({preset: 'perky', rules: {comments: false}}, fakeRegistry())
        expect(rules.comments.enabled).toBe(false)
    })

    test('user rule true enables a rule the preset left off', () => {
        const {rules} = resolveConfig({rules: {'dom-utils': true}}, fakeRegistry())
        expect(rules['dom-utils'].enabled).toBe(true)
    })

    test('object setting carries include/exclude and flat options', () => {
        const {rules} = resolveConfig({
            rules: {whitespace: {include: ['core/**'], exclude: ['*.gen.js'], max: 4}}
        }, fakeRegistry())
        expect(rules.whitespace).toMatchObject({
            enabled: true,
            include: ['core/**'],
            exclude: ['*.gen.js'],
            options: {max: 4}
        })
    })

    test('nested options key is respected over flat keys', () => {
        const {rules} = resolveConfig({
            rules: {whitespace: {options: {max: 2}}}
        }, fakeRegistry())
        expect(rules.whitespace.options).toEqual({max: 2})
    })

    test('user exclude is additive with the rule defaultExclude', () => {
        const registry = createRegistry([
            defineRule({name: 'docs', group: 'generic', defaultExclude: ['**/*.test.js'], check: () => []})
        ])
        const {rules} = resolveConfig({rules: {docs: {exclude: ['vendor/**']}}}, registry)
        expect(rules.docs.exclude).toEqual(['**/*.test.js', 'vendor/**'])
    })

    test('ignore globs pass through', () => {
        const {ignore} = resolveConfig({ignore: ['dist/**']}, fakeRegistry())
        expect(ignore).toEqual(['dist/**'])
    })

    test('unknown preset throws', () => {
        expect(() => resolveConfig({preset: 'nope'}, fakeRegistry())).toThrow(/Unknown preset/)
    })

    test('every registered rule appears in resolved config', () => {
        const {rules} = resolveConfig({}, fakeRegistry())
        expect(Object.keys(rules).sort()).toEqual(['comments', 'dom-utils', 'whitespace'])
    })

})
