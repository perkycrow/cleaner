import * as acorn from 'acorn'
import {defineRule} from '../../core/rule.js'


export function fixTrailingWhitespace (content) {
    const lines = content.split('\n')
    let modified = false

    const fixedLines = lines.map(line => {
        const trimmed = line.replace(/\s+$/, '')
        if (trimmed !== line) {
            modified = true
        }
        return trimmed
    })

    return {
        result: fixedLines.join('\n'),
        modified
    }
}


export function fixEofNewline (content) {
    const trimmed = content.replace(/\n+$/, '')
    const result = trimmed + '\n'
    return {
        result,
        modified: result !== content
    }
}


function getLineGap (startLine, endLine) {
    return startLine - endLine - 1
}


function getNodeType (node) {
    if (node.type === 'FunctionDeclaration') {
        return 'function'
    }
    if (node.type === 'ClassDeclaration') {
        return 'class'
    }
    if (node.type === 'VariableDeclaration') {
        const firstDecl = node.declarations[0]
        if (firstDecl?.init?.type === 'ArrowFunctionExpression' ||
            firstDecl?.init?.type === 'FunctionExpression') {
            return 'function'
        }
        return 'variable'
    }
    return 'other'
}


function extractClassInfo (node, classDecl) {
    const classInfo = {
        type: 'class',
        start: node.loc.start.line,
        end: node.loc.end.line,
        bodyStart: classDecl.body.loc.start.line,
        bodyEnd: classDecl.body.loc.end.line,
        members: []
    }

    for (const member of classDecl.body.body) {
        classInfo.members.push({
            type: member.type,
            start: member.loc.start.line,
            end: member.loc.end.line,
            isMethod: member.type === 'MethodDefinition',
            isProperty: member.type === 'PropertyDefinition'
        })
    }

    return classInfo
}


function processImportNode (node, positions) {
    positions.imports.push({
        type: 'import',
        start: node.loc.start.line,
        end: node.loc.end.line
    })
}


function processExportNode (node, positions) {
    const decl = node.declaration
    if (!decl) {
        return
    }

    if (decl.type === 'ClassDeclaration') {
        const classInfo = extractClassInfo(node, decl)
        positions.classes.push(classInfo)
        positions.topLevel.push(classInfo)
    } else {
        positions.topLevel.push({
            type: getNodeType(decl),
            start: node.loc.start.line,
            end: node.loc.end.line
        })
    }
}


function processClassNode (node, positions) {
    const classInfo = extractClassInfo(node, node)
    positions.classes.push(classInfo)
    positions.topLevel.push(classInfo)
}


function processOtherNode (node, positions) {
    positions.topLevel.push({
        type: getNodeType(node),
        start: node.loc.start.line,
        end: node.loc.end.line
    })
}


function collectAstPositions (ast) {
    const positions = {
        imports: [],
        topLevel: [],
        classes: []
    }

    for (const node of ast.body) {
        if (node.type === 'ImportDeclaration') {
            processImportNode(node, positions)
        } else if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration') {
            processExportNode(node, positions)
        } else if (node.type === 'ClassDeclaration') {
            processClassNode(node, positions)
        } else {
            processOtherNode(node, positions)
        }
    }

    return positions
}


function parseContent (content) {
    try {
        return acorn.parse(content, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            locations: true
        })
    } catch {
        return null
    }
}


function checkImportsGap (positions) {
    if (positions.imports.length === 0 || positions.topLevel.length === 0) {
        return null
    }

    const lastImport = positions.imports[positions.imports.length - 1]
    const firstCode = positions.topLevel[0]
    const gap = getLineGap(firstCode.start, lastImport.end)

    if (gap === 2) {
        return null
    }

    return {
        afterLine: lastImport.end,
        beforeLine: firstCode.start,
        currentGap: gap,
        expectedGap: 2,
        context: 'after imports'
    }
}


function checkTopLevelGaps (positions) {
    const significantTypes = new Set(['function', 'class'])
    const adjustments = []

    for (let i = 0; i < positions.topLevel.length - 1; i++) {
        const current = positions.topLevel[i]
        const next = positions.topLevel[i + 1]

        if (!significantTypes.has(current.type) || !significantTypes.has(next.type)) {
            continue
        }

        const gap = getLineGap(next.start, current.end)

        if (gap !== 2) {
            adjustments.push({
                afterLine: current.end,
                beforeLine: next.start,
                currentGap: gap,
                expectedGap: 2,
                context: `between ${current.type} and ${next.type}`
            })
        }
    }

    return adjustments
}


