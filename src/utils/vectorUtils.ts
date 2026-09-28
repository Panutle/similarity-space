import { PCA } from 'ml-pca';

export interface VectorData {
  id: string;
  vectorImage?: number[];
  vectorPhysical?: number[];
  vectorPointCloud?: number[];
  vectorSemantic?: number[];
  vectorTopload?: number[];
  pointCloud?: number[]; // The one for 3D model visualization
  ownerId?: string;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
  id: string;
  type: string;
  rawVector?: number[]; // The concatenated vector used for PCA calculation
  modelVector?: number[]; // Specifically the point cloud vector for 3D rendering
}

/**
 * Simple PCA-like projection for speed and stability.
 * Deterministic based on vector values.
 */
export function fastProject(vectors: number[][], ids: string[], types: string[]): Point3D[] {
  return vectors.map((v, i) => {
    // Use a deterministic hash of the ID to add a unique but consistent offset
    let idHash = 0;
    for (let j = 0; j < ids[i].length; j++) {
      idHash = ((idHash << 5) - idHash) + ids[i].charCodeAt(j);
      idHash |= 0;
    }
    const jitter = (idHash % 100) / 1000; // 0.0 to 0.099

    return {
      x: (v[0] !== undefined ? v[0] : 0) + jitter,
      y: (v[1] !== undefined ? v[1] : 0) + jitter,
      z: (v[2] !== undefined ? v[2] : 0) + jitter,
      id: ids[i],
      type: types[i],
      rawVector: v
    };
  });
}

/**
 * Normalizes vectors to the same dimension by padding with zeros.
 */
export function normalizeVectors(vectors: number[][]): number[][] {
  if (vectors.length === 0) return [];
  const maxDim = Math.max(...vectors.map(v => v.length));
  return vectors.map(v => {
    const padded = new Array(maxDim).fill(0);
    for (let i = 0; i < v.length; i++) {
      padded[i] = v[i];
    }
    return padded;
  });
}

/**
 * Reduces dimensions to 3D using PCA and normalizes to [-1, 1].
 */
export async function reduceDimensions(vectors: number[][], ids: string[], types: string[]): Promise<Point3D[]> {
  if (vectors.length === 0) return [];

  // Group data by type to run PCA independently for each layer
  const combined = ids.map((id, i) => ({ id, vector: vectors[i], type: types[i] }));
  
  const groups: { [type: string]: typeof combined } = {};
  for (const item of combined) {
    if (!groups[item.type]) groups[item.type] = [];
    groups[item.type].push(item);
  }

  const results: Point3D[] = [];

  for (const [type, group] of Object.entries(groups)) {
    // Sort data by ID to ensure consistent input order within the group
    group.sort((a, b) => a.id.localeCompare(b.id));
    
    const groupVectors = group.map(c => c.vector);
    const groupIds = group.map(c => c.id);
    const groupTypes = group.map(c => c.type);

    let projectedPoints: Point3D[] = [];

    if (groupVectors[0].length <= 3) {
      projectedPoints = groupVectors.map((v, i) => {
        return {
          x: v[0] !== undefined ? v[0] : 0,
          y: v[1] !== undefined ? v[1] : 0,
          z: v[2] !== undefined ? v[2] : 0,
          id: groupIds[i],
          type: groupTypes[i],
          rawVector: v
        };
      });

      let maxAbs = 0.0001; // Minimum non-zero denominator
      for (const pt of projectedPoints) {
          if (Math.abs(pt.x) > maxAbs) maxAbs = Math.abs(pt.x);
          if (Math.abs(pt.y) > maxAbs) maxAbs = Math.abs(pt.y);
          if (Math.abs(pt.z) > maxAbs) maxAbs = Math.abs(pt.z);
      }

      for (const pt of projectedPoints) {
        pt.x /= maxAbs;
        pt.y /= maxAbs;
        pt.z /= maxAbs;
        results.push(pt);
      }
      continue;
    }

    if (groupVectors.length < 3) {
      projectedPoints = fastProject(groupVectors, groupIds, groupTypes);
    } else {
      try {
        // PCA implementation using ml-pca for this specific layer
        const pca = new PCA(groupVectors);
        const reduced = pca.predict(groupVectors, { nComponents: 3 });
        const data = reduced.to2DArray();
        
        projectedPoints = data.map((d, i) => ({
          x: d[0] || 0,
          y: d[1] || 0,
          z: d[2] || 0,
          id: groupIds[i],
          type: groupTypes[i],
          rawVector: groupVectors[i]
        }));
      } catch (err) {
        console.warn(`PCA failed for type ${type}, falling back to fast projection:`, err);
        projectedPoints = fastProject(groupVectors, groupIds, groupTypes);
      }
    }

    // Normalize each axis independently to [-1, 1] to prevent flat projections
    let maxAbsX = 0;
    let maxAbsY = 0;
    let maxAbsZ = 0;
    
    for (const pt of projectedPoints) {
      const absX = Math.abs(pt.x);
      const absY = Math.abs(pt.y);
      const absZ = Math.abs(pt.z);
      
      if (absX > maxAbsX) maxAbsX = absX;
      if (absY > maxAbsY) maxAbsY = absY;
      if (absZ > maxAbsZ) maxAbsZ = absZ;
    }

    // Avoid division by zero and prevent amplifying tiny noise
    const scaleX = maxAbsX > 0.0001 ? maxAbsX : 1;
    const scaleY = maxAbsY > 0.0001 ? maxAbsY : 1;
    const scaleZ = maxAbsZ > 0.0001 ? maxAbsZ : 1;

    for (const pt of projectedPoints) {
      pt.x /= scaleX;
      pt.y /= scaleY;
      pt.z /= scaleZ;
      results.push(pt);
    }
  }

  return results;
}
