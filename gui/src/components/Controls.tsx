// Controls Component - Main action buttons
import { useState, useEffect } from 'react';
import { api, DiagnosticsResult } from '../lib/api';

interface ControlsProps {
  onEvaluate: () => void;
  onMutate: () => void;
  onBanditToggle: () => void;
  onMemorySnapshot: () => void;
  onWorkflowView: () => void;
  onDependenciesCheck: () => void;
}

export function Controls(props: ControlsProps) {
  const [preflightPassed, setPreflightPassed] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResult | null>(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);

  // Run diagnostics on mount
  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    try {
      const result = await api.runDiagnostics();
      setDiagnostics(result);
      setPreflightPassed(result.status === 'OK');
    } catch (err) {
      console.error('Diagnostics failed:', err);
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const getDisabledReason = (): string => {
    if (!diagnostics) return 'Running diagnostics...';
    if (diagnostics.status === 'ERROR') {
      const failures = Object.entries(diagnostics.checks)
        .filter(([_, check]) => !check.passed && check.severity === 'error')
        .map(([name, _]) => name);
      return `Failed: ${failures.join(', ')}`;
    }
    return '';
  };

  return (
    <div className="control-panel">
      {/* Diagnostics Section */}
      <div className="control-section">
        <div className="section-title">System</div>

        <button
          className="control-button"
          onClick={runDiagnostics}
          disabled={isRunningDiagnostics}
        >
          {isRunningDiagnostics ? 'Running Diagnostics...' : 'Run Diagnostics'}
        </button>

        {diagnostics && (
          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }}>
            Status: <span style={{
              color: diagnostics.status === 'OK' ? '#00E676' :
                     diagnostics.status === 'WARNING' ? '#FFA500' : '#FF1744'
            }}>
              {diagnostics.status}
            </span>
            <div style={{ marginTop: 8 }}>
              {Object.entries(diagnostics.checks).map(([name, check]) => (
                <div key={name} style={{ marginBottom: 4 }}>
                  <span style={{ color: check.passed ? '#00E676' : '#FF1744' }}>
                    {check.passed ? '✓' : '✗'}
                  </span> {name}: {check.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Core Actions */}
      <div className="control-section">
        <div className="section-title">Core Actions</div>

        <button
          className="control-button"
          onClick={props.onEvaluate}
          disabled={!preflightPassed}
          data-disabled-reason={getDisabledReason()}
        >
          Evaluate Agent
        </button>

        <button
          className="control-button"
          onClick={props.onMutate}
          disabled={!preflightPassed}
          data-disabled-reason={getDisabledReason()}
        >
          Mutate Workflow
        </button>

        <button
          className="control-button"
          onClick={props.onBanditToggle}
          disabled={!preflightPassed}
          data-disabled-reason={getDisabledReason()}
        >
          Bandit Controller
        </button>

        <button
          className="control-button"
          onClick={props.onMemorySnapshot}
          disabled={!preflightPassed}
          data-disabled-reason={getDisabledReason()}
        >
          Memory Snapshot
        </button>
      </div>

      {/* Workflow */}
      <div className="control-section">
        <div className="section-title">Workflow</div>

        <button
          className="control-button"
          onClick={props.onWorkflowView}
        >
          Workflow Builder
        </button>

        <button
          className="control-button"
          onClick={props.onDependenciesCheck}
        >
          Dependencies
        </button>
      </div>
    </div>
  );
}
