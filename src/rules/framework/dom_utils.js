import {defineRule} from '../../core/rule.js'
import {findVerbosePatterns} from './dom_utils_scan.js'


export default defineRule({
    name: 'dom-utils',
    group: 'framework',
    category: 'dom_utils_usage',
    hint: 'Refactor verbose createElement/setAttribute sequences with createElement() from dom_utils',
    defaultExclude: ['**/*.test.js'],
    check (content) {
        return findVerbosePatterns(content)
    }
})
