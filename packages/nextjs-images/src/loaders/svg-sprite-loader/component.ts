/* eslint-disable */
// This file is a template processed by svg-sprite-loader's runtime generator.
// The $$...$$ placeholders are replaced at build time.

import { createElement } from 'react'
// @ts-expect-error — placeholder replaced by svg-sprite-loader
import sprite from '$$spriteRequest$$'
// @ts-expect-error — placeholder replaced by svg-sprite-loader
import SpriteSymbol from '$$symbolRequest$$'

// @ts-expect-error — placeholder replaced by svg-sprite-loader
// biome-ignore lint/correctness/noUndeclaredVariables: placeholder replaced by svg-sprite-loader at build time
const symbol = new SpriteSymbol($$stringifiedSymbol$$)
sprite.add(symbol)

const SvgSpriteIcon = (props: Record<string, unknown>) =>
  createElement(
    'svg',
    {
      viewBox: symbol.viewBox,
      ...props,
    },
    createElement('use', {
      xlinkHref: `#${symbol.id}`,
    }),
  )

SvgSpriteIcon.viewBox = symbol.viewBox
SvgSpriteIcon.id = symbol.id
SvgSpriteIcon.content = symbol.content
SvgSpriteIcon.url = symbol.url
SvgSpriteIcon.toString = symbol.toString

export { SvgSpriteIcon }
export default SvgSpriteIcon