function getExpectedMemberGap (current, next) {
    const bothMethods = current.isMethod && next.isMethod
    const mixedPropertyMethod = current.isProperty !== next.isProperty &&
        (current.isMethod || next.isMethod)

    if (bothMethods) {
        return 2
    }
    if (mixedPropertyMethod) {
        return 1
    }
    return null
}


function checkClassMemberGaps (members) {
    const adjustments = []

    for (let i = 0; i < members.length - 1; i++) {
        const current = members[i]
        const next = members[i + 1]
        const gap = getLineGap(next.start, current.end)
        const expectedGap = getExpectedMemberGap(current, next)

        if (expectedGap !== null && gap !== expectedGap) {
            adjustments.push({
                afterLine: current.end,
                beforeLine: next.start,
                currentGap: gap,
                expectedGap,
                context: expectedGap === 2 ? 'between methods' : 'between property and method'
            })
        }
    }

    return adjustments
}


function checkClassGaps (classInfo) {
    if (classInfo.members.length === 0) {
        return []
    }

    const adjustments = []
    const firstMember = classInfo.members[0]
    const lastMember = classInfo.members[classInfo.members.length - 1]

    const gapAfterOpen = getLineGap(firstMember.start, classInfo.bodyStart)
    if (gapAfterOpen !== 1) {
        adjustments.push({
            afterLine: classInfo.bodyStart,
            beforeLine: firstMember.start,
            currentGap: gapAfterOpen,
            expectedGap: 1,
            context: 'after class opening'
        })
    }

    const gapBeforeClose = getLineGap(classInfo.bodyEnd, lastMember.end)
    if (gapBeforeClose !== 1) {
        adjustments.push({
            afterLine: lastMember.end,
            beforeLine: classInfo.bodyEnd,
            currentGap: gapBeforeClose,
            expectedGap: 1,
            context: 'before class closing'
        })
    }

    adjustments.push(...checkClassMemberGaps(classInfo.members))

    return adjustments
}


export function analyzeLineBreaks (content) {
    const ast = parseContent(content)
    if (!ast) {
        return []
    }

    const positions = collectAstPositions(ast)
    const adjustments = []

    const importsGap = checkImportsGap(positions)
    if (importsGap) {
        adjustments.push(importsGap)
    }

    adjustments.push(...checkTopLevelGaps(positions))

    for (const classInfo of positions.classes) {
        adjustments.push(...checkClassGaps(classInfo))
    }

    return adjustments
}


export function fixLineBreaks (content, adjustments) {
    if (adjustments.length === 0) {
        return {result: content, modified: false}
    }

    const lines = content.split('\n')
    const sortedAdjustments = [...adjustments].sort((a, b) => b.afterLine - a.afterLine)

    for (const adj of sortedAdjustments) {
        const afterIndex = adj.afterLine - 1
        const beforeIndex = adj.beforeLine - 1

        const emptyLinesStart = afterIndex + 1
        const emptyLinesEnd = beforeIndex

        const currentEmptyLines = emptyLinesEnd - emptyLinesStart

        if (currentEmptyLines >= 0) {
            const newEmptyLines = '\n'.repeat(adj.expectedGap).split('\n').slice(0, -1).map(() => '')
            lines.splice(emptyLinesStart, currentEmptyLines, ...newEmptyLines)
        }
    }

    return {
        result: lines.join('\n'),
        modified: true
    }
}


export function processContent (content) {
    const issues = []
    let result = content
    let modified = false

    const trailing = fixTrailingWhitespace(result)
    if (trailing.modified) {
        result = trailing.result
        modified = true
        issues.push('trailing whitespace')
    }

    const eof = fixEofNewline(result)
    if (eof.modified) {
        result = eof.result
        modified = true
        issues.push('EOF newline')
    }

    const adjustments = analyzeLineBreaks(result)
    if (adjustments.length > 0) {
        const lineBreaksResult = fixLineBreaks(result, adjustments)
        result = lineBreaksResult.result
        modified = true
        for (const adj of adjustments) {
            issues.push(`line breaks ${adj.context}: ${adj.currentGap} → ${adj.expectedGap}`)
        }
    }

    return {result, modified, issues}
}


export default defineRule({
    name: 'whitespace',
    group: 'generic',
    category: 'whitespace',
    defaultExclude: ['**/*.test.js'],
    check (content) {
        return processContent(content).issues
    },
    fix (content) {
        const {result, modified, issues} = processContent(content)
        return {result, fixed: modified, fixCount: issues.length}
    }
})
