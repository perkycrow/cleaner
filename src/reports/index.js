import {header, bold, gray, dim, listItem, success} from '@perkycrow/cli_tools/format'
import {findDuplicateFunctions} from './duplicate_functions.js'
import {findUnusedFiles} from './unused_files.js'


const DEFAULT_UNUSED_EXCLUDE = ['**/*.test.js', '**/*.doc.js', '**/*.guide.js']


export function reportDuplicates (files, readFile) {
    const duplicates = findDuplicateFunctions(files, readFile)

    header('Duplicate Functions')

    if (duplicates.length === 0) {
        success('No function declared more than once')
        return duplicates
    }

    for (const duplicate of duplicates) {
        const marker = duplicate.identicalBody ? gray(' (identical body)') : ''
        console.log(`  ${bold(duplicate.name)} — ${duplicate.count} definitions${marker}`)
        for (const occ of duplicate.occurrences) {
            listItem(`${occ.file}:${occ.line}  ${dim(`(${occ.params} args, ${occ.lines} lines)`)}`)
        }
    }

    return duplicates
}


export function reportUnused (files, readFile, options = {}) {
    const exclude = options.exclude || DEFAULT_UNUSED_EXCLUDE
    const unused = findUnusedFiles(files, readFile, {exclude})

    header('Unused Files')

    if (unused.length === 0) {
        success('Every file is imported somewhere')
        return unused
    }

    console.log(`  ${gray('Files never imported (may include legit entry points)')}`)
    for (const file of unused) {
        listItem(file)
    }

    return unused
}


export {findDuplicateFunctions, collectFunctionDeclarations} from './duplicate_functions.js'
export {findUnusedFiles, collectImportSources} from './unused_files.js'
