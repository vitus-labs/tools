import fs from 'node:fs'
import favicons from 'favicons'
import { VL_CONFIG } from '@vitus-labs/tools-core'
import { configuration } from './baseConfig.js'

const { icons, path, ...restConfig } =
  VL_CONFIG('favicon').merge(configuration).config

const handleSuccess = (outputPath, response) => {
  console.log('Creating images...')
  response.images.forEach((item) => {
    fs.writeFileSync(`${outputPath}${item.name}`, item.contents)
  })

  console.log('Creating manifests...')
  response.files.forEach((item) => {
    fs.writeFileSync(`${outputPath}${item.name}`, item.contents)
  })
}

const handleError = (error) => {
  console.log(error.message) // Error description e.g. "An unknown error has occurred"
}

const generateFavicons = () =>
  Promise.all(
    icons.map((item) => {
      const inputPath = `${process.cwd()}/${item.input}`
      const outputPath = `${process.cwd()}/${item.output}/`

      return favicons(inputPath, {
        ...restConfig,
        path: `${path}/${item.path}`,
      }).then(
        (res) => handleSuccess(outputPath, res),
        (err) => handleError(err),
      )
    }),
  )

export { generateFavicons }
