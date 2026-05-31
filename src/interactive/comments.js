import {isInsideString} from '../core/text.js'
import {isProtectedComment, isUrlComment} from '../rules/opinion/comments.js'
import {findUncleanDirectiveLines} from '../rules/opinion/eslint_disables.js'


const REMOVE = Symbol('remove-line')


function collectCommentLines (content) {
    const lines = content.split('\n')
    let textFromStart = ''
    const found = []

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const match = line.match(/^(.*?)\/\/(.*)$/)

        if (match) {
            const [, before, after] = match
            const strippable = !isUrlComment(before) &&
                !isInsideString(textFromStart + before) &&
                !isProtectedComment(after)

            if (strippable) {
                found.push({index: i, before, after})
                textFromStart += before + '\n'
                continue
            }
        }

        textFromStart += line + '\n'
    }

    return found
}


function groupCommentBlocks (comments) {
    const blocks = []

    for (const comment of comments) {
        const standalone = comment.before.trim() === ''
        const last = blocks[blocks.length - 1]
        const previousIndex = last && last.lines[last.lines.length - 1].index
        const canJoin = standalone && last && last.standalone && comment.index === previousIndex + 1

        if (canJoin) {
            last.lines.push(comment)
        } else {
            blocks.push({lines: [comment], standalone})
        }
    }

    return blocks.map(block => ({
        kind: 'comment',
        startLine: block.lines[0].index + 1,
        endLine: block.lines[block.lines.length - 1].index + 1,
        lines: block.lines,
        preview: block.lines.map(line => `//${line.after}`).join('\n')
    }))
}


export function collectCommentBlocks (content) {
    return groupCommentBlocks(collectCommentLines(content))
}


export function collectEslintItems (content) {
    return findUncleanDirectiveLines(content).map(directive => ({
        kind: 'eslint',
        startLine: directive.index + 1,
        endLine: directive.index + 1,
        lines: [directive],
        preview: directive.line.trim()
    }))
}


export function collectTriageItems (content) {
    return [...collectCommentBlocks(content), ...collectEslintItems(content)]
        .sort((a, b) => a.startLine - b.startLine)
}


function editForLine (kind, entry, action) {
    if (action === 'keep') {
        if (kind === 'eslint') {
            return entry.style === '//'
                ? `${entry.line} -- clean`
                : entry.line.replace(/\s*\*\/(\s*)$/, ' -- clean */$1')
        }
        return `${entry.before}//!${entry.after}`
    }

    if (entry.before.trim() === '') {
        return REMOVE
    }
    return entry.before.trimEnd()
}


export function applyTriageEdits (content, decisions) {
    const lines = content.split('\n')
    const edits = new Map()

    for (const {item, action} of decisions) {
        if (action === 'skip') {
            continue
        }
        for (const entry of item.lines) {
            edits.set(entry.index, editForLine(item.kind, entry, action))
        }
    }

    const output = []
    lines.forEach((line, index) => {
        if (!edits.has(index)) {
            output.push(line)
            return
        }
        const value = edits.get(index)
        if (value !== REMOVE) {
            output.push(value)
        }
    })

    return output.join('\n')
}


export const TRIAGE_CHOICES = [
    {key: 'k', label: 'keep', action: 'keep'},
    {key: 'd', label: 'discard', action: 'discard'},
    {key: 's', label: 'skip', action: 'skip'},
    {key: 'q', label: 'quit', action: 'quit'}
]

const STAT_KEY = {keep: 'kept', discard: 'discarded', skip: 'skipped'}


export async function runInteractive (files, deps) {
    const {readFile, writeFile, prompt, print} = deps
    const stats = {items: 0, kept: 0, discarded: 0, skipped: 0, filesChanged: 0, quit: false}

    for (const file of files) {
        const content = readFile(file)
        const items = collectTriageItems(content)
        if (items.length === 0) {
            continue
        }

        const decisions = []
        for (const item of items) {
            print(`\n${file}:${item.startLine}-${item.endLine} ${item.kind === 'eslint' ? '(eslint-disable)' : ''}`)
            print(item.preview)
            const choice = await prompt(`  ${item.kind === 'eslint' ? 'keep adds -- clean' : 'keep adds //!'}`, TRIAGE_CHOICES)
            if (choice.action === 'quit') {
                stats.quit = true
                break
            }
            decisions.push({item, action: choice.action})
            stats.items += 1
            stats[STAT_KEY[choice.action]] += 1
        }

        const updated = applyTriageEdits(content, decisions)
        if (updated !== content) {
            writeFile(file, updated)
            stats.filesChanged += 1
        }

        if (stats.quit) {
            break
        }
    }

    return stats
}
