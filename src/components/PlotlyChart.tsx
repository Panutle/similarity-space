import React, { useEffect, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import { Point3D } from '../utils/vectorUtils';
import { Grid3X3, Plane, Network } from 'lucide-react';

interface PlotlyChartProps {
  points: Point3D[];
  visibleTypes: Set<string>;
  renderMode: 'point' | 'model';
  onPointClick?: (point: Point3D) => void;
  isDarkMode?: boolean;
  selectedPoint?: Point3D | null;
}

const PlotlyChart: React.FC<PlotlyChartProps> = ({ points, visibleTypes, renderMode, onPointClick, isDarkMode = false, selectedPoint = null }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [gridOpacity, setGridOpacity] = useState(20);
  const [showNetwork, setShowNetwork] = useState(false);
  const [isFlying, setIsFlying] = useState(true);
  const requestRef = useRef<number>();
  const angleRef = useRef<number>(0);

  useEffect(() => {
    if (!chartRef.current || points.length === 0) return;

    const filteredPoints = points.filter(p => visibleTypes.has(p.type));
    
    // Find a master model from any pointcloud type data
    const masterPoint = points.find(p => p.type === 'pointcloud' && p.rawVector && p.rawVector.length >= 3);
    const masterVector = masterPoint?.rawVector;

    // Group by type for coloring
    const typeColors: { [key: string]: string } = {
      'image': '#FF3B30', // Red
      'physical': '#007AFF', // Blue
      'pointcloud': '#34C759', // Green
      'semantic': '#AF52DE', // Purple
      'topload': '#FF9500', // Orange
      'combined': '#F59E0B', // Amber/Gold
    };

    let data: any[] = [];

    if (renderMode === 'point') {
      const types = Array.from(new Set(filteredPoints.map(p => p.type)));
      data = types.map((type) => {
        const typePoints = filteredPoints.filter(p => p.type === type);
        const typeStr = String(type);
        return {
          x: typePoints.map(p => p.x),
          y: typePoints.map(p => p.y),
          z: typePoints.map(p => p.z),
          mode: 'markers',
          type: 'scatter3d',
          name: typeStr,
          text: typePoints.map(p => `ID: ${p.id}`),
          customdata: typePoints.map(p => p.id), // Store ID for click lookup
          marker: {
            size: 4,
            color: typeColors[typeStr] || '#000000',
            opacity: 0.9,
            line: {
              color: 'white',
              width: 0.5
            }
          }
        };
      });
    } else {
      // Model Mode: Render each point's OWN point cloud centered at its UMAP coordinate
      filteredPoints.forEach((p, index) => {
        const vectorToUse = p.modelVector;
        // Generate a unique color for each object using the golden angle
        const uniqueColor = `hsl(${(index * 137.508) % 360}, 75%, 55%)`;
        
        if (vectorToUse && vectorToUse.length >= 3) {
          const subPoints: { x: number[], y: number[], z: number[] } = { x: [], y: [], z: [] };
          
          // Calculate centroid of the specific vector to center it
          let avgX = 0, avgY = 0, avgZ = 0;
          let count = 0;
          for (let i = 0; i < vectorToUse.length; i += 3) {
            if (vectorToUse[i+2] !== undefined) {
              avgX += vectorToUse[i];
              avgY += vectorToUse[i+1];
              avgZ += vectorToUse[i+2];
              count++;
            }
          }
          
          if (count > 0) {
            avgX /= count; avgY /= count; avgZ /= count;
            const scale = 0.04; 
            
            for (let i = 0; i < vectorToUse.length; i += 3) {
              if (vectorToUse[i+2] !== undefined) {
                subPoints.x.push(p.x + (vectorToUse[i] - avgX) * scale);
                subPoints.y.push(p.y + (vectorToUse[i+1] - avgY) * scale);
                subPoints.z.push(p.z + (vectorToUse[i+2] - avgZ) * scale);
              }
            }

            data.push({
              x: subPoints.x,
              y: subPoints.y,
              z: subPoints.z,
              mode: 'markers',
              type: 'scatter3d',
              name: p.id,
              customdata: Array(subPoints.x.length).fill(p.id), // Store ID for click lookup
              hoverinfo: 'name',
              marker: {
                size: 1.5,
                color: uniqueColor,
                opacity: 0.6
              }
            });
          }
        } else {
          // Fallback to a simple point if no model vector is available for this object
          data.push({
            x: [p.x],
            y: [p.y],
            z: [p.z],
            mode: 'markers',
            type: 'scatter3d',
            name: p.id,
            customdata: [p.id], // Store ID for click lookup
            marker: {
              size: 4,
              color: uniqueColor,
              opacity: 0.9
            }
          });
        }
      });
    }

    // Generate 3D internal grid lines
    if (gridOpacity > 0) {
      const gridLinesX: (number | null)[] = [];
      const gridLinesY: (number | null)[] = [];
      const gridLinesZ: (number | null)[] = [];
      const ticks: number[] = [];
      for (let i = -1; i <= 1.05; i += 0.2) {
        ticks.push(parseFloat(i.toFixed(1)));
      }

      for (const y of ticks) {
        for (const z of ticks) {
          gridLinesX.push(-1, 1, null);
          gridLinesY.push(y, y, null);
          gridLinesZ.push(z, z, null);
        }
      }
      for (const x of ticks) {
        for (const z of ticks) {
          gridLinesX.push(x, x, null);
          gridLinesY.push(-1, 1, null);
          gridLinesZ.push(z, z, null);
        }
      }
      for (const x of ticks) {
        for (const y of ticks) {
          gridLinesX.push(x, x, null);
          gridLinesY.push(y, y, null);
          gridLinesZ.push(-1, 1, null);
        }
      }

      data.push({
        x: gridLinesX,
        y: gridLinesY,
        z: gridLinesZ,
        mode: 'lines',
        type: 'scatter3d',
        hoverinfo: 'none',
        showlegend: false,
        opacity: gridOpacity / 100,
        line: {
          color: isDarkMode ? '#ffffff' : '#000000',
          width: 1.5
        }
      });
    }

    // Generate Similarity Network
    if (showNetwork) {
      const lineX: (number | null)[] = [];
      const lineY: (number | null)[] = [];
      const lineZ: (number | null)[] = [];
      const midX: number[] = [];
      const midY: number[] = [];
      const midZ: number[] = [];
      const midText: string[] = [];
      const addedEdges = new Set<string>();

      const addEdge = (p1: Point3D, p2: Point3D) => {
        const edgeId = [p1.id, p2.id].sort().join('-');
        if (addedEdges.has(edgeId)) return;
        addedEdges.add(edgeId);

        const d = Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
        // Convert distance to a 0-100 similarity score
        const sim = Math.max(0, Math.min(100, 100 * (1 - d / 2.5)));

        lineX.push(p1.x, p2.x, null);
        lineY.push(p1.y, p2.y, null);
        lineZ.push(p1.z, p2.z, null);

        midX.push((p1.x + p2.x) / 2);
        midY.push((p1.y + p2.y) / 2);
        midZ.push((p1.z + p2.z) / 2);
        midText.push(`${sim.toFixed(1)}%`);
      };

      if (selectedPoint) {
        // Connect selected point to ALL other points OF THE SAME TYPE
        const others = filteredPoints.filter(p => p.id !== selectedPoint.id && p.type === selectedPoint.type);
        others.forEach(p => addEdge(selectedPoint, p));
      } else {
        // Connect ALL points to ALL other points OF THE SAME TYPE
        for (let i = 0; i < filteredPoints.length; i++) {
          for (let j = i + 1; j < filteredPoints.length; j++) {
            if (filteredPoints[i].type === filteredPoints[j].type) {
              addEdge(filteredPoints[i], filteredPoints[j]);
            }
          }
        }
      }

      if (lineX.length > 0) {
        data.push({
          x: lineX, y: lineY, z: lineZ,
          mode: 'lines',
          type: 'scatter3d',
          hoverinfo: 'none',
          line: { color: isDarkMode ? 'rgba(251, 191, 36, 0.4)' : 'rgba(37, 99, 235, 0.4)', width: 1.5 },
          showlegend: false
        });
        
        // Only show text if there are less than 200 edges, to prevent WebGL dropping text/crashing
        if (midX.length <= 200) {
          data.push({
            x: midX, y: midY, z: midZ,
            mode: 'text',
            type: 'scatter3d',
            text: midText,
            textfont: { color: isDarkMode ? '#fcd34d' : '#2563eb', size: 14, family: '"Space Grotesk", "Inter", sans-serif' },
            textposition: 'middle center',
            hoverinfo: 'none',
            showlegend: false
          });
        }
      }
    }

    const bgColor = isDarkMode ? '#0a0a0a' : 'white';
    const gridColor = isDarkMode ? '#333333' : '#cccccc';
    const zeroLineColor = isDarkMode ? '#555555' : '#999999';
    const axisBgColor = isDarkMode ? '#171717' : '#f8f9fa';
    const lineColor = isDarkMode ? '#444444' : '#dddddd';
    const textColor = isDarkMode ? '#e5e5e5' : '#000000';
    const tickVals = [-1, -0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8, 1];

    const layout: any = {
      margin: { l: 0, r: 0, b: 0, t: 0 },
      paper_bgcolor: bgColor,
      plot_bgcolor: bgColor,
      uirevision: 'constant', // Keep camera state across updates
      scene: {
        xaxis: { title: { text: 'X' }, showgrid: true, gridcolor: gridColor, gridwidth: 1, zeroline: true, zerolinecolor: zeroLineColor, zerolinewidth: 2, range: [-1.2, 1.2], tickvals: tickVals, showbackground: true, backgroundcolor: axisBgColor, showline: true, linecolor: lineColor, linewidth: 2 },
        yaxis: { title: { text: 'Y' }, showgrid: true, gridcolor: gridColor, gridwidth: 1, zeroline: true, zerolinecolor: zeroLineColor, zerolinewidth: 2, range: [-1.2, 1.2], tickvals: tickVals, showbackground: true, backgroundcolor: axisBgColor, showline: true, linecolor: lineColor, linewidth: 2 },
        zaxis: { title: { text: 'Z' }, showgrid: true, gridcolor: gridColor, gridwidth: 1, zeroline: true, zerolinecolor: zeroLineColor, zerolinewidth: 2, range: [-1.2, 1.2], tickvals: tickVals, showbackground: true, backgroundcolor: axisBgColor, showline: true, linecolor: lineColor, linewidth: 2 },
        aspectmode: 'cube',
        bgcolor: bgColor
      },
      showlegend: false,
      font: { family: 'Inter, sans-serif', color: textColor }
    };

    Plotly.react(chartRef.current, data as any, layout, { responsive: true, displayModeBar: false });

    const chartElement = chartRef.current as any;

    // Handle click events
    const handlePlotlyClick = (eventData: any) => {
      if (onPointClick && eventData.points && eventData.points.length > 0) {
        const pointId = eventData.points[0].customdata;
        if (pointId) {
          const clickedPoint = points.find(p => p.id === pointId);
          if (clickedPoint) {
            onPointClick(clickedPoint);
          }
        }
      }
    };

    // Remove existing listener before adding a new one to prevent duplicates
    chartElement.removeAllListeners('plotly_click');
    chartElement.on('plotly_click', handlePlotlyClick);

    return () => {
      if (chartRef.current) {
        (chartRef.current as any).removeAllListeners('plotly_click');
        // We don't purge here anymore because Plotly.react reuses the context.
        // Purging on every re-render causes WebGL context loss issues.
      }
    };
  }, [points, visibleTypes, renderMode, onPointClick, gridOpacity, isDarkMode, showNetwork, selectedPoint]);

  // Cleanup on full unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        Plotly.purge(chartRef.current);
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  // Fly Over Animation Loop
  useEffect(() => {
    if (!isFlying || !chartRef.current) return;

    const chart = chartRef.current as any;

    const animate = () => {
      // Get current camera to preserve zoom (radius) and z-height
      // Plotly's default eye is usually {x: 1.25, y: 1.25, z: 1.25}
      const currentEye = chart.layout?.scene?.camera?.eye || { x: 1.5, y: 1.5, z: 0.5 };

      // Calculate current radius
      const r = Math.sqrt(currentEye.x * currentEye.x + currentEye.y * currentEye.y);
      
      // Increment angle
      angleRef.current += 0.005; // Speed of rotation

      const newX = r * Math.cos(angleRef.current);
      const newY = r * Math.sin(angleRef.current);

      Plotly.relayout(chart, {
        'scene.camera.eye': { x: newX, y: newY, z: currentEye.z }
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    // Initialize angle based on current camera
    const initialEye = chart.layout?.scene?.camera?.eye || { x: 1.5, y: 1.5, z: 0.5 };
    angleRef.current = Math.atan2(initialEye.y, initialEye.x);

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isFlying]);

  return (
    <div className="relative w-full h-full">
      <div ref={chartRef} className="w-full h-full" id="plotly-chart" />
      <div className="absolute top-6 right-6 z-10 flex flex-col gap-3">
        <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/50 p-4 rounded-xl shadow-lg flex flex-col gap-3 w-56 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
              <Grid3X3 className="w-4 h-4 text-amber-500 dark:text-blue-500" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest">Grid Opacity</span>
            </div>
            <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">{gridOpacity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={gridOpacity}
            onChange={(e) => setGridOpacity(Number(e.target.value))}
            className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500 dark:accent-blue-500"
          />
          <div className="flex items-center justify-between mt-2 pt-3 border-t border-neutral-200/50 dark:border-neutral-800/50">
            <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
              <Network className="w-4 h-4 text-amber-500 dark:text-blue-500" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest">Similarity Network</span>
            </div>
            <button
              onClick={() => setShowNetwork(!showNetwork)}
              className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${showNetwork ? 'bg-amber-500 dark:bg-blue-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${showNetwork ? 'translate-x-4' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
        <button
          onClick={() => setIsFlying(!isFlying)}
          className={`flex items-center justify-center gap-2 px-4 py-3 text-[10px] font-mono font-bold uppercase tracking-widest rounded-xl shadow-lg transition-all duration-300 border backdrop-blur-md ${
            isFlying 
              ? 'bg-amber-500/90 dark:bg-blue-600/90 text-white border-amber-400/50 dark:border-blue-500/50 hover:bg-amber-600/90 dark:hover:bg-blue-700/90 shadow-amber-500/25 dark:shadow-blue-500/25' 
              : 'bg-white/80 text-neutral-600 border-neutral-200/50 dark:bg-neutral-900/80 dark:text-neutral-400 dark:border-neutral-800/50 hover:bg-neutral-50/90 dark:hover:bg-neutral-800/90'
          }`}
          title="Toggle Fly Over"
        >
          <Plane className={`w-4 h-4 ${isFlying ? 'animate-pulse' : ''}`} />
          {isFlying ? 'Stop Fly Over' : 'Fly Over 180°'}
        </button>
      </div>
    </div>
  );
};

export default PlotlyChart;
