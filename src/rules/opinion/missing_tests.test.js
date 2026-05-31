import {describe, test, expect, beforeAll, afterAll} from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import rule from './missing_tests.js'


describe('missing-tests rule', () => {

    let root

    beforeAll(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'cleaner-mtests-'))
        fs.writeFileSync(path.join(root, 'tested.js'), '')
        fs.writeFileSync(path.join(root, 'tested.test.js'), '')
        fs.writeFileSync(path.join(root, 'untested.js'), '')
    })

    afterAll(() => {
        fs.rmSync(root, {recursive: true, force: true})
    })

    test('flags files without a .test.js sibling', () => {
        const issues = rule.audit({rootDir: root, files: ['tested.js', 'untested.js']})
        expect(issues).toHaveLength(1)
        expect(issues[0].file).toBe('untested.js')
        expect(issues[0].messages[0]).toBe('missing untested.test.js')
    })

    test('opinion group (opt-in)', () => {
        expect(rule.group).toBe('opinion')
    })

})
