import fs from 'fs'
import path from 'path'
import {defineRule} from '../../core/rule.js'


function expectedTestPath (file) {
    return file.replace(/\.js$/, '.test.js')
}


export default defineRule({
    name: 'missing-tests',
    group: 'opinion',
    category: 'tests',
    hint: 'Create a .test.js file for these source files',
    defaultExclude: [
        '**/*.test.js',
        '**/*.doc.js',
        '**/*.guide.js',
        '**/index.js'
    ],
    audit ({rootDir, files}) {
        return files
            .filter(file => !fs.existsSync(path.join(rootDir, expectedTestPath(file))))
            .map(file => ({file, messages: [`missing ${expectedTestPath(file)}`]}))
    }
})
