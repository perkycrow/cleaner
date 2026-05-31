import fs from 'fs'
import path from 'path'
import {fileURLToPath} from 'url'
import {findFiles} from '../src/core/scanner.js'
import {processContent as newProcess} from '../src/rules/generic/whitespace.js'
import {processContent as oldProcess} from '../../perky/scripts/cleaner/auditors/whitespace.js'


const PERKY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../perky')
const files = findFiles(PERKY, {ignore: ['node_modules/**']})

let divergences = 0

for (const file of files) {
    const content = fs.readFileSync(path.join(PERKY, file), 'utf-8')
    const next = newProcess(content).issues.join(' | ')
    const old = oldProcess(content).issues.join(' | ')

    if (next !== old) {
        divergences += 1
        console.log(`DIFF ${file}`)
        console.log(`  new: ${next}`)
        console.log(`  old: ${old}`)
    }
}

console.log(`\nwhitespace parity: ${files.length} files scanned, ${divergences} divergence(s)`)
process.exit(divergences > 0 ? 1 : 0)
