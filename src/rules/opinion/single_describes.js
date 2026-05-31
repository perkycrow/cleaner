import {defineRule} from '../../core/rule.js'


function countLeadingSpaces (line) {
    const match = line.match(/^(\s*)/)
    return match ? match[1].length : 0
}


function processDescribeLine (trimmed, lineNum, indent, stack) {
    if (!trimmed.startsWith('describe(')) {
        return
    }
    for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].indent < indent) {
            stack[i].testCount++
            break
        }
    }
    stack.push({line: lineNum, indent, testCount: 0, text: trimmed.substring(0, 40)})
}


function processTestLine (trimmed, indent, stack) {
    if (!trimmed.startsWith('test(') && !trimmed.startsWith('it(')) {
        return
    }
    for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].indent < indent) {
            stack[i].testCount++
            break
        }
    }
}


function processClosingBrace (trimmed, indent, stack, issues) {
    if (trimmed !== '})' || stack.length === 0) {
        return
    }
    const last = stack[stack.length - 1]
    if (last.indent < indent) {
        return
    }
    const closed = stack.pop()
    if (closed.testCount === 1) {
        issues.push({line: closed.line, text: closed.text})
    }
}


function countTotalTests (content) {
    const testMatches = content.match(/^\s*(test|it)\(/gm)
    return testMatches ? testMatches.length : 0
}


export function findSingleTestDescribes (content) {
    if (countTotalTests(content) <= 1) {
        return []
    }

    const lines = content.split('\n')
    const issues = []
    const stack = []

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim()
        const indent = countLeadingSpaces(lines[i])

        processDescribeLine(trimmed, i + 1, indent, stack)
        processTestLine(trimmed, indent, stack)
        processClosingBrace(trimmed, indent, stack, issues)
    }

    return issues
}


export default defineRule({
    name: 'test-single-describe',
    group: 'opinion',
    category: 'tests',
    hint: 'Remove the describe() wrapper when it holds a single test',
    defaultInclude: ['**/*.test.js'],
    check (content) {
        return findSingleTestDescribes(content).map(entry => `L${entry.line}: single-test describe`)
    }
})
