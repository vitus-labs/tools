import { execFile } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { platform } from 'node:os'
import { resolve } from 'node:path'
import type { AnalysisData, AtlasConfig } from '../types.ts'
import {
  buildReportData,
  formatMarkdownReport,
  generateJsonReport,
  generateMarkdownReport,
  serializeJsonReport,
} from './report.ts'
import { buildHtml } from './template.ts'

const openFile = (filePath: string) => {
  const os = platform()
  const cmd =
    os === 'darwin' ? 'open' : os === 'win32' ? 'explorer' : 'xdg-open'

  execFile(cmd, [filePath], () => {
    // intentionally ignored — best-effort open
  })
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
    const wantsJson = format === 'json' || config.report === true
    const wantsMarkdown = format === 'markdown' || config.report === true

    // Build the report data structure once when both formats are
    // requested — was previously rebuilt twice via the convenience
    // wrappers (10-15ms saved on large graphs).
    if (wantsJson && wantsMarkdown) {
      const report = buildReportData(data)
      const jsonPath = htmlPath.replace(/\.html$/, '-report.json')
      writeFileSync(jsonPath, serializeJsonReport(report))
      const mdPath = htmlPath.replace(/\.html$/, '-report.md')
      writeFileSync(
        mdPath,
        formatMarkdownReport(report, data.depth.criticalPath),
      )
      reportPath = mdPath
    } else if (wantsJson) {
      const jsonPath = htmlPath.replace(/\.html$/, '-report.json')
      writeFileSync(jsonPath, generateJsonReport(data))
      reportPath = jsonPath
    } else if (wantsMarkdown) {
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
