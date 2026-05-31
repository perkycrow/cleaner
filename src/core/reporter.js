import {
    header, success, successCompact, failureCompact,
    hint as printHint, listItem, divider
} from '@perkycrow/cli_tools/format'


export function report (runResult, options = {}) {
    const compact = options.compact !== false

    for (const result of runResult.results) {
        reportRule(result, compact)
    }

    reportTotals(runResult.totals)

    return runResult
}


function reportRule (result, compact) {
    const title = humanize(result.name)

    if (result.issueCount === 0) {
        if (compact) {
            successCompact(`${title}: clean`)
        } else {
            header(title)
            success('No issues')
        }
        return
    }

    if (compact) {
        failureCompact(`${title}: ${result.issueCount} issue(s) in ${result.issues.length} file(s)`)
        return
    }

    header(title)
    if (result.hint) {
        printHint(result.hint)
    }
    divider()
    for (const entry of result.issues) {
        listItem(entry.file, entry.messages.length)
    }
}


function reportTotals (totals) {
    divider()
    if (totals.issues === 0) {
        success(`All ${totals.rules} rule(s) clean`)
    } else {
        failureCompact(`${totals.issues} issue(s) across ${totals.rules} rule(s)`)
    }
}


function humanize (name) {
    return name
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}
