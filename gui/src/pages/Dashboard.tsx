// Main Dashboard Page
import React, { useState } from 'react';
import { StatusBar } from '../components/StatusBar';
import { Controls } from '../components/Controls';
import { Canvas } from '../components/Canvas';
import { api } from '../lib/api';

export function Dashboard() {
  const [consoleLogs, setConsoleLogs] = useState<Array<{ message: string; level: string }>>([
    { message: 'EvoAgentX GUI initialized', level: 'info' },
    { message: 'Waiting for diagnostics...', level: 'info' },
  ]);

  const addLog = (message: string, level: 'info' | 'success' | 'warning' | 'error') => {
    setConsoleLogs(prev => [...prev, { message, level }].slice(-50));
  };

  const handleEvaluate = async () => {
    addLog('Evaluating agent workflow...', 'info');
    try {
      const result = await api.evaluate({
        goal: 'Test evaluation',
        output: 'Sample workflow output',
        rubric_version: 'v1'
      });
      addLog(`Evaluation complete: Score=${result.quality_score.toFixed(1)}, Δ=${result.delta_score.toFixed(1)}`, 'success');
    } catch (err) {
      addLog(`Evaluation failed: ${err}`, 'error');
    }
  };

  const handleMutate = async () => {
    addLog('Mutating workflow...', 'info');
    try {
      const result = await api.mutateWorkflow({
        goal: 'Test mutation',
        current_workflow: 'Current workflow state',
        arm: 'auto'
      });
      addLog(`Mutation complete: Arm=${result.arm}, Novelty=${result.novelty.toFixed(2)}`, 'success');
    } catch (err) {
      addLog(`Mutation failed: ${err}`, 'error');
    }
  };

  const handleBanditToggle = async () => {
    addLog('Fetching bandit status...', 'info');
    try {
      const status = await api.getBanditStatus();
      addLog(`Bandit status: ${status.total_pulls} total pulls`, 'info');
    } catch (err) {
      addLog(`Bandit query failed: ${err}`, 'error');
    }
  };

  const handleMemorySnapshot = async () => {
    addLog('Creating memory snapshot...', 'info');
    try {
      const snapshot = await api.createMemorySnapshot(
        'Manual Snapshot',
        'User-triggered memory snapshot'
      );
      addLog(`Snapshot created: ${snapshot.id}`, 'success');
    } catch (err) {
      addLog(`Snapshot failed: ${err}`, 'error');
    }
  };

  const handleWorkflowView = async () => {
    addLog('Loading workflow DAG...', 'info');
    try {
      const dag = await api.getWorkflowDAG();
      addLog(`Workflow loaded: ${dag.nodes.length} nodes, ${dag.edges.length} edges`, 'success');
    } catch (err) {
      addLog(`Workflow load failed: ${err}`, 'error');
    }
  };

  const handleDependenciesCheck = async () => {
    addLog('Checking dependencies...', 'info');
    try {
      const diag = await api.runDiagnostics();
      const failures = Object.entries(diag.checks)
        .filter(([_, check]) => !check.passed);

      if (failures.length === 0) {
        addLog('All dependencies satisfied', 'success');
      } else {
        failures.forEach(([name, check]) => {
          addLog(`${name}: ${check.message}`, check.severity === 'error' ? 'error' : 'warning');
        });
      }
    } catch (err) {
      addLog(`Dependency check failed: ${err}`, 'error');
    }
  };

  return (
    <div className="app-container">
      {/* Background */}
      <div className="app-background" />

      {/* Header */}
      <div className="app-header">
        <div className="app-logo">EVOAGENTX</div>
        <StatusBar />
      </div>

      {/* Main Dashboard */}
      <div className="dashboard">
        {/* Left: Controls */}
        <Controls
          onEvaluate={handleEvaluate}
          onMutate={handleMutate}
          onBanditToggle={handleBanditToggle}
          onMemorySnapshot={handleMemorySnapshot}
          onWorkflowView={handleWorkflowView}
          onDependenciesCheck={handleDependenciesCheck}
        />

        {/* Center: Canvas */}
        <Canvas />

        {/* Right Top: Telemetry Panel */}
        <div className="telemetry-panel">
          <div className="telemetry-title">Live Telemetry</div>
          <div className="telemetry-metrics">
            <div className="telemetry-item">
              <div className="telemetry-item-label">System Status</div>
              <div className="telemetry-item-value" style={{ fontSize: 16, color: '#00E676' }}>
                OPERATIONAL
              </div>
            </div>
            <div className="telemetry-item">
              <div className="telemetry-item-label">LLM Backend</div>
              <div className="telemetry-item-value" style={{ fontSize: 16, color: '#00BCD4' }}>
                Ollama Local
              </div>
            </div>
            <div className="telemetry-item">
              <div className="telemetry-item-label">Mode</div>
              <div className="telemetry-item-value" style={{ fontSize: 16, color: '#FFA500' }}>
                OFFLINE
              </div>
            </div>
          </div>
        </div>

        {/* Right Bottom: Console */}
        <div className="console-panel">
          <div className="console-title">Console</div>
          <div>
            {consoleLogs.map((log, idx) => (
              <div key={idx} className={`console-line ${log.level}`}>
                [{new Date().toLocaleTimeString()}] {log.message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
