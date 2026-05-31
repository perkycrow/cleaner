import {defineRule} from '../../core/rule.js'
import {isInsideString} from '../../core/text.js'


const STYLE_ELEMENT_PATTERN = /document\.createElement\s*\(\s*['"`]style['"`]\s*\)/g


export function findStyleElements (content) {
    const issues = []
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        let match

        STYLE_ELEMENT_PATTERN.lastIndex = 0

        while ((match = STYLE_ELEMENT_PATTERN.exec(line)) !== null) {
            if (!isInsideString(line.substring(0, match.index))) {
                issues.push(`L${i + 1}: document.createElement('style')`)
            }
        }
    }

    return issues
}


export default defineRule({
    name: 'style-elements',
    group: 'framework',
    category: 'styles',
    hint: 'Use createStyleSheet + adoptStyleSheets (a .styles.js stylesheet) instead of a <style> element',
    defaultExclude: ['**/*.test.js'],
    check (content) {
        return findStyleElements(content)
    }
})
