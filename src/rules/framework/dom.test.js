import {describe, test, expect} from 'vitest'
import styleRule, {findStyleElements} from './style_elements.js'
import domRule from './dom_utils.js'
import {findVerbosePatterns} from './dom_utils_scan.js'


describe('style-elements', () => {

    test('flags document.createElement("style")', () => {
        expect(findStyleElements("const s = document.createElement('style')")).toHaveLength(1)
    })

    test('ignores createElement for other tags', () => {
        expect(findStyleElements("document.createElement('div')")).toHaveLength(0)
    })

    test('framework group', () => {
        expect(styleRule.group).toBe('framework')
    })

})


describe('dom-utils', () => {

    test('flags a verbose createElement + property sequence', () => {
        const content = [
            "const el = document.createElement('div')",
            "el.className = 'container'",
            "el.id = 'main'"
        ].join('\n')
        expect(findVerbosePatterns(content).length).toBeGreaterThan(0)
    })

    test('flags 4+ setAttribute calls on the same target', () => {
        const content = [
            "el.setAttribute('a', '1')",
            "el.setAttribute('b', '2')",
            "el.setAttribute('c', '3')",
            "el.setAttribute('d', '4')"
        ].join('\n')
        expect(findVerbosePatterns(content).length).toBeGreaterThan(0)
    })

    test('leaves a bare createElement alone', () => {
        expect(findVerbosePatterns("const el = document.createElement('div')")).toHaveLength(0)
    })

    test('returns nothing on parse error', () => {
        expect(findVerbosePatterns('not js {')).toEqual([])
    })

    test('framework group', () => {
        expect(domRule.group).toBe('framework')
    })

})
