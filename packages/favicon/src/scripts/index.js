const fs = require('fs')
const favicons = require('favicons')
const { loadConfig } = require('@vitus-labs/tools-core')
const baseConfig = require('../baseConfig')

const { icons, path, ...CONFIG } = loadConfig('favicon', baseConfig)

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
      { ...CONFIG, path: `${path}/${item.path}` },
      callback(outputPath)
    )
  })

module.exports = generateFavicons
