import fs from 'fs'
import path from 'path'
import {fileURLToPath} from 'url'
import {findFiles} from '../src/core/scanner.js'

import whitespaceRule from '../src/rules/generic/whitespace.js'
import importsRule from '../src/rules/generic/imports.js'
import privacyRule from '../src/rules/generic/privacy.js'
import multipleClassesRule from '../src/rules/generic/multiple_classes.js'
import commentsRule from '../src/rules/opinion/comments.js'
import switchRule from '../src/rules/opinion/switch.js'

import WhitespaceAuditor from '../../perky/scripts/cleaner/auditors/whitespace.js'
import ImportsAuditor from '../../perky/scripts/cleaner/auditors/imports.js'
import PrivacyAuditor from '../../perky/scripts/cleaner/auditors/privacy.js'
import MultipleClassesAuditor from '../../perky/scripts/cleaner/auditors/multiple_classes.js'
import CommentsAuditor from '../../perky/scripts/cleaner/auditors/comments.js'
import SwitchesAuditor from '../../perky/scripts/cleaner/auditors/eslint/switches.js'


const PERKY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../perky')
const files = findFiles(PERKY, {ignore: ['node_modules/**', 'dist/**']})

const PER_FILE = {
    'whitespace': {rule: whitespaceRule, Auditor: WhitespaceAuditor},
    'imports': {rule: importsRule, Auditor: ImportsAuditor},
    'privacy': {rule: privacyRule, Auditor: PrivacyAuditor},
    'multiple-classes': {rule: multipleClassesRule, Auditor: MultipleClassesAuditor},
    'comments': {rule: commentsRule, Auditor: CommentsAuditor}
}


function comparePerFile (name, {rule, Auditor}) {
    const auditor = new Auditor(PERKY, {})
    let divergences = 0

    for (const file of files) {
        const content = fs.readFileSync(path.join(PERKY, file), 'utf-8')
        const absolutePath = path.join(PERKY, file)
        const ctx = {relativePath: file, absolutePath, rootDir: PERKY, options: {}}

        const newCount = rule.check(content, ctx).length
        const oldCount = auditor.analyze(content, file, absolutePath).length

        if (newCount !== oldCount) {
            divergences += 1
            console.log(`  DIFF ${file}: new=${newCount} old=${oldCount}`)
        }
    }

    console.log(`${name}: ${files.length} files, ${divergences} divergence(s)`)
    return divergences
}


function compareSwitchTotals () {
    const newTotal = files.reduce((sum, file) => {
        const content = fs.readFileSync(path.join(PERKY, file), 'utf-8')
        return sum + switchRule.check(content, {}).length
    }, 0)

    const oldTotal = new SwitchesAuditor(PERKY, {silent: true}).audit().switchesFound
    const divergence = newTotal === oldTotal ? 0 : 1

    console.log(`switch (totals): new=${newTotal} old=${oldTotal}, ${divergence} divergence(s)`)
    return divergence
}


let total = 0
for (const name of Object.keys(PER_FILE)) {
    total += comparePerFile(name, PER_FILE[name])
}
total += compareSwitchTotals()

console.log(`\nTOTAL divergences: ${total}`)
process.exit(total > 0 ? 1 : 0)
