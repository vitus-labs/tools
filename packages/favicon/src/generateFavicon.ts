import fs from 'fs'
import favicons from 'favicons'
import { loadVLToolsConfig } from '@vitus-labs/tools-core'
import baseConfig from '~/baseConfig'

const VL_CONFIG = loadVLToolsConfig('favicon')

const { icons, path, ...restConfig } = VL_CONFIG.merge(baseConfig)

const callback = (outputPath) => (error, response) => {
  if (error) {
    console.log(error.message) // Error description e.g. "An unknown error has occurred"
    return
  }

  console.log('Creating images...')
  response.images.forEach((item) => {
    fs.writeFileSync(`${outputPath}${item.name}`, item.contents)
  })

  console.log('Creating manifests...')
  response.files.forEach((item) => {
    fs.writeFileSync(`${outputPath}${item.name}`, item.contents)
  })
}

const generateFavicons = () =>
  icons.forEach((item) => {
    const inputPath = `${process.cwd()}/${item.input}`
    const outputPath = `${process.cwd()}/${item.output}/`

    // favicons(source, configuration, callback)
    favicons(
      inputPath,
      { ...restConfig, path: `${path}/${item.path}` },
      callback(outputPath)
    )
  })

export default generateFavicons
