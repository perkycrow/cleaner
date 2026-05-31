import {defineRule} from '../../core/rule.js'


export function findTestStyleIssues (content) {
    const lines = content.split('\n')
    const issues = []

    for (let i = 0; i < lines.length; i++) {
        if (/\bit\s*\(/.test(lines[i])) {
            issues.push({line: i + 1, kind: 'it', message: 'use test() instead of it()'})
        }
        if (/\btest\s*\(\s*['"`]should\b/.test(lines[i])) {
            issues.push({line: i + 1, kind: 'should', message: 'avoid "should" — start with the method name'})
        }
    }

    return issues
}


export default defineRule({
    name: 'test-style',
    group: 'opinion',
    category: 'tests',
    hint: 'Follow unit-test philosophy: test() named after the method, not BDD it()/should',
    defaultInclude: ['**/*.test.js'],
    check (content) {
        return findTestStyleIssues(content).map(entry => `L${entry.line}: ${entry.message}`)
    }
})
