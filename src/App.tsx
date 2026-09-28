/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, doc, getDocFromServer, limit, getCountFromServer } from 'firebase/firestore';
import { auth, db, signIn, logOut, signInAnon, handleFirestoreError, OperationType } from './firebase';
import { normalizeVectors, reduceDimensions, Point3D, VectorData } from './utils/vectorUtils';
import PlotlyChart from './components/PlotlyChart';
import ObjectDetails from './components/ObjectDetails';
import ErrorBoundary from './components/ErrorBoundary';
import { LogIn, LogOut, Database, Loader2, Info, Sun, Moon, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [vectors, setVectors] = useState<VectorData[]>([]);
  const [basePoints, setBasePoints] = useState<Point3D[]>([]);
  const [weights, setWeights] = useState({ image: 20, physical: 20, pointcloud: 20, semantic: 20, topload: 20 });
  const [dataLimit, setDataLimit] = useState<number>(2);
  const [totalObjects, setTotalObjects] = useState<number>(100);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState("Initializing...");
  const [selectedPoint, setSelectedPoint] = useState<Point3D | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const points = useMemo(() => {
    if (basePoints.length === 0) return [];

    const pointsById: { [id: string]: { [type: string]: Point3D } } = {};
    basePoints.forEach(p => {
      if (!pointsById[p.id]) pointsById[p.id] = {};
      pointsById[p.id][p.type] = p;
    });

    const combinedPoints: Point3D[] = [];
    for (const [id, typesMap] of Object.entries(pointsById)) {
      let sumX = 0, sumY = 0, sumZ = 0;
      let totalWeight = 0;
      let rawVector: number[] | undefined;
      let modelVector: number[] | undefined;

      ['image', 'physical', 'pointcloud', 'semantic', 'topload'].forEach(type => {
        const pt = typesMap[type];
        if (pt) {
          const w = weights[type as keyof typeof weights] / 100;
          sumX += pt.x * w;
          sumY += pt.y * w;
          sumZ += pt.z * w;
          totalWeight += w;
          if (!rawVector) rawVector = pt.rawVector;
          if (!modelVector) modelVector = pt.modelVector;
        }
      });

      if (totalWeight > 0) {
        combinedPoints.push({
          x: sumX / totalWeight,
          y: sumY / totalWeight,
          z: sumZ / totalWeight,
          id,
          type: 'combined',
          rawVector,
          modelVector
        });
      }
    }

    if (combinedPoints.length > 0) {
      // Normalize combined points to [-1, 1] to prevent going out of bounds
      let maxAbsX = 0;
      let maxAbsY = 0;
      let maxAbsZ = 0;
      
      for (const pt of combinedPoints) {
        if (Math.abs(pt.x) > maxAbsX) maxAbsX = Math.abs(pt.x);
        if (Math.abs(pt.y) > maxAbsY) maxAbsY = Math.abs(pt.y);
        if (Math.abs(pt.z) > maxAbsZ) maxAbsZ = Math.abs(pt.z);
      }
      
      const scaleX = maxAbsX > 0 ? maxAbsX : 1;
      const scaleY = maxAbsY > 0 ? maxAbsY : 1;
      const scaleZ = maxAbsZ > 0 ? maxAbsZ : 1;
      
      for (let i = 0; i < combinedPoints.length; i++) {
        combinedPoints[i].x /= scaleX;
        combinedPoints[i].y /= scaleY;
        combinedPoints[i].z /= scaleZ;
      }
    }

    return [...basePoints, ...combinedPoints];
  }, [basePoints, weights]);

  const handleWeightChange = (key: keyof typeof weights, value: number) => {
    setWeights(prev => {
      const others = (Object.keys(prev) as (keyof typeof weights)[]).filter(k => k !== key);
      const sumOthers = others.reduce((sum, k) => sum + prev[k], 0);
      
      const next = { ...prev, [key]: value };
      const targetSumOthers = 100 - value;

      if (sumOthers > 0) {
        others.forEach(k => {
          next[k] = (prev[k] / sumOthers) * targetSumOthers;
        });
      } else {
        others.forEach(k => {
          next[k] = targetSumOthers / others.length;
        });
      }
      return next;
    });
  };

  // Handle Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        setLoading(false);
      } else {
        try {
          await signInAnon();
        } catch (error) {
          console.error("Anonymous sign-in failed:", error);
          setLoading(false);
        }
      }
    });

    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        setStatus("Connected to Firebase.");
      } catch (error) {
        console.error("Firebase connection test failed:", error);
        setStatus("Connection error.");
      }
    };
    testConnection();

    return unsubscribe;
  }, []);

  // Fetch Total Count
  useEffect(() => {
    if (!user) return;
    const fetchTotalCount = async () => {
      try {
        const snapshot = await getCountFromServer(collection(db, 'vectorObject'));
        const count = snapshot.data().count;
        setTotalObjects(count > 0 ? count : 1);
      } catch (error) {
        console.error("Failed to fetch total object count:", error);
      }
    };
    fetchTotalCount();
  }, [user]);

  // Fetch Data
  useEffect(() => {
    setStatus(`Fetching up to ${dataLimit} objects from Firestore...`);
    const q = query(collection(db, 'vectorObject'), limit(dataLimit));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        console.log("Firestore: No data found.");
        setStatus("No data found in 'vectorObject'.");
        setVectors([]);
        return;
      }

      console.log("Firestore: Received", snapshot.size, "documents.");
      setStatus(`Received ${snapshot.size} documents.`);

      const data = snapshot.docs.map(doc => {
        const rawData = doc.data();
        const processed: any = { id: doc.id, ...rawData };
        
        // Process all fields starting with 'vector' and also 'pointCloud'
        const vectorKeys = Object.keys(rawData).filter(k => k.startsWith('vector') || k === 'pointCloud');
        
        vectorKeys.forEach(key => {
          const val = rawData[key];
          if (val) {
            // Handle Firestore VectorValue or standard Array
            if (typeof val.toArray === 'function') {
              processed[key] = val.toArray();
            } else if (val.values && Array.isArray(val.values)) {
              processed[key] = val.values;
            } else if (Array.isArray(val)) {
              // Flatten if it's a nested array of points [[x,y,z], ...]
              if (Array.isArray(val[0])) {
                processed[key] = val.flat();
              } else {
                processed[key] = val;
              }
            }
          }
        });
        
        return processed as VectorData;
      });
      
      setVectors(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'vectorObject');
      setStatus("Error fetching data.");
    });

    return unsubscribe;
  }, [dataLimit]);

  // Process Vectors
  useEffect(() => {
    if (vectors.length === 0) {
      setBasePoints([]);
      return;
    }

    let active = true;
    const process = async () => {
      setStatus(`Processing ${vectors.length} documents...`);
      setProcessing(true);
      
      try {
        const allVectors: number[][] = [];
        const ids: string[] = [];
        const types: string[] = [];

        vectors.forEach(v => {
          const isValid = (vec: any) => Array.isArray(vec) && vec.length > 0;
          
          if (isValid(v.vectorImage)) {
            allVectors.push(v.vectorImage!);
            ids.push(v.id);
            types.push('image');
          }
          if (isValid(v.vectorPhysical)) {
            allVectors.push(v.vectorPhysical!);
            ids.push(v.id);
            types.push('physical');
          }
          if (isValid(v.vectorPointCloud)) {
            allVectors.push(v.vectorPointCloud!);
            ids.push(v.id);
            types.push('pointcloud');
          }
          if (isValid(v.vectorSemantic)) {
            allVectors.push(v.vectorSemantic!);
            ids.push(v.id);
            types.push('semantic');
          }
          if (isValid(v.vectorTopload)) {
            allVectors.push(v.vectorTopload!);
            ids.push(v.id);
            types.push('topload');
          }
        });

        if (allVectors.length === 0) {
          console.log("PCA: No valid vectors found in documents.");
          setStatus("No valid vectors found.");
          if (active) setBasePoints([]);
          return;
        }

        setStatus(`Reducing dimensions for ${allVectors.length} objects using PCA...`);
        const reduced = await reduceDimensions(allVectors, ids, types);
        
        if (active) {
          // Map each reduced point to its corresponding point cloud vector for 3D preview
          // Use 'pointCloud' field as requested for the 3D model
          const pointsWithModels = reduced.map(p => {
            const original = vectors.find(v => v.id === p.id);
            return {
              ...p,
              modelVector: original?.pointCloud || original?.vectorPointCloud
            };
          });

          console.log("PCA: Successfully reduced to", pointsWithModels.length, "objects.");
          setStatus(`Visualization ready: ${pointsWithModels.length} objects.`);
          setBasePoints(pointsWithModels);
        }
      } catch (err) {
        console.error("Processing error:", err);
        setStatus("Error processing vectors.");
      } finally {
        if (active) setProcessing(false);
      }
    };

    // Small delay to allow UI to update
    const timeoutId = setTimeout(process, 500);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [vectors]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 dark:text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300">
      <header className="bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 -ml-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors text-neutral-600 dark:text-neutral-400"
            title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </button>
          <h1 className="text-xl font-display font-bold tracking-tight text-neutral-900 dark:text-white">OBJECT VISION</h1>
          {processing && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-blue-900/20 border border-amber-100 dark:border-blue-800/50 rounded-full">
              <Loader2 className="w-3 h-3 animate-spin text-amber-500 dark:text-blue-400" />
              <span className="text-[10px] font-mono font-bold text-amber-500 dark:text-blue-400 uppercase tracking-widest">Processing</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:block text-[10px] font-mono font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
            {status}
          </div>
          <div className="h-4 w-[1px] bg-neutral-200 dark:bg-neutral-800 hidden md:block"></div>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" /> : <Moon className="w-5 h-5 text-indigo-500 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`transition-all duration-300 ease-in-out overflow-hidden flex flex-col shrink-0 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.2)] ${isSidebarOpen ? 'w-72' : 'w-0 border-r-0'}`}>
          <div className="w-72 p-6 flex flex-col gap-8 h-full overflow-y-auto">
            <section>
              <h2 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500 mb-4">Object Limit</h2>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max={totalObjects}
                step="1"
                value={dataLimit}
                onChange={(e) => setDataLimit(Number(e.target.value))}
                className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500 dark:accent-blue-500"
              />
              <span className="text-xs font-mono font-bold text-neutral-600 dark:text-neutral-300 w-10 text-right">{dataLimit}</span>
            </div>
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-2">Lower limit improves performance. Max: {totalObjects}</p>
          </section>

          <section>
            <h2 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500 mb-4">Combined Layer Weights</h2>
            <div className="space-y-4">
              {[
                { id: 'image', label: 'Image' },
                { id: 'physical', label: 'Dimension' },
                { id: 'pointcloud', label: 'Point Cloud' },
                { id: 'semantic', label: 'Semantic' },
                { id: 'topload', label: 'Topload' },
              ].map((type) => (
                <div key={type.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">{type.label}</span>
                    <span className="text-neutral-500 font-mono">{Math.round(weights[type.id as keyof typeof weights])}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={weights[type.id as keyof typeof weights]}
                    onChange={(e) => handleWeightChange(type.id as keyof typeof weights, Number(e.target.value))}
                    className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500 dark:accent-blue-500"
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="mt-auto">
            <div className="p-5 rounded-2xl bg-neutral-100 dark:bg-black text-neutral-900 dark:text-white space-y-4 border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-500 dark:text-blue-500" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-600 dark:text-neutral-400">Statistics</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-white/10 p-3 rounded-xl border border-neutral-200 dark:border-white/10 shadow-sm dark:shadow-none">
                  <p className="text-[10px] text-neutral-500 dark:text-white/50 uppercase tracking-wider font-mono">Objects</p>
                  <p className="text-2xl font-display font-bold mt-1">{vectors.length}</p>
                </div>
                <div className="bg-white dark:bg-white/10 p-3 rounded-xl border border-neutral-200 dark:border-white/10 shadow-sm dark:shadow-none">
                  <p className="text-[10px] text-neutral-500 dark:text-white/50 uppercase tracking-wider font-mono">Vectors</p>
                  <p className="text-xl font-display font-bold mt-1">{basePoints.length}</p>
                </div>
              </div>
            </div>
          </section>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 relative bg-neutral-50 dark:bg-neutral-950 overflow-hidden">
          <div className="absolute inset-0">
            {points.length > 0 ? (
              <ErrorBoundary>
                <PlotlyChart 
                  points={points} 
                  visibleTypes={new Set(['combined'])} 
                  renderMode="model" 
                  onPointClick={setSelectedPoint}
                  isDarkMode={isDarkMode}
                  selectedPoint={selectedPoint}
                />
              </ErrorBoundary>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-600 gap-4">
                <div className="relative">
                  <Database className="w-12 h-12 opacity-20" />
                  {processing && <Loader2 className="w-12 h-12 animate-spin text-amber-500 dark:text-blue-500 absolute inset-0" />}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{status}</p>
                  <p className="text-xs text-neutral-500 mt-1 font-mono">Waiting for data to be projected into 3D space...</p>
                </div>
              </div>
            )}
          </div>

          {/* Floating Status */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-2 items-end pointer-events-none z-10">
            <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-xl border border-neutral-200 dark:border-neutral-800 p-3 rounded-2xl shadow-xl flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 dark:bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)] dark:shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-700 dark:text-neutral-300">Live Stream Active</span>
            </div>
          </div>

          {/* Object Details Sidebar */}
          {(() => {
            const combinedPoints = points.filter(p => p.type === 'combined');
            const selectedPointIndex = selectedPoint ? combinedPoints.findIndex(p => p.id === selectedPoint.id) : -1;
            const selectedPointColor = selectedPointIndex >= 0 ? `hsl(${(selectedPointIndex * 137.508) % 360}, 75%, 55%)` : undefined;
            
            return (
              <ObjectDetails 
                point={selectedPoint} 
                onClose={() => setSelectedPoint(null)} 
                isDarkMode={isDarkMode}
                pointColor={selectedPointColor}
              />
            );
          })()}
        </main>
      </div>
    </div>
  );
}
