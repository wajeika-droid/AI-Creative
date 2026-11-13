import { FormEvent, useEffect, useState } from 'react';
import {
  Brain,
  Database,
  Mail,
  MessageSquare,
  Play,
  RefreshCcw,
  Save,
  Settings2,
  Zap,
} from 'lucide-react';
import { api, errorMessage } from '../api';
import { EmptyRow, PageHead } from '../components/ui';

type FlowNode = {
  id: string;
  kind: 'trigger' | 'ai' | 'action';
  type: string;
  title: string;
  sub: string;
  tag: string;
  x: number;
  y: number;
  model?: string;
  temperature?: number;
};

const NODE_WIDTH = 194;

const initialNodes: FlowNode[] = [
  {
    id: 'trigger',
    kind: 'trigger',
    type: 'Webhook',
    title: 'Lead qualifier',
    sub: 'Inbound workspace trigger',
    tag: 'TRIGGER',
    x: 40,
    y: 230,
  },
  {
    id: 'qualify',
    kind: 'ai',
    type: 'AI Cluster',
    title: 'Quality lead',
    sub: 'Analyze the lead and classify',
    tag: 'AI · MODEL',
    x: 330,
    y: 150,
    model: 'Gemini 2.0',
    temperature: 0.2,
  },
  {
    id: 'postgres',
    kind: 'action',
    type: 'Tool',
    title: 'Postgres query',
    sub: 'Leads table · last 30 days',
    tag: 'TOOL',
    x: 620,
    y: 60,
  },
  {
    id: 'crm',
    kind: 'action',
    type: 'Action',
    title: 'Update CRM',
    sub: 'HubSpot contact',
    tag: 'ACTION',
    x: 620,
    y: 236,
  },
  {
    id: 'email',
    kind: 'action',
    type: 'Action',
    title: 'Send email',
    sub: 'Personalized intro',
    tag: 'ACTION',
    x: 620,
    y: 404,
  },
  {
    id: 'slack',
    kind: 'action',
    type: 'Action',
    title: 'Send to Slack',
    sub: '#sales-alerts',
    tag: 'ACTION',
    x: 330,
    y: 352,
  },
];

const edges: [string, string][] = [
  ['trigger', 'qualify'],
  ['qualify', 'postgres'],
  ['qualify', 'crm'],
  ['qualify', 'slack'],
  ['crm', 'email'],
];

