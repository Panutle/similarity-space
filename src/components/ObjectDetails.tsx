import React, { useEffect, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import { Point3D } from '../utils/vectorUtils';
import { X, Loader2 } from 'lucide-react';
import { rtdb } from '../firebase';
import { ref, get } from 'firebase/database';

interface ObjectDetailsProps {
  point: Point3D | null;
  onClose: () => void;
  isDarkMode?: boolean;
  pointColor?: string;
}

const ObjectDetails: React.FC<ObjectDetailsProps> = ({ point, onClose, isDarkMode = false, pointColor }) => {
  const modelRef = useRef<HTMLDivElement>(null);
  const [rtdbData, setRtdbData] = useState<{description?: string, dimensions?: any} | null>(null);
  const [loadingRtdb, setLoadingRtdb] = useState(false);

  useEffect(() => {
    if (!point) return;

    let isMounted = true;
    setLoadingRtdb(true);
    setRtdbData(null);

    const fetchRtdbData = async () => {
      try {
        const dbRef = ref(rtdb, `dataObject/${point.id}`);
        const snapshot = await get(dbRef);
        if (snapshot.exists() && isMounted) {
          setRtdbData(snapshot.val());
        }
      } catch (error) {
        console.error("Error fetching RTDB data:", error);
      } finally {
        if (isMounted) setLoadingRtdb(false);
      }
    };

    fetchRtdbData();

    return () => {
      isMounted = false;
    };
  }, [point?.id]);

  useEffect(() => {
    if (!modelRef.current || !point) return;

    const vectorToUse = point.modelVector;

    if (vectorToUse && vectorToUse.length >= 3) {
      const x: number[] = [];
      const y: number[] = [];
      const z: number[] = [];

      // Calculate centroid for centering
      let sumX = 0, sumY = 0, sumZ = 0;
      let count = 0;

      for (let i = 0; i < vectorToUse.length; i += 3) {
        if (vectorToUse[i + 2] !== undefined) {
          sumX += vectorToUse[i];
          sumY += vectorToUse[i + 1];
          sumZ += vectorToUse[i + 2];
          count++;
        }
      }

      const avgX = sumX / count;
      const avgY = sumY / count;
      const avgZ = sumZ / count;

      for (let i = 0; i < vectorToUse.length; i += 3) {
        if (vectorToUse[i + 2] !== undefined) {
          x.push(vectorToUse[i] - avgX);
          y.push(vectorToUse[i + 1] - avgY);
          z.push(vectorToUse[i + 2] - avgZ);
        }
      }

      const data = [{
        x, y, z,
        mode: 'markers',
        type: 'scatter3d',
        marker: {
          size: 1.5, // Reduced size for better visibility of dense point clouds
          color: pointColor || (isDarkMode ? '#ffffff' : '#000000'),
          opacity: 0.8
        }
      }];

      const bgColor = isDarkMode ? '#171717' : 'white';

      const layout: any = {
        margin: { l: 0, r: 0, b: 0, t: 0 },
        paper_bgcolor: bgColor,
        plot_bgcolor: bgColor,
        scene: {
          xaxis: { visible: false, range: [-1, 1] }, // Fixed range for centered view
          yaxis: { visible: false, range: [-1, 1] },
          zaxis: { visible: false, range: [-1, 1] },
          aspectmode: 'cube',
          bgcolor: bgColor
        },
        showlegend: false
      };

      Plotly.react(modelRef.current, data as any, layout, { responsive: true, displayModeBar: false });
    }

    return () => {
      // Don't purge here to avoid WebGL context loss on rapid re-renders
    };
  }, [point, isDarkMode, pointColor]);

  // Cleanup on full unmount
  useEffect(() => {
    return () => {
      if (modelRef.current) {
        Plotly.purge(modelRef.current);
      }
    };
  }, []);

  if (!point) return null;

  return (
    <div className="absolute left-6 top-24 bottom-6 w-80 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-left duration-300 rounded-2xl">
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-950/50">
        <h2 className="font-mono font-bold text-sm uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Object Details</h2>
        <button 
          onClick={onClose}
          className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-full transition-colors text-neutral-500 dark:text-neutral-400"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        <div>
          <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 block mb-2">Object ID</label>
          <p className="font-mono text-xs break-all bg-neutral-100 dark:bg-black p-3 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-800 dark:text-neutral-200 shadow-inner">{point.id}</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 block">3D Preview</label>
            {point.modelVector && (
              <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-800/50">
                {Math.floor(point.modelVector.length / 3)} Points
              </span>
            )}
          </div>
          <div className="aspect-square w-full border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-neutral-100 dark:bg-black relative shadow-inner">
            {point.modelVector ? (
              <div ref={modelRef} className="w-full h-full" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-neutral-400 dark:text-neutral-600 text-xs font-mono italic">
                No 3D data available
              </div>
            )}
          </div>
          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 italic text-center font-mono">Drag to rotate model</p>
        </div>

        {/* RTDB Details Section */}
        <div className="space-y-4 border-t border-neutral-200 dark:border-neutral-800 pt-6">
          
          {loadingRtdb ? (
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-500 text-xs font-mono">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading from RTDB...
            </div>
          ) : rtdbData ? (
            <div className="space-y-5">
              {rtdbData.description && (
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 block mb-2">Description</label>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-black p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 leading-relaxed">{rtdbData.description}</p>
                </div>
              )}
              {rtdbData.dimensions && typeof rtdbData.dimensions === 'object' && (
                <div>
                  <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 block mb-3">Dimensions</label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(rtdbData.dimensions).map(([key, value]) => (
                      <div key={key} className="bg-neutral-100 dark:bg-black p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 flex flex-col justify-center shadow-sm">
                        <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 block mb-1">{key}</span>
                        <span className="text-sm text-neutral-900 dark:text-white font-display font-bold">
                          {!isNaN(Number(value)) ? Number(value).toFixed(2) : String(value)}<span className="text-neutral-400 dark:text-neutral-500 text-xs ml-1 font-sans font-normal">cm</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!rtdbData.description && !rtdbData.dimensions && (
                <p className="text-xs text-neutral-400 dark:text-neutral-500 italic font-mono">No additional details found.</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 italic font-mono">No data found in RTDB.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ObjectDetails;
