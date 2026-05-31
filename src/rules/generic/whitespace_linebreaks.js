import * as acorn from 'acorn'


function isBlankLine (line) {
    return line.trim() === ''
}


// Counts the run of consecutive blank lines starting at `startIndex` (a 0-based index into `lines`).
// `afterLine` values are 1-based line numbers of a node's last line, which double as the 0-based index
// of the first line BELOW that node — so a comment block attached to the next node stops the run and is
// never counted as gap. This is what keeps fixLineBreaks from deleting comments between declarations.
function countBlankRunAt (lines, startIndex) {
    let count = 0
    while (startIndex + count < lines.length && isBlankLine(lines[startIndex + count])) {
        count++
    }
    return count
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


function collectAstPositions (ast) {
    const positions = {imports: [], topLevel: [], classes: []}

    for (const node of ast.body) {
        if (node.type === 'ImportDeclaration') {
            positions.imports.push({type: 'import', start: node.loc.start.line, end: node.loc.end.line})
        } else if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration') {
            processExportNode(node, positions)
        } else if (node.type === 'ClassDeclaration') {
            processClassNode(node, positions)
        } else {
            positions.topLevel.push({type: getNodeType(node), start: node.loc.start.line, end: node.loc.end.line})
        }
    }

    return positions
}


function parseContent (content) {
    try {
        return acorn.parse(content, {ecmaVersion: 'latest', sourceType: 'module', locations: true})
    } catch {
        return null
    }
}


function checkImportsGap (positions, lines) {
    if (positions.imports.length === 0 || positions.topLevel.length === 0) {
        return null
    }

    const lastImport = positions.imports[positions.imports.length - 1]
    const firstCode = positions.topLevel[0]
    const gap = countBlankRunAt(lines, lastImport.end)

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


function checkTopLevelGaps (positions, lines) {
    const significantTypes = new Set(['function', 'class'])
    const adjustments = []

    for (let i = 0; i < positions.topLevel.length - 1; i++) {
        const current = positions.topLevel[i]
        const next = positions.topLevel[i + 1]

        if (!significantTypes.has(current.type) || !significantTypes.has(next.type)) {
            continue
        }

        const gap = countBlankRunAt(lines, current.end)

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


function checkClassMemberGaps (members, lines) {
    const adjustments = []

    for (let i = 0; i < members.length - 1; i++) {
        const current = members[i]
        const next = members[i + 1]
        const gap = countBlankRunAt(lines, current.end)
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


function checkClassGaps (classInfo, lines) {
    if (classInfo.members.length === 0) {
        return []
    }

    const adjustments = []
    const firstMember = classInfo.members[0]
    const lastMember = classInfo.members[classInfo.members.length - 1]

    const gapAfterOpen = countBlankRunAt(lines, classInfo.bodyStart)
    if (gapAfterOpen !== 1) {
        adjustments.push({
            afterLine: classInfo.bodyStart,
            beforeLine: firstMember.start,
            currentGap: gapAfterOpen,
            expectedGap: 1,
            context: 'after class opening'
        })
    }

    const gapBeforeClose = countBlankRunAt(lines, lastMember.end)
    if (gapBeforeClose !== 1) {
        adjustments.push({
            afterLine: lastMember.end,
            beforeLine: classInfo.bodyEnd,
            currentGap: gapBeforeClose,
            expectedGap: 1,
            context: 'before class closing'
        })
    }

    adjustments.push(...checkClassMemberGaps(classInfo.members, lines))

    return adjustments
}


export function analyzeLineBreaks (content) {
    const ast = parseContent(content)
    if (!ast) {
        return []
    }

    const lines = content.split('\n')
    const positions = collectAstPositions(ast)
    const adjustments = []

    const importsGap = checkImportsGap(positions, lines)
    if (importsGap) {
        adjustments.push(importsGap)
    }

    adjustments.push(...checkTopLevelGaps(positions, lines))

    for (const classInfo of positions.classes) {
        adjustments.push(...checkClassGaps(classInfo, lines))
    }

    return adjustments
}


export function fixLineBreaks (content, adjustments) {
    if (adjustments.length === 0) {
        return {result: content, modified: false}
    }

    const lines = content.split('\n')
    const sortedAdjustments = [...adjustments].sort((a, b) => b.afterLine - a.afterLine)
    let modified = false

    for (const adj of sortedAdjustments) {
        const startIndex = adj.afterLine
        const runLength = countBlankRunAt(lines, startIndex)

        if (runLength === adj.expectedGap) {
            continue
        }

        // Splice ONLY the leading run of blank lines, so an attached comment block (the first non-blank
        // line below the node) is left untouched. The normalized gap lands between the node and its comment.
        const newEmptyLines = Array(adj.expectedGap).fill('')
        lines.splice(startIndex, runLength, ...newEmptyLines)
        modified = true
    }

    return {result: modified ? lines.join('\n') : content, modified}
}
