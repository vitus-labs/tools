import { exec } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { platform } from 'node:os'
import { resolve } from 'node:path'
import type { AnalysisData, AtlasConfig } from '../types'
import { generateJsonReport, generateMarkdownReport } from './report'
import { buildHtml } from './template'

const openFile = (filePath: string) => {
  const os = platform()
  const cmd =
    os === 'darwin'
      ? `open "${filePath}"`
      : os === 'win32'
        ? `start "" "${filePath}"`
        : `xdg-open "${filePath}"`

  exec(cmd, () => {})
}

export const renderGraph = async (
  data: AnalysisData,
  config: AtlasConfig,
): Promise<{ htmlPath: string; reportPath?: string }> => {
  const htmlPath = resolve(process.cwd(), config.outputPath)
  const html = buildHtml(data, config)
  writeFileSync(htmlPath, html)

  let reportPath: string | undefined

  if (config.report !== false) {
    const format = config.report === true ? 'markdown' : config.report

    if (format === 'json' || config.report === true) {
      const jsonPath = htmlPath.replace(/\.html$/, '-report.json')
      writeFileSync(jsonPath, generateJsonReport(data))
      reportPath = jsonPath
    }

    if (format === 'markdown' || config.report === true) {
      const mdPath = htmlPath.replace(/\.html$/, '-report.md')
      writeFileSync(mdPath, generateMarkdownReport(data))
      reportPath = mdPath
    }
  }

  if (config.open) {
    openFile(htmlPath)
  }

  return { htmlPath, reportPath }
}
