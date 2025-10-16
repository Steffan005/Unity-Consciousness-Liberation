// Canvas Component - Fractal Visualization
import { useEffect, useState } from 'react';
import { api, WorkflowDAG } from '../lib/api';

export function Canvas() {
  const [dag, setDAG] = useState<WorkflowDAG | null>(null);

  useEffect(() => {
    loadWorkflow();
  }, []);

  const loadWorkflow = async () => {
    try {
      const workflow = await api.getWorkflowDAG();
      setDAG(workflow);
    } catch (err) {
      console.error('Failed to load workflow:', err);
    }
  };

  return (
    <div className="canvas-container">
      <div className="fractal-canvas">
        {/* Fractal Visualization */}
        <div className="fractal-viz">
          {/* Center node count */}
          {dag && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: '#FFA500',
              fontSize: 32,
              fontWeight: 700,
              textShadow: '0 0 20px rgba(255,165,0,0.8)'
            }}>
              {dag.nodes.length}
              <div style={{ fontSize: 14, marginTop: 8, opacity: 0.8 }}>
                NODES
              </div>
            </div>
          )}
        </div>

        {/* DAG Info */}
        {dag && (
          <div style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            background: 'rgba(0,0,0,0.8)',
            padding: 16,
            borderRadius: 12,
            fontSize: 12,
            maxWidth: 300
          }}>
            <div style={{ color: '#FFA500', fontWeight: 700, marginBottom: 8 }}>
              Workflow DAG
            </div>
            <div style={{ opacity: 0.9 }}>
              Nodes: {dag.nodes.length} | Edges: {dag.edges.length}
            </div>
            <div style={{ marginTop: 12, fontSize: 11, opacity: 0.7 }}>
              {dag.nodes.map(node => (
                <div key={node.id} style={{ marginBottom: 4 }}>
                  • {node.label} ({node.node_type})
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