function connector(from: FlowNode, to: FlowNode) {
  const x1 = from.x + NODE_WIDTH;
  const y1 = from.y + 34;
  const x2 = to.x;
  const y2 = to.y + 34;
  const dx = Math.max(38, Math.abs(x2 - x1) / 2);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

export default function WorkflowBuilder() {
  const [nodes, setNodes] = useState<FlowNode[]>(initialNodes);
  const [selectedId, setSelectedId] = useState('qualify');
  const [workflowName, setWorkflowName] = useState('Lead qualifier');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [workflows, setWorkflows] = useState<any[]>([]);

  const selected = nodes.find(node => node.id === selectedId) || nodes[0];

  const loadWorkflows = () =>
    api
      .get('/workflow')
      .then(response => setWorkflows(response.data))
      .catch(() => setWorkflows([]));

  useEffect(() => {
    loadWorkflows();
  }, []);

  function updateNode(patch: Partial<FlowNode>) {
    setNodes(prev => prev.map(node => (node.id === selected.id ? { ...node, ...patch } : node)));
  }

  async function saveWorkflow(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await api.post('/workflow', {
        name: workflowName,
        description: `${nodes.length} node · AI automation`,
        steps: nodes.map((node, index) => ({
          order: index + 1,
          type: node.type.toLowerCase().replace(/\s+/g, '_'),
          config: {
            label: node.title,
            kind: node.kind,
            ...(node.model ? { model: node.model } : {}),
            ...(node.temperature !== undefined ? { temperature: node.temperature } : {}),
          },
        })),
      });
      setMessage('Workflow berhasil disimpan.');
      loadWorkflows();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const nodeIcon = (node: FlowNode) => {
    if (node.kind === 'trigger') return <Zap size={12} />;
    if (node.kind === 'ai') return <Brain size={12} />;
    if (node.title.includes('Postgres')) return <Database size={12} />;
    if (node.title.includes('email')) return <Mail size={12} />;
    return <MessageSquare size={12} />;
  };

  return (
    <>
      <PageHead
        title="Workflow Builder"
        subtitle="Otomasi proses pembuatan konten dan kualifikasi lead dengan AI."
        actions={
          <>
            <button
              className="btn ghost"
              onClick={() => {
                setMessage('Workflow dijalankan (simulasi).');
                window.setTimeout(() => setMessage(''), 3000);
              }}
            >
              <Play size={14} /> Run
            </button>
            <button className="btn" onClick={() => saveWorkflow()} disabled={loading}>
              <Save size={14} /> {loading ? 'Menyimpan...' : 'Save workflow'}
            </button>
          </>
        }
      />

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert ok">{message}</div>}

      <div className="flow-wrap" style={{ marginBottom: 16 }}>
        <div className="flow-canvas">
          <div className="flow-hint">Click node to inspect · drag layout coming soon</div>
          <svg className="flow-svg">
            {edges.map(([fromId, toId]) => {
              const from = nodes.find(node => node.id === fromId);
              const to = nodes.find(node => node.id === toId);
              if (!from || !to) return null;
              return (
                <path
                  key={`${fromId}-${toId}`}
                  d={connector(from, to)}
                  stroke={from.kind === 'ai' ? '#5a4bb5' : '#333b58'}
                  strokeWidth={1.6}
                  fill="none"
                />
              );
            })}
          </svg>

          {nodes.map(node => (
            <div
              key={node.id}
              className={`flow-node ${node.kind}${selectedId === node.id ? ' selected' : ''}`}
              style={{ left: node.x, top: node.y }}
              onClick={() => setSelectedId(node.id)}
            >
              <div className="node-top">
                <span className="node-dot" />
                {node.type}
                <span style={{ marginLeft: 'auto' }}>{nodeIcon(node)}</span>
              </div>
              <div className="node-title">{node.title}</div>
              <div className="node-sub">{node.sub}</div>
              <span className="node-tag">{node.tag}</span>
            </div>
          ))}

          <div className="flow-toolbar">
            <button className="btn subtle sm" onClick={() => setNodes(initialNodes)}>
              <RefreshCcw size={12} /> Reset
            </button>
            <button
              className="btn subtle sm"
              onClick={() => {
                const id = `node-${nodes.length + 1}`;
                setNodes(prev => [
                  ...prev,
                  {
                    id,
                    kind: 'action',
                    type: 'Action',
                    title: 'New action',
                    sub: 'Configure in inspector',
                    tag: 'ACTION',
                    x: 80 + ((prev.length * 40) % 320),
                    y: 440,
                  },
                ]);
                setSelectedId(id);
              }}
            >
              <Settings2 size={12} /> Add node
            </button>
          </div>
        </div>

        <aside className="card inspector">
          <h4>{selected.title}</h4>
          <div className="sub">
            {selected.type} · {selected.kind.toUpperCase()} NODE
          </div>

          <div className="field">
            <label>Workflow name</label>
            <input value={workflowName} onChange={event => setWorkflowName(event.target.value)} />
          </div>
          <div className="field">
            <label>Node label</label>
            <input value={selected.title} onChange={event => updateNode({ title: event.target.value })} />
          </div>
          <div className="field">
            <label>Description</label>
            <input value={selected.sub} onChange={event => updateNode({ sub: event.target.value })} />
          </div>

          {selected.kind === 'ai' && (
            <>
              <div className="field">
                <label>Model</label>
                <select
                  value={selected.model}
                  onChange={event => updateNode({ model: event.target.value })}
                >
                  <option>Gemini 2.0</option>
                  <option>GPT-4o</option>
                  <option>Claude Sonnet</option>
                  <option>Llama 3.1</option>
                </select>
              </div>
              <div className="field">
                <label>Temperature</label>
                <input
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={selected.temperature ?? 0.2}
                  onChange={event => updateNode({ temperature: Number(event.target.value) })}
                />
              </div>
            </>
          )}

          <div className="inspector-run">
            <span>
              <span className="dot" style={{ display: 'inline-block', marginRight: 6 }} />
              Ready to run
            </span>
            <span>{nodes.length} nodes</span>
          </div>

          <button
            className="btn"
            style={{ width: '100%', marginTop: 12 }}
            onClick={() => saveWorkflow()}
            disabled={loading}
          >
            <Save size={13} /> Save workflow
          </button>
        </aside>
      </div>

      <div className="card card-pad-lg">
        <div className="card-head">
          <div className="card-title">Workflow tersimpan</div>
          <span className="muted">{workflows.length} workflow</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Deskripsi</th>
              <th>Langkah</th>
              <th>Dibuat</th>
            </tr>
          </thead>
          <tbody>
            {workflows.map(workflow => (
              <tr key={workflow.id}>
                <td>{workflow.name}</td>
                <td className="muted">{workflow.description || '-'}</td>
                <td>{workflow.steps?.length ?? 0}</td>
                <td className="muted">
                  {new Date(workflow.createdAt).toLocaleDateString('id-ID')}
                </td>
              </tr>
            ))}
            {workflows.length === 0 && <EmptyRow colSpan={4} text="Belum ada workflow tersimpan." />}
          </tbody>
        </table>
      </div>
    </>
  );
}
