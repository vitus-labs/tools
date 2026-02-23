interface RuntimeGeneratorContext {
  context: string
  rootContext: string
  utils: {
    contextify: (context: string, request: string) => string
  }
}

interface RuntimeGeneratorParams {
  symbol: unknown
  config: {
    spriteModule: string
    symbolModule: string
  }
  context: RuntimeGeneratorContext
}

const stringifyRequest = (
  loaderContext: RuntimeGeneratorContext,
  request: string,
): string =>
  JSON.stringify(
    loaderContext.utils.contextify(
      loaderContext.context || loaderContext.rootContext,
      request,
    ),
  )

const COMPONENT_TEMPLATE = `\
import { createElement } from 'react'
import sprite from '$$spriteRequest$$'
import SpriteSymbol from '$$symbolRequest$$'

const symbol = new SpriteSymbol($$stringifiedSymbol$$)
sprite.add(symbol)

const SvgSpriteIcon = (props) =>
  createElement(
    'svg',
    { viewBox: symbol.viewBox, ...props },
    createElement('use', { xlinkHref: '#' + symbol.id }),
  )

SvgSpriteIcon.viewBox = symbol.viewBox
SvgSpriteIcon.id = symbol.id
SvgSpriteIcon.content = symbol.content
SvgSpriteIcon.url = symbol.url
SvgSpriteIcon.toString = symbol.toString

export { SvgSpriteIcon }
export default SvgSpriteIcon
`

const runtimeGenerator = ({
  symbol,
  config,
  context,
}: RuntimeGeneratorParams): string => {
  const spriteRequest = stringifyRequest(context, config.spriteModule)
  const symbolRequest = stringifyRequest(context, config.symbolModule)

  return COMPONENT_TEMPLATE.replace("'$$symbolRequest$$'", symbolRequest)
    .replace("'$$spriteRequest$$'", spriteRequest)
    .replace('$$stringifiedSymbol$$', JSON.stringify(symbol))
}

export { runtimeGenerator }
