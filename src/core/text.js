export function isInsideRegex (textBefore) {
    const lastSlash = textBefore.lastIndexOf('/')
    if (lastSlash === -1) {
        return false
    }

    const charBefore = textBefore[lastSlash - 1]
    if (/[a-zA-Z0-9_$)\]}"'`]/.test(charBefore)) {
        return false
    }

    const textBeforeSlash = textBefore.substring(0, lastSlash)
    if (oddQuotes(textBeforeSlash)) {
        return false
    }

    const afterSlash = textBefore.substring(lastSlash + 1)
    return /^[^/]*$/.test(afterSlash)
}


export function isInsideString (textBefore) {
    if (oddQuotes(textBefore)) {
        return true
    }
    return isInsideRegex(textBefore)
}


function oddQuotes (text) {
    const doubleQuotes = (text.match(/"/g) || []).length
    const singleQuotes = (text.match(/'/g) || []).length
    const backticks = (text.match(/`/g) || []).length
    return (doubleQuotes + singleQuotes + backticks) % 2 !== 0
}
