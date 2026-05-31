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
import deepNestingRule from '../src/rules/opinion/deep_nesting.js'
import testStyleRule from '../src/rules/opinion/it_usage.js'
import singleDescribeRule from '../src/rules/opinion/single_describes.js'

import WhitespaceAuditor from '../../perky/scripts/cleaner/auditors/whitespace.js'
import ImportsAuditor from '../../perky/scripts/cleaner/auditors/imports.js'
import PrivacyAuditor from '../../perky/scripts/cleaner/auditors/privacy.js'
import MultipleClassesAuditor from '../../perky/scripts/cleaner/auditors/multiple_classes.js'
import CommentsAuditor from '../../perky/scripts/cleaner/auditors/comments.js'
import SwitchesAuditor from '../../perky/scripts/cleaner/auditors/eslint/switches.js'
import DeepNestingAuditor from '../../perky/scripts/cleaner/auditors/tests/deep_nesting.js'
import ItUsageAuditor from '../../perky/scripts/cleaner/auditors/tests/it_usage.js'
import SingleDescribesAuditor from '../../perky/scripts/cleaner/auditors/tests/single_describes.js'


const PERKY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../perky')
const files = findFiles(PERKY, {ignore: ['node_modules/**', 'dist/**']})

const read = file => fs.readFileSync(path.join(PERKY, file), 'utf-8')


const ctxFor = file => ({relativePath: file, absolutePath: path.join(PERKY, file), rootDir: PERKY, options: {}})


const PER_FILE = {
    'whitespace': {rule: whitespaceRule, Auditor: WhitespaceAuditor},
    'imports': {rule: importsRule, Auditor: ImportsAuditor},
    'privacy': {rule: privacyRule, Auditor: PrivacyAuditor},
    'multiple-classes': {rule: multipleClassesRule, Auditor: MultipleClassesAuditor},
    'comments': {rule: commentsRule, Auditor: CommentsAuditor}
}

const FLAGGED_SET = {
    'test-deep-nesting': {rule: deepNestingRule, Auditor: DeepNestingAuditor, exclude: ['scripts/cleaner/', 'doc/']},
    'test-style': {rule: testStyleRule, Auditor: ItUsageAuditor, exclude: ['scripts/cleaner/']},
    'test-single-describe': {rule: singleDescribeRule, Auditor: SingleDescribesAuditor, exclude: ['scripts/cleaner/'], excludeFiles: ['doc/test_parser.test.js']}
}


function comparePerFile (name, {rule, Auditor}) {
    const auditor = new Auditor(PERKY, {})
    let divergences = 0

    for (const file of files) {
        const newCount = rule.check(read(file), ctxFor(file)).length
        const oldCount = auditor.analyze(read(file), file, path.join(PERKY, file)).length
        if (newCount !== oldCount) {
            divergences += 1
            console.log(`  DIFF ${file}: new=${newCount} old=${oldCount}`)
        }
    }

    console.log(`${name}: ${files.length} files, ${divergences} divergence(s)`)
    return divergences
}


function compareFlaggedSet (name, {rule, Auditor, exclude = [], excludeFiles = []}) {
    const testFiles = files.filter(file =>
        file.endsWith('.test.js') &&
        !exclude.some(prefix => file.startsWith(prefix)) &&
        !excludeFiles.includes(file))

    const newFlagged = new Set(testFiles.filter(file => rule.check(read(file), ctxFor(file)).length > 0))
    const oldFlagged = new Set(new Auditor(PERKY, {silent: true}).audit().files)

    const onlyNew = [...newFlagged].filter(file => !oldFlagged.has(file))
    const onlyOld = [...oldFlagged].filter(file => !newFlagged.has(file))

    for (const file of onlyNew) {
        console.log(`  NEW-only ${file}`)
    }
    for (const file of onlyOld) {
        console.log(`  OLD-only ${file}`)
    }

    const divergences = onlyNew.length + onlyOld.length
    console.log(`${name}: new=${newFlagged.size} old=${oldFlagged.size} flagged, ${divergences} divergence(s)`)
    return divergences
}


function compareSwitchTotals () {
    const newTotal = files.reduce((sum, file) => sum + switchRule.check(read(file), {}).length, 0)
    const oldTotal = new SwitchesAuditor(PERKY, {silent: true}).audit().switchesFound
    const divergence = newTotal === oldTotal ? 0 : 1
    console.log(`switch (totals): new=${newTotal} old=${oldTotal}, ${divergence} divergence(s)`)
    return divergence
}


let total = 0
for (const name of Object.keys(PER_FILE)) {
    total += comparePerFile(name, PER_FILE[name])
}
for (const name of Object.keys(FLAGGED_SET)) {
    total += compareFlaggedSet(name, FLAGGED_SET[name])
}
total += compareSwitchTotals()

console.log(`\nTOTAL divergences: ${total}`)
process.exit(total > 0 ? 1 : 0)
