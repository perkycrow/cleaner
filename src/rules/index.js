import whitespace from './generic/whitespace.js'
import imports from './generic/imports.js'
import privacy from './generic/privacy.js'
import multipleClasses from './generic/multiple_classes.js'
import maxLines from './generic/max_lines.js'
import comments from './opinion/comments.js'
import switchRule from './opinion/switch.js'
import testDeepNesting from './opinion/deep_nesting.js'
import testStyle from './opinion/it_usage.js'
import testSingleDescribe from './opinion/single_describes.js'


export const ALL_RULES = [
    whitespace,
    imports,
    privacy,
    multipleClasses,
    maxLines,
    comments,
    switchRule,
    testDeepNesting,
    testStyle,
    testSingleDescribe
]
