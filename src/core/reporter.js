import {
    header, success, successCompact, failureCompact,
    hint as printHint, listItem, divider, gray
} from '@perkycrow/cli_tools/format'


export function report (runResult, options = {}) {
    const compact = options.compact === true

    for (const result of runResult.results) {
        reportRule(result, compact)
    }

    reportTotals(runResult.totals)

    return runResult
}


function reportRule (result, compact) {
    const title = humanize(result.name)

    if (result.issueCount === 0) {
        successCompact(`${title}: clean`)
        return
    }

    if (compact) {
        failureCompact(`${title}: ${result.issueCount} issue(s) in ${result.issues.length} file(s)`)
        return
    }

    header(`${title} — ${result.issueCount} issue(s)`)
    if (result.hint) {
        printHint(result.hint)
    }
    divider()
    for (const entry of result.issues) {
        listItem(entry.file, entry.messages.length)
        for (const message of entry.messages) {
            console.log(`      ${gray(message)}`)
        }
    }
}


export function reportFix (fixResult) {
    const label = fixResult.dryRun ? 'would fix' : 'fixed'

    for (const result of fixResult.results) {
        if (result.filesFixed > 0) {
            successCompact(`${humanize(result.name)}: ${label} ${result.issuesFixed} issue(s) in ${result.filesFixed} file(s)`)
        }
    }

    divider()
    const {filesFixed, issuesFixed} = fixResult.totals
    if (issuesFixed === 0) {
        success('Nothing to fix')
    } else {
        success(`${label} ${issuesFixed} issue(s) across ${filesFixed} file(s)`)
    }

    return fixResult
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
