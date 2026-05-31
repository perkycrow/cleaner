import {isInsideString} from '../core/text.js'
import {isProtectedComment, isUrlComment} from '../rules/opinion/comments.js'


const REMOVE = Symbol('remove-line')


export function collectCommentBlocks (content) {
    const lines = content.split('\n')
    let textFromStart = ''
    const lineComments = []

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const match = line.match(/^(.*?)\/\/(.*)$/)

        if (match) {
            const [, before, after] = match
            const strippable = !isUrlComment(before) &&
                !isInsideString(textFromStart + before) &&
                !isProtectedComment(after)

            if (strippable) {
                lineComments.push({index: i, before, after})
                textFromStart += before + '\n'
                continue
            }
        }

        textFromStart += line + '\n'
    }

    return groupConsecutive(lineComments)
}


function groupConsecutive (lineComments) {
    const blocks = []

    for (const comment of lineComments) {
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
        startLine: block.lines[0].index + 1,
        endLine: block.lines[block.lines.length - 1].index + 1,
        lines: block.lines,
        preview: block.lines.map(line => `//${line.after}`).join('\n')
    }))
}


export function applyBlockEdits (content, decisions) {
    const lines = content.split('\n')
    const edits = new Map()

    for (const {block, action} of decisions) {
        if (action === 'skip') {
            continue
        }
        for (const comment of block.lines) {
            edits.set(comment.index, editForLine(comment, action))
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


function editForLine (comment, action) {
    if (action === 'keep') {
        return `${comment.before}//!${comment.after}`
    }
    if (comment.before.trim() === '') {
        return REMOVE
    }
    return comment.before.trimEnd()
}


export const COMMENT_CHOICES = [
    {key: 'k', label: 'keep', action: 'keep'},
    {key: 'd', label: 'discard', action: 'discard'},
    {key: 's', label: 'skip', action: 'skip'}
]

const STAT_KEY = {keep: 'kept', discard: 'discarded', skip: 'skipped'}


export async function runInteractiveComments (files, deps) {
    const {readFile, writeFile, prompt, print} = deps
    const stats = {blocks: 0, kept: 0, discarded: 0, skipped: 0, filesChanged: 0}

    for (const file of files) {
        const content = readFile(file)
        const blocks = collectCommentBlocks(content)
        if (blocks.length === 0) {
            continue
        }

        const decisions = []
        for (const block of blocks) {
            print(`\n${file}:${block.startLine}-${block.endLine}`)
            print(block.preview)
            const choice = await prompt('  comment?', COMMENT_CHOICES)
            decisions.push({block, action: choice.action})
            stats.blocks += 1
            stats[STAT_KEY[choice.action]] += 1
        }

        const updated = applyBlockEdits(content, decisions)
        if (updated !== content) {
            writeFile(file, updated)
            stats.filesChanged += 1
        }
    }

    return stats
}
