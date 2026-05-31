import {header, bold, gray, dim, listItem, success} from '@perkycrow/cli_tools/format'
import {findDuplicateFunctions} from './duplicate_functions.js'

export {findDuplicateFunctions, collectFunctionDeclarations} from './duplicate_functions.js'


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
