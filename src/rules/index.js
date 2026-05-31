import whitespace from './generic/whitespace.js'
import imports from './generic/imports.js'
import privacy from './generic/privacy.js'
import multipleClasses from './generic/multiple_classes.js'
import maxLines from './generic/max_lines.js'
import comments from './opinion/comments.js'
import switchRule from './opinion/switch.js'


export const ALL_RULES = [
    whitespace,
    imports,
    privacy,
    multipleClasses,
    maxLines,
    comments,
    switchRule
]
