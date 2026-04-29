import type { AtlasConfig } from '../types.ts'

const baseConfig: Required<AtlasConfig> = {
  workspaces: ['packages/*'],
  depTypes: ['dependencies', 'peerDependencies', 'devDependencies'],
  include: [],
  exclude: [],
  outputPath: './atlas.html',
  echartsCdn: 'https://cdn.jsdelivr.net/npm/echarts@5.6.1/dist/echarts.min.js',
  open: true,
  title: 'Atlas — Dependency Graph',
  report: 'markdown',
}

export default baseConfig
