'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import Link from 'next/link';
import {
  analyze,
  type AnalysisMode,
  type AnalyzeResponse,
  MAX_FILE_SIZE,
  MODE_REQUIREMENTS,
  SUPPORTED_TYPES,
  validateClientInput,
} from '../lib/api';

const EXAMPLES: Record<AnalysisMode, string[]> = {
  single: ['Find water bodies', 'Detect vegetation', 'Identify infrastructure', 'Describe terrain'],
  optical_sar: ['Compare optical and SAR', 'Find structural features', 'Analyze surface differences', 'Identify complementary signals'],
  bi_temporal: ['What changed here?', 'Find new construction', 'Detect vegetation loss', 'Identify land-cover changes'],
};

const NAV_ITEMS = [
  ['workspace', '⌁', 'Workspace'],
  ['observations', '▣', 'Observations'],
  ['history', '◷', 'Analysis History'],
  ['reports', '▤', 'Reports'],
] as const;

function FileCard({
  file,
  label,
  slot,
  onRemove,
}: {
  file?: File;
  label: string;
  slot: string;
  onRemove: () => void;
}) {
  const [preview, setPreview] = useState<string>();

  useEffect(() => {
    if (!file || !file.type.startsWith('image/') || file.type.includes('tiff') || /\.tif{1,2}$/i.test(file.name)) {
      setPreview(undefined);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className={`sq-file-card ${file ? 'uploaded' : ''}`}>
      <div className="sq-file-head">
        <span>{slot} · {label}</span>
        {file && (
          <button type="button" onClick={onRemove} aria-label={`Remove ${label}`}>
            Remove
          </button>
        )}
      </div>
      {preview ? (
        <div className="sq-file-preview">
          <img src={preview} alt={`${label} preview`} />
          <span>LOCAL PREVIEW</span>
          <b>VALIDATED</b>
        </div>
      ) : (
        <div className="sq-file-empty">
          <div className="sq-crosshair"><i /><b /></div>
          <strong>{file ? file.name : '+'}</strong>
          <small>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · ${file.type || 'TIFF'}` : 'DROP / SELECT OBSERVATION'}</small>
        </div>
      )}
    </div>
  );
}

export default function WorkspaceClient() {
  const [mode, setMode] = useState<AnalysisMode>('single');
  const [imageA, setImageA] = useState<File>();
  const [imageB, setImageB] = useState<File>();
  const [query, setQuery] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<AnalyzeResponse>();
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [activeNav, setActiveNav] = useState('workspace');
  const [showInputs, setShowInputs] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const [showFindings, setShowFindings] = useState(false);

  const stages = ['Request received', 'Input validated', 'Task selected', 'Model selected', 'Inference', 'Result ready'];
  const requirements = MODE_REQUIREMENTS[mode];
  const canAnalyze = useMemo(
    () => validateClientInput(mode, query, imageA, imageB).length === 0,
    [mode, query, imageA, imageB],
  );

  function validateFile(file: File) {
    if (file.size > MAX_FILE_SIZE) return `${file.name}: file exceeds the 20 MB limit.`;
    if (!SUPPORTED_TYPES.includes(file.type) && !/\.tif{1,2}$/i.test(file.name)) {
      return `${file.name}: unsupported file type. Use PNG, JPG/JPEG or TIFF/TIF.`;
    }
    return '';
  }

  function setFile(file: File | undefined, slot: 'a' | 'b') {
    if (!file) return;
    const error = validateFile(file);
    setErrors(error ? [error] : []);
    if (slot === 'a') setImageA(file); else setImageB(file);
    setResult(undefined);
  }

  function onDrop(event: DragEvent, slot: 'a' | 'b') {
    event.preventDefault();
    setFile(event.dataTransfer.files[0], slot);
  }

  function chooseExample(example: string) {
    setQuery(example);
    setErrors([]);
    setResult(undefined);
  }

  function changeMode(nextMode: AnalysisMode) {
    setMode(nextMode);
    setErrors([]);
    setResult(undefined);
    setShowInputs(true);
  }

  async function submit() {
    const validation = validateClientInput(mode, query, imageA, imageB);
    setErrors(validation);
    setResult(undefined);
    if (validation.length) {
      setShowInputs(true);
      return;
    }

    setLoading(true);
    setShowTrace(true);
    setShowFindings(false);
    setStage(0);

    for (let i = 1; i < stages.length - 1; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 380));
      setStage(i);
    }

    try {
      const response = await analyze({ query, mode, imageA: imageA!, imageB });
      setResult(response);
      setStage(stages.length - 1);
      setShowFindings(true);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Unable to complete analysis.']);
    } finally {
      setLoading(false);
    }
  }

  const statusText = loading ? 'PROCESSING' : result ? 'READY' : 'ONLINE';

  return (
    <div className="sq-workspace">
      <div className="sq-global-earth" aria-hidden="true">
        <video autoPlay muted loop playsInline preload="auto">
          <source src="/assets/video/earth-chat-bg.mp4" type="video/mp4" />
        </video>
        <div className="sq-global-earth-shade" />
      </div>
      <aside className="sq-sidebar">
        <div className="sq-brand-row">
          <Link className="sq-brand" href="/" aria-label="SATQuery AI home">
            <span className="sq-brand-orb"><i /></span>
            <span>SAT<span>QUERY</span><b>AI</b></span>
          </Link>
          <button className="sq-search" type="button" aria-label="Search">⌕</button>
        </div>

        <button className="sq-new-chat" type="button" onClick={() => {
          setQuery('');
          setResult(undefined);
          setErrors([]);
          setShowFindings(false);
          setShowTrace(false);
        }}>
          <span>＋</span> New Analysis
        </button>

        <div className="sq-side-label">MISSION</div>
        <nav className="sq-nav">
          {NAV_ITEMS.map(([key, icon, label]) => (
            <button key={key} type="button" className={activeNav === key ? 'active' : ''} onClick={() => setActiveNav(key)}>
              <span>{icon}</span>{label}
            </button>
          ))}
        </nav>

        <div className="sq-side-label">ANALYSIS MODE</div>
        <div className="sq-mode-list">
          {(Object.keys(MODE_REQUIREMENTS) as AnalysisMode[]).map((item, index) => (
            <button key={item} type="button" className={mode === item ? 'active' : ''} onClick={() => changeMode(item)}>
              <span>0{index + 1}</span>
              <div>
                <strong>{MODE_REQUIREMENTS[item].label}</strong>
                <small>{MODE_REQUIREMENTS[item].requiresSecondImage ? '2 observations' : '1 observation'}</small>
              </div>
            </button>
          ))}
        </div>

        <div className="sq-sidebar-bottom">
          <div className="sq-system-card">
            <span className="sq-system-dot" />
            <div><strong>SAT-AI ONLINE</strong><small>MISSION CONSOLE / DEMO</small></div>
          </div>
          <Link className="sq-home-link" href="/">← Back to home</Link>
        </div>
      </aside>

      <main className="sq-main">
        <header className="sq-topbar">
          <div className="sq-model-pill">◌ SAT-AI v1.0 · EARTH OBSERVATION</div>
          <div className="sq-top-links">
            <span>Workspace</span><span>Settings</span><span>Help &amp; Support</span><span className="sq-avatar">SA</span>
          </div>
        </header>

        <div className="sq-content">
          <section className="sq-welcome">
            <p className="sq-welcome-kicker">SAT-AI / EARTH OBSERVATION CONSOLE</p>
            <h1>Welcome to your <em>mission.</em></h1>
            <p>Ask questions, inspect satellite observations, and turn remote-sensing imagery into clear intelligence.</p>
            <div className="sq-status-line">
              <span className="online"><i /> SYSTEM {statusText}</span><span>API /api/analyze</span><span>DEMO / MOCK</span>
            </div>
          </section>

          <section className={`sq-chatbox ${loading ? 'processing' : ''}`}>
            <video className="sq-chat-video" autoPlay muted loop playsInline preload="auto" aria-hidden="true">
              <source src="/assets/video/earth-chat-bg.mp4" type="video/mp4" />
            </video>
            <div className="sq-chat-video-overlay" aria-hidden="true" />
            <div className="sq-chat-content">
            <div className="sq-chat-top">
              <div className="sq-chat-identity">
                <span className="sq-chat-icon"><i /><b /></span>
                <div><strong>SAT-AI</strong><small>ASK ABOUT YOUR SATELLITE IMAGERY</small></div>
              </div>
              <span className="sq-chat-state"><i /> {loading ? 'SCANNING OBSERVATION' : 'READY TO LISTEN'}</span>
            </div>
            <div className="sq-chat-prompt">What would you like to discover?</div>
            <textarea maxLength={500} value={query} onChange={(event) => {
              setQuery(event.target.value); setErrors([]); setResult(undefined);
            }} placeholder="Ask SAT-AI about your satellite imagery..." aria-label="SAT-AI query" />
            <div className="sq-chat-footer">
              <div className="sq-chat-tools">
                <button type="button" onClick={() => setShowInputs(!showInputs)}>＋ <span>Observations</span></button>
                <button type="button" onClick={() => setShowInputs(true)}>◉ <span>{requirements.label}</span></button>
                <span className="sq-divider" />
                <span className="sq-hint">Click a suggestion to populate the query</span>
              </div>
              <span className="sq-char-count">{query.length}/500</span>
            </div>
            <div className="sq-suggestions">
              <span>TRY ASKING</span>
              {EXAMPLES[mode].map((example) => <button key={example} type="button" onClick={() => chooseExample(example)}>{example}</button>)}
            </div>
            </div>
            <div className="sq-scan-line" />
          </section>

          <div className="sq-action-row">
            <button className="sq-analyze" type="button" disabled={loading || !canAnalyze} onClick={submit}>
              <span><i /> {loading ? 'PROCESSING OBSERVATION...' : 'ANALYZE OBSERVATION'}</span><b>↗</b>
            </button>
          </div>

          {errors.length > 0 && <div className="sq-error"><strong>INPUT CHECK</strong>{errors.map((error) => <span key={error}>• {error}</span>)}</div>}

          <section className={`sq-quick-grid ${showInputs ? 'inputs-open' : ''}`}>
            <button type="button" className="sq-quick-card" onClick={() => setShowInputs(!showInputs)}>
              <span className="sq-card-icon">▣</span><span className="sq-card-arrow">↗</span>
              <strong>Observation<br />Inputs</strong><small>{requirements.requiresSecondImage ? 'Two images required for this mode' : 'Upload one satellite observation'}</small>
              <em>{imageA || imageB ? 'INPUT READY' : 'OPEN INPUTS'}</em>
            </button>
            <button type="button" className="sq-quick-card" onClick={() => setShowTrace(!showTrace)}>
              <span className="sq-card-icon">⌁</span><span className="sq-card-arrow">↗</span>
              <strong>Execution<br />Trace</strong><small>Follow the request through the analysis pipeline</small>
              <em>{loading ? 'RUNNING' : result ? 'COMPLETE' : 'STANDBY'}</em>
            </button>
            <button type="button" className="sq-quick-card" onClick={() => setShowFindings(!showFindings)}>
              <span className="sq-card-icon">✦</span><span className="sq-card-arrow">↗</span>
              <strong>Mission<br />Findings</strong><small>Answer, evidence, confidence and analysis metadata</small>
              <em>{result ? 'RESULT READY' : 'AWAITING RESULT'}</em>
            </button>
          </section>

          {showInputs && (
            <section className="sq-drawer sq-input-drawer">
              <div className="sq-drawer-head"><div><span>OBSERVATIONS / INPUT GATE</span><small>{requirements.requiresSecondImage ? 'TWO INPUTS REQUIRED' : 'ONE INPUT REQUIRED'}</small></div><button type="button" onClick={() => setShowInputs(false)}>CLOSE ×</button></div>
              <div className="sq-input-grid">
                <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, 'a')}>
                  <FileCard file={imageA} slot="A" label="PRIMARY OBSERVATION" onRemove={() => { setImageA(undefined); setResult(undefined); }} />
                  <label className="sq-file-button">Select file<input type="file" accept=".png,.jpg,.jpeg,.tif,.tiff,image/png,image/jpeg,image/tiff" onChange={(event) => setFile(event.target.files?.[0], 'a')} /></label>
                </div>
                {requirements.requiresSecondImage && <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, 'b')}>
                  <FileCard file={imageB} slot="B" label={mode === 'optical_sar' ? 'SAR / SECOND SENSOR' : 'LATER / SECOND OBSERVATION'} onRemove={() => { setImageB(undefined); setResult(undefined); }} />
                  <label className="sq-file-button">Select file<input type="file" accept=".png,.jpg,.jpeg,.tif,.tiff,image/png,image/jpeg,image/tiff" onChange={(event) => setFile(event.target.files?.[0], 'b')} /></label>
                </div>}
              </div>
              <div className="sq-input-note"><span>SUPPORTED</span> PNG · JPG/JPEG · TIFF/TIF <i /> MAX 20 MB</div>
            </section>
          )}

          {showTrace && (
            <section className="sq-drawer">
              <div className="sq-drawer-head"><div><span>EXECUTION TRACE</span><small>BACKEND-AWARE PROCESS PIPELINE</small></div><span className="sq-drawer-state">{loading ? 'RUNNING' : result ? 'COMPLETE' : 'STANDBY'}</span></div>
              <div className="sq-trace">
                {stages.map((item, index) => {
                  const state = loading ? index < stage ? 'done' : index === stage ? 'active' : '' : result && index <= stage ? 'done' : '';
                  return <div className={`sq-trace-step ${state}`} key={item}><span>0{index + 1}</span><i /><strong>{item}</strong>{index < stages.length - 1 && <b />}</div>;
                })}
              </div>
              <p className="sq-demo-note">Confidence and evidence in the current build are illustrative DEMO values. Real GeoChat / BIT-CD / CROMA inference will replace the mock response when the ML milestone is integrated.</p>
            </section>
          )}

          {showFindings && (
            <section className="sq-drawer">
              <div className="sq-drawer-head"><div><span>SAT-AI FINDINGS</span><small>RESULT PAYLOAD</small></div><span className="sq-drawer-state">{result ? 'MOCK / DEMO' : 'NO RESULT'}</span></div>
              {result ? (
                <div className="sq-findings">
                  <div className="sq-answer"><span>ANSWER · {result.status.toUpperCase()}</span><p>{result.answer}</p><div className="sq-readouts"><div><small>ANALYSIS ID</small><strong>{result.analysisId}</strong></div><div><small>TASK</small><strong>{result.task}</strong></div><div><small>CONFIDENCE</small><strong>{result.confidence === null ? '—' : `${result.confidence}%`} <em>DEMO</em></strong></div></div></div>
                  <div className="sq-evidence"><span>EVIDENCE · {result.evidence.length} ITEMS</span>{result.evidence.map((item) => <div key={item.id}><b>⌖</b><div><strong>{item.label}</strong><p>{item.description}</p></div><em>{item.source}</em></div>)}</div>
                </div>
              ) : <div className="sq-empty-findings"><span>+</span><div><strong>AWAITING OBSERVATION</strong><p>Run an analysis to populate the answer, evidence and execution summary.</p></div></div>}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
