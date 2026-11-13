import { FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { api, errorMessage } from '../api';
import { EmptyRow, PageHead } from '../components/ui';

export default function Team() {
  const [name, setName] = useState('');
  const [teams, setTeams] = useState<any[]>([]);
  const [memberForm, setMemberForm] = useState({ teamId: '', email: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);

  const load = () =>
    api
      .get('/team')
      .then(response => {
        setTeams(response.data);
        setMemberForm(prev => ({ ...prev, teamId: prev.teamId || response.data[0]?.id || '' }));
      })
      .catch(err => setError(errorMessage(err)));

  useEffect(() => {
    load();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await api.post('/team', { name });
      setMessage('Tim berhasil dibuat.');
      setName('');
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function addMember(event: FormEvent) {
    event.preventDefault();
    setMemberLoading(true);
    setError('');
    setMessage('');
    try {
      await api.post(`/team/${memberForm.teamId}/members`, { email: memberForm.email });
      setMessage('Anggota berhasil ditambahkan.');
      setMemberForm(prev => ({ ...prev, email: '' }));
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setMemberLoading(false);
    }
  }

  async function removeMember(teamId: string, userId: string) {
    setError('');
    setMessage('');
    try {
      await api.delete(`/team/${teamId}/members/${userId}`);
      setMessage('Anggota dikeluarkan dari tim.');
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <>
      <PageHead title="Tim" subtitle="Buat tim dan kelola anggota kolaborasi." />
      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert ok">{message}</div>}
      <form className="panel" onSubmit={submit}>
        <h3>Tim baru</h3>
        <div className="form-row">
          <label>Nama tim</label>
          <input value={name} onChange={e => setName(e.target.value)} required minLength={2} />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Menyimpan...' : 'Buat tim'}
        </button>
      </form>

      {teams.length > 0 && (
        <form className="panel" onSubmit={addMember}>
          <h3>Tambah anggota</h3>
          <div className="form-grid">
            <div className="form-row">
              <label>Tim</label>
              <select
                value={memberForm.teamId}
                onChange={e => setMemberForm({ ...memberForm, teamId: e.target.value })}
                required
              >
                {teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Email anggota (harus terdaftar)</label>
              <input
                type="email"
                value={memberForm.email}
                onChange={e => setMemberForm({ ...memberForm, email: e.target.value })}
                required
              />
            </div>
          </div>
          <button type="submit" disabled={memberLoading}>
            {memberLoading ? 'Menyimpan...' : 'Tambah anggota'}
          </button>
        </form>
      )}

      <div className="panel">
        <h3>Tim saya</h3>
        <table>
          <thead>
            <tr>
              <th>Nama</th>
              <th>Anggota</th>
              <th>Dibuat</th>
            </tr>
          </thead>
          <tbody>
            {teams.map(team => (
              <tr key={team.id}>
                <td>{team.name}</td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {team.members?.map((member: any) => (
                      <span key={member.id} className="chip neutral">
                        {member.user?.email || 'Anggota'}
                        {member.role === 'Leader' ? ' · Leader' : ''}
                        {member.role !== 'Leader' && (
                          <button
                            className="icon-btn"
                            style={{ padding: 0, marginLeft: 4 }}
                            title="Keluarkan anggota"
                            onClick={() => removeMember(team.id, member.userId)}
                          >
                            <X size={11} />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </td>
                <td>{new Date(team.createdAt || Date.now()).toLocaleDateString('id-ID')}</td>
              </tr>
            ))}
            {teams.length === 0 && <EmptyRow colSpan={3} text="Belum ada tim." />}
          </tbody>
        </table>
      </div>
    </>
  );
}
