import type { AnalysisData, AtlasConfig } from '../types'

export const buildHtml = (data: AnalysisData, config: AtlasConfig): string => {
  const graphJson = JSON.stringify(data)

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${config.title}</title>
<script src="${config.echartsCdn}"></script>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    background: #0d1117;
    color: #c9d1d9;
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  #sidebar {
    width: 320px;
    min-width: 320px;
    background: #161b22;
    border-right: 1px solid #30363d;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  #sidebar h1 {
    font-size: 16px;
    font-weight: 600;
    padding: 16px;
    border-bottom: 1px solid #30363d;
    color: #e6edf3;
  }

  .sidebar-section {
    padding: 12px 16px;
    border-bottom: 1px solid #30363d;
  }

  .sidebar-section h2 {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #8b949e;
    margin-bottom: 8px;
  }

  .tabs {
    display: flex;
    gap: 4px;
  }

  .tab {
    flex: 1;
    padding: 6px 8px;
    background: #21262d;
    border: 1px solid #30363d;
    border-radius: 6px;
    color: #8b949e;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    text-align: center;
    transition: background 0.15s, color 0.15s;
  }

  .tab:hover { background: #30363d; color: #c9d1d9; }
  .tab.active { background: #1f6feb; border-color: #1f6feb; color: #fff; }

  #search {
    width: 100%;
    padding: 6px 10px;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 6px;
    color: #c9d1d9;
    font-size: 13px;
    outline: none;
  }

  #search:focus { border-color: #1f6feb; }
  #search::placeholder { color: #484f58; }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    margin-bottom: 4px;
  }

  .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    padding: 4px 0;
  }

  .stat-label { color: #8b949e; }

  .stat-value {
    font-weight: 600;
    color: #e6edf3;
  }

  .stat-value.warn { color: #f0883e; }
  .stat-value.ok { color: #3fb950; }

  .critical-path {
    font-size: 11px;
    color: #8b949e;
    word-break: break-all;
    line-height: 1.5;
    margin-top: 4px;
  }

  .critical-path span { color: #c9d1d9; }

  .hotspot-item {
    font-size: 12px;
    padding: 4px 0;
    color: #c9d1d9;
  }

  .hotspot-item .name { font-weight: 500; }
  .hotspot-item .meta { color: #8b949e; font-size: 11px; }

  #main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  #chart {
    flex: 1;
    width: 100%;
    height: 100%;
  }
</style>
</head>
<body>

<div id="sidebar">
  <h1>${config.title}</h1>

  <div class="sidebar-section">
    <h2>Chart Type</h2>
    <div class="tabs">
      <div class="tab active" data-chart="force">Force</div>
      <div class="tab" data-chart="tree">Tree</div>
      <div class="tab" data-chart="matrix">Matrix</div>
    </div>
  </div>

  <div class="sidebar-section">
    <h2>Search / Filter</h2>
    <input id="search" type="text" placeholder="Filter packages..." />
  </div>

  <div class="sidebar-section">
    <h2>Dependency Types</h2>
    <div class="legend-item"><div class="legend-dot" style="background:#3b82f6"></div> dependencies</div>
    <div class="legend-item"><div class="legend-dot" style="background:#22c55e"></div> peerDependencies</div>
    <div class="legend-item"><div class="legend-dot" style="background:#9ca3af"></div> devDependencies</div>
  </div>

  <div class="sidebar-section">
    <h2>Analysis</h2>
    <div id="analysis-panel"></div>
  </div>
</div>

<div id="main">
  <div id="chart"></div>
</div>

<script>
(function () {
  const GRAPH_DATA = ${graphJson};

  var chart = echarts.init(document.getElementById('chart'), null, { renderer: 'canvas' });
  var currentChart = 'force';
  var filterText = '';

  // ---- helpers ----
  var depTypeColor = {
    dependencies: '#3b82f6',
    peerDependencies: '#22c55e',
    devDependencies: '#9ca3af'
  };

  var cycleNodeSet = {};
  (GRAPH_DATA.cycles.cycles || []).forEach(function (c) {
    c.forEach(function (n) { cycleNodeSet[n] = true; });
  });

  function impactCount(name) {
    return (GRAPH_DATA.impact.impactMap[name] || []).length;
  }

  function nodeSize(name) {
    var count = impactCount(name);
    return Math.max(8, Math.min(40, 8 + count * 4));
  }

  function filterNodes() {
    if (!filterText) return GRAPH_DATA.graph.nodes;
    var q = filterText.toLowerCase();
    return GRAPH_DATA.graph.nodes.filter(function (n) {
      return n.name.toLowerCase().indexOf(q) !== -1;
    });
  }

  function filterEdges(nodeNames) {
    var set = {};
    nodeNames.forEach(function (n) { set[n] = true; });
    return GRAPH_DATA.graph.edges.filter(function (e) {
      return set[e.source] && set[e.target];
    });
  }

  // ---- analysis panel ----
  function renderAnalysis() {
    var cycles = GRAPH_DATA.cycles.cycles || [];
    var maxDepth = GRAPH_DATA.depth.maxDepth;
    var criticalPath = GRAPH_DATA.depth.criticalPath || [];
    var scores = GRAPH_DATA.healthScore.scores || {};
    var hotspots = GRAPH_DATA.changeFrequency ? (GRAPH_DATA.changeFrequency.hotspots || []) : [];

    var scoreValues = Object.keys(scores).map(function (k) { return scores[k].score; });
    var avgScore = scoreValues.length
      ? Math.round(scoreValues.reduce(function (a, b) { return a + b; }, 0) / scoreValues.length)
      : 0;
    var minScore = scoreValues.length ? Math.min.apply(null, scoreValues) : 0;

    var html = '';
    html += '<div class="stat-row"><span class="stat-label">Cycles</span><span class="stat-value' + (cycles.length > 0 ? ' warn' : ' ok') + '">' + cycles.length + '</span></div>';
    html += '<div class="stat-row"><span class="stat-label">Max depth</span><span class="stat-value">' + maxDepth + '</span></div>';

    if (criticalPath.length > 0) {
      html += '<div class="stat-row"><span class="stat-label">Critical path</span></div>';
      html += '<div class="critical-path">' + criticalPath.map(function (p) { return '<span>' + p + '</span>'; }).join(' &rarr; ') + '</div>';
    }

    html += '<div class="stat-row" style="margin-top:8px"><span class="stat-label">Avg health score</span><span class="stat-value' + (avgScore < 50 ? ' warn' : ' ok') + '">' + avgScore + '</span></div>';
    html += '<div class="stat-row"><span class="stat-label">Min health score</span><span class="stat-value' + (minScore < 50 ? ' warn' : ' ok') + '">' + minScore + '</span></div>';

    if (hotspots.length > 0) {
      html += '<h2 style="margin-top:12px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#8b949e;margin-bottom:6px;">Hotspots</h2>';
      hotspots.forEach(function (name) {
        var freq = GRAPH_DATA.changeFrequency && GRAPH_DATA.changeFrequency.frequencyMap[name];
        var commits = freq ? freq.commits : 0;
        var dependents = impactCount(name);
        html += '<div class="hotspot-item"><div class="name">' + name + '</div><div class="meta">' + commits + ' commits, ' + dependents + ' dependents</div></div>';
      });
    }

    document.getElementById('analysis-panel').innerHTML = html;
  }

  renderAnalysis();

  // ---- chart renderers ----
  function makeEdgeStyle(depType) {
    var color = depTypeColor[depType] || '#3b82f6';
    var lineStyle = { color: color, width: 1.5, curveness: 0.2 };
    if (depType === 'peerDependencies') {
      lineStyle.type = 'dashed';
    } else if (depType === 'devDependencies') {
      lineStyle.type = 'dotted';
    } else {
      lineStyle.type = 'solid';
    }
    return lineStyle;
  }

  function buildGraphNodes(filteredNodes) {
    return filteredNodes.map(function (n) {
      var size = nodeSize(n.name);
      var itemStyle = { color: '#3b82f6' };
      if (cycleNodeSet[n.name]) {
        itemStyle.borderColor = '#ef4444';
        itemStyle.borderWidth = 3;
      }
      return {
        name: n.name,
        symbolSize: size,
        itemStyle: itemStyle,
        label: { show: size > 16, fontSize: 10, color: '#c9d1d9' }
      };
    });
  }

  function buildGraphEdges(filteredEdges) {
    return filteredEdges.map(function (e) {
      return {
        source: e.source,
        target: e.target,
        lineStyle: makeEdgeStyle(e.depType)
      };
    });
  }

  function renderForce() {
    var nodes = filterNodes();
    var names = nodes.map(function (n) { return n.name; });
    var edges = filterEdges(names);

    chart.setOption({
      tooltip: {
        formatter: function (p) {
          if (p.dataType === 'node') {
            return '<b>' + p.name + '</b><br/>Impact: ' + impactCount(p.name) + ' dependents';
          }
          if (p.dataType === 'edge') {
            return p.data.source + ' &rarr; ' + p.data.target;
          }
          return '';
        }
      },
      series: [{
        type: 'graph',
        layout: 'force',
        roam: true,
        draggable: true,
        emphasis: { focus: 'adjacency' },
        force: {
          repulsion: 1000,
          gravity: 0.1,
          edgeLength: [80, 250]
        },
        data: buildGraphNodes(nodes),
        links: buildGraphEdges(edges),
        lineStyle: { opacity: 0.6 }
      }]
    }, true);
  }

  function renderTree() {
    var nodes = filterNodes();
    var names = nodes.map(function (n) { return n.name; });
    var edges = filterEdges(names);
    var depthMap = GRAPH_DATA.depth.depthMap || {};

    // group by layer
    var layers = {};
    nodes.forEach(function (n) {
      var d = depthMap[n.name] || 0;
      if (!layers[d]) layers[d] = [];
      layers[d].push(n.name);
    });

    // sort each layer alphabetically
    Object.keys(layers).forEach(function (d) {
      layers[d].sort();
    });

    // compute positions
    var posMap = {};
    Object.keys(layers).sort(function (a, b) { return Number(a) - Number(b); }).forEach(function (d) {
      var layer = layers[d];
      var layerWidth = layer.length * 150;
      var startX = -layerWidth / 2 + 75;
      layer.forEach(function (name, i) {
        posMap[name] = { x: startX + i * 150, y: Number(d) * 120 };
      });
    });

    var graphNodes = nodes.map(function (n) {
      var size = nodeSize(n.name);
      var pos = posMap[n.name] || { x: 0, y: 0 };
      var itemStyle = { color: '#3b82f6' };
      if (cycleNodeSet[n.name]) {
        itemStyle.borderColor = '#ef4444';
        itemStyle.borderWidth = 3;
      }
      return {
        name: n.name,
        x: pos.x,
        y: pos.y,
        symbolSize: size,
        itemStyle: itemStyle,
        label: { show: size > 16, fontSize: 10, color: '#c9d1d9' }
      };
    });

    chart.setOption({
      tooltip: {
        formatter: function (p) {
          if (p.dataType === 'node') {
            var d = depthMap[p.name] || 0;
            return '<b>' + p.name + '</b><br/>Depth: ' + d + '<br/>Impact: ' + impactCount(p.name) + ' dependents';
          }
          if (p.dataType === 'edge') {
            return p.data.source + ' &rarr; ' + p.data.target;
          }
          return '';
        }
      },
      series: [{
        type: 'graph',
        layout: 'none',
        roam: true,
        draggable: true,
        emphasis: { focus: 'adjacency' },
        data: graphNodes,
        links: buildGraphEdges(edges),
        lineStyle: { opacity: 0.6 }
      }]
    }, true);
  }

  function renderMatrix() {
    var nodes = filterNodes();
    var names = nodes.map(function (n) { return n.name; }).sort();
    var edges = filterEdges(names);

    var nameIndex = {};
    names.forEach(function (n, i) { nameIndex[n] = i; });

    var depTypeValue = {
      dependencies: 1,
      peerDependencies: 2,
      devDependencies: 3
    };

    var matrixData = edges.map(function (e) {
      return [nameIndex[e.source], nameIndex[e.target], depTypeValue[e.depType] || 1];
    });

    chart.setOption({
      tooltip: {
        formatter: function (p) {
          if (p.data) {
            var s = names[p.data[0]];
            var t = names[p.data[1]];
            var types = ['', 'dependencies', 'peerDependencies', 'devDependencies'];
            return s + ' &rarr; ' + t + '<br/>' + (types[p.data[2]] || '');
          }
          return '';
        }
      },
      grid: {
        top: 80,
        bottom: 80,
        left: 140,
        right: 40
      },
      xAxis: {
        type: 'category',
        data: names,
        axisLabel: {
          rotate: 45,
          color: '#8b949e',
          fontSize: 10
        },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#30363d' } },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'category',
        data: names,
        axisLabel: {
          color: '#8b949e',
          fontSize: 10
        },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#30363d' } },
        splitLine: { show: false }
      },
      visualMap: {
        type: 'piecewise',
        pieces: [
          { value: 1, label: 'dependencies', color: '#3b82f6' },
          { value: 2, label: 'peerDependencies', color: '#22c55e' },
          { value: 3, label: 'devDependencies', color: '#9ca3af' }
        ],
        orient: 'horizontal',
        top: 10,
        left: 'center',
        textStyle: { color: '#8b949e', fontSize: 11 }
      },
      series: [{
        type: 'heatmap',
        data: matrixData,
        itemStyle: {
          borderColor: '#0d1117',
          borderWidth: 2
        },
        emphasis: {
          itemStyle: { shadowBlur: 6, shadowColor: 'rgba(255,255,255,0.2)' }
        }
      }]
    }, true);
  }

  // ---- tab switching ----
  var tabs = document.querySelectorAll('.tab');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      currentChart = tab.getAttribute('data-chart');
      renderCurrentChart();
    });
  });

  // ---- search ----
  document.getElementById('search').addEventListener('input', function (e) {
    filterText = e.target.value;
    renderCurrentChart();
  });

  // ---- render dispatcher ----
  function renderCurrentChart() {
    chart.clear();
    if (currentChart === 'force') renderForce();
    else if (currentChart === 'tree') renderTree();
    else if (currentChart === 'matrix') renderMatrix();
  }

  // ---- resize ----
  window.addEventListener('resize', function () { chart.resize(); });

  // ---- initial render ----
  renderCurrentChart();
})();
</script>
</body>
</html>`
}
