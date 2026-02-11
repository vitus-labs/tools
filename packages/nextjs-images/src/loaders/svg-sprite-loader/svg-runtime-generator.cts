import fs = require('node:fs')
import path = require('node:path')

// loader-utils v2 stringifyRequest — not in @types/loader-utils v3
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { stringifyRequest } = require('loader-utils') as {
  stringifyRequest: (context: unknown, request: string) => string
}

const componentPath = path.resolve(__dirname, 'component.js')

interface RuntimeGeneratorParams {
  symbol: unknown
  config: {
    spriteModule: string
    symbolModule: string
  }
  context: unknown
}

const runtimeGenerator = ({
  symbol,
  config,
  context,
}: RuntimeGeneratorParams): string => {
  const { spriteModule, symbolModule } = config
  const spriteRequest = stringifyRequest(context, spriteModule)
  const symbolRequest = stringifyRequest(context, symbolModule)

  const component = fs.readFileSync(componentPath, 'utf-8')

  return component
    .replace("'$$symbolRequest$$'", symbolRequest)
    .replace("'$$spriteRequest$$'", spriteRequest)
    .replace('$$stringifiedSymbol$$', JSON.stringify(symbol))
}

export = { runtimeGenerator }
