'use client'

import { useEffect, useRef } from 'react'

/**
 * GraphView — renders a Cytoscape.js dependency graph.
 * Loaded dynamically (no SSR) because Cytoscape requires browser APIs.
 *
 * Props:
 *   nodes: Array<{ id: string, isRoot: boolean, isVulnerable: boolean }>
 *   edges: Array<{ source: string, target: string }>
 */
export default function GraphView({ nodes, edges }) {
  const containerRef = useRef(null)
  const cyRef        = useRef(null)

  useEffect(() => {
    if (!containerRef.current || !nodes?.length) return

    // Dynamic import keeps Cytoscape out of the SSR bundle
    import('cytoscape').then(({ default: cytoscape }) => {
      if (cyRef.current) {
        cyRef.current.destroy()
      }

      const elements = [
        ...nodes.map(n => ({
          data: {
            id:          n.id,
            label:       n.id,
            isRoot:      n.isRoot,
            isVulnerable: n.isVulnerable,
          },
        })),
        ...edges.map((e, i) => ({
          data: {
            id:     `e${i}`,
            source: e.source,
            target: e.target,
          },
        })),
      ]

      cyRef.current = cytoscape({
        container: containerRef.current,
        elements,
        style: [
          {
            selector: 'node',
            style: {
              'background-color':   '#21262d',
              'border-width':       1.5,
              'border-color':       '#30363d',
              'label':              'data(label)',
              'color':              '#a5d6ff',
              'font-family':        'JetBrains Mono, monospace',
              'font-size':          '10px',
              'text-valign':        'bottom',
              'text-margin-y':      6,
              'width':              26,
              'height':             26,
            },
          },
          {
            selector: 'node[?isRoot]',
            style: {
              'background-color': '#7c6af7',
              'border-color':     '#9d8ff9',
              'color':            '#e6edf3',
              'font-weight':      '600',
              'width':            34,
              'height':           34,
            },
          },
          {
            selector: 'node[?isVulnerable]:not([?isRoot])',
            style: {
              'background-color': 'rgba(255,77,79,0.2)',
              'border-color':     '#ff4d4f',
              'color':            '#ff4d4f',
            },
          },
          {
            selector: 'edge',
            style: {
              'width':             1.5,
              'line-color':        '#30363d',
              'target-arrow-color':'#30363d',
              'target-arrow-shape':'triangle',
              'curve-style':       'bezier',
              'arrow-scale':       0.8,
            },
          },
          {
            selector: ':selected',
            style: {
              'border-color': '#7c6af7',
              'line-color':   '#7c6af7',
            },
          },
        ],
        layout: {
          name:             'breadthfirst',
          directed:         true,
          padding:          20,
          spacingFactor:    1.4,
          avoidOverlap:     true,
        },
        userZoomingEnabled:    true,
        userPanningEnabled:    true,
        boxSelectionEnabled:   false,
        autoungrabify:         false,
      })

      // Fit on resize
      const observer = new ResizeObserver(() => cyRef.current?.fit(undefined, 20))
      observer.observe(containerRef.current)
      return () => observer.disconnect()
    })

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy()
        cyRef.current = null
      }
    }
  }, [nodes, edges])

  return (
    <div className="graph-container">
      <div ref={containerRef} className="graph-canvas" />
      <div className="graph-legend">
        <div className="graph-legend-item">
          <div className="graph-legend-dot" style={{ background: '#7c6af7' }} />
          Root package
        </div>
        <div className="graph-legend-item">
          <div className="graph-legend-dot" style={{ background: 'rgba(255,77,79,0.4)', border: '1.5px solid #ff4d4f' }} />
          Vulnerable dependency
        </div>
        <div className="graph-legend-item">
          <div className="graph-legend-dot" style={{ background: '#21262d', border: '1.5px solid #30363d' }} />
          Clean dependency
        </div>
      </div>
    </div>
  )
}
