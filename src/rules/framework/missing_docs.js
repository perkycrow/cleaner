import fs from 'fs'
import path from 'path'
import {defineRule} from '../../core/rule.js'


function expectedDocPath (file) {
    return file.replace(/\.js$/, '.doc.js')
}


export default defineRule({
    name: 'missing-docs',
    group: 'framework',
    category: 'coverage',
    hint: 'Create a .doc.js file for these source files',
    defaultExclude: [
        '**/*.test.js',
        '**/*.doc.js',
        '**/*.guide.js',
        '**/index.js',
        '**/test_helpers.js'
    ],
    audit ({rootDir, files}) {
        return files
            .filter(file => !fs.existsSync(path.join(rootDir, expectedDocPath(file))))
            .map(file => ({file, messages: [`missing ${expectedDocPath(file)}`]}))
    }
})
