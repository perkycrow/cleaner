import {describe, test, expect, beforeAll, afterAll} from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {defineRule} from './rule.js'
import {createRegistry} from './registry.js'
import {resolveConfig} from './config.js'
import {runAudit, runFix} from './runner.js'


const noBad = defineRule({
    name: 'no-bad',
    group: 'generic',
    check: content => (content.includes('BAD') ? ['contains BAD'] : [])
})

const countFiles = defineRule({
    name: 'count-files',
    group: 'generic',
    audit: ({files}) => (files.length > 2 ? [{file: '(project)', messages: [`${files.length} files`]}] : [])
})

const offByDefault = defineRule({
    name: 'framework-only',
    group: 'framework',
    check: () => ['should not run']
})


function registry () {
    return createRegistry([noBad, countFiles, offByDefault])
}


describe('runAudit', () => {

    let root

    beforeAll(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'cleaner-run-'))
        fs.mkdirSync(path.join(root, 'sub'), {recursive: true})
        fs.writeFileSync(path.join(root, 'good.js'), 'all ok')
        fs.writeFileSync(path.join(root, 'bad.js'), 'this is BAD')
        fs.writeFileSync(path.join(root, 'sub', 'also_bad.js'), 'also BAD')
    })

    afterAll(() => {
        fs.rmSync(root, {recursive: true, force: true})
    })

    test('per-file check rule flags matching files', async () => {
        const config = resolveConfig({}, registry())
        const {results} = await runAudit(root, registry(), config)
        const noBadResult = results.find(r => r.name === 'no-bad')
        expect(noBadResult.issueCount).toBe(2)
        expect(noBadResult.issues.map(i => i.file).sort()).toEqual(['bad.js', 'sub/also_bad.js'])
    })

    test('project audit rule sees the scoped file list', async () => {
        const config = resolveConfig({}, registry())
        const {results} = await runAudit(root, registry(), config)
        const countResult = results.find(r => r.name === 'count-files')
        expect(countResult.issueCount).toBe(1)
        expect(countResult.issues[0].messages[0]).toBe('3 files')
    })

    test('framework rule is off under the default (generic) preset', async () => {
        const config = resolveConfig({}, registry())
        const {results} = await runAudit(root, registry(), config)
        expect(results.find(r => r.name === 'framework-only')).toBeUndefined()
    })

    test('per-rule exclude narrows the scope', async () => {
        const config = resolveConfig({rules: {'no-bad': {exclude: ['sub/**']}}}, registry())
        const {results} = await runAudit(root, registry(), config)
        const noBadResult = results.find(r => r.name === 'no-bad')
        expect(noBadResult.issues.map(i => i.file)).toEqual(['bad.js'])
    })

    test('per-rule include restricts to a subtree', async () => {
        const config = resolveConfig({rules: {'no-bad': {include: ['sub/**']}}}, registry())
        const {results} = await runAudit(root, registry(), config)
        const noBadResult = results.find(r => r.name === 'no-bad')
        expect(noBadResult.issues.map(i => i.file)).toEqual(['sub/also_bad.js'])
    })

    test('totals aggregate across rules', async () => {
        const config = resolveConfig({}, registry())
        const {totals} = await runAudit(root, registry(), config)
        expect(totals.rules).toBe(2)
        expect(totals.issues).toBe(3)
    })

})


const trimTrailing = defineRule({
    name: 'trim-trailing',
    group: 'generic',
    check: content => (/ +$/m.test(content) ? ['trailing space'] : []),
    fix (content) {
        const result = content.replace(/ +$/gm, '')
        return {result, fixed: result !== content, fixCount: 1}
    }
})


describe('runFix', () => {

    let root

    beforeAll(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'cleaner-fix-'))
        fs.writeFileSync(path.join(root, 'dirty.js'), 'const x = 1   \n')
        fs.writeFileSync(path.join(root, 'clean.js'), 'const y = 2\n')
    })

    afterAll(() => {
        fs.rmSync(root, {recursive: true, force: true})
    })

    function fixRegistry () {
        return createRegistry([trimTrailing])
    }

    test('dry run reports fixes without writing', async () => {
        const config = resolveConfig({}, fixRegistry())
        const result = await runFix(root, fixRegistry(), config, {dryRun: true})
        expect(result.totals.filesFixed).toBe(1)
        expect(fs.readFileSync(path.join(root, 'dirty.js'), 'utf-8')).toBe('const x = 1   \n')
    })

    test('applies fixes to disk when not a dry run', async () => {
        const config = resolveConfig({}, fixRegistry())
        const result = await runFix(root, fixRegistry(), config, {})
        expect(result.totals.filesFixed).toBe(1)
        expect(result.totals.issuesFixed).toBe(1)
        expect(fs.readFileSync(path.join(root, 'dirty.js'), 'utf-8')).toBe('const x = 1\n')
    })

    test('non-fixable rules are skipped', async () => {
        const registry = createRegistry([
            defineRule({name: 'audit-only', group: 'generic', check: () => ['x']})
        ])
        const config = resolveConfig({}, registry)
        const result = await runFix(root, registry, config, {})
        expect(result.results).toHaveLength(0)
    })

})
