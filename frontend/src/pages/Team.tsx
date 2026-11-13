import { FormEvent, useEffect, useState } from 'react';
import { api, errorMessage } from '../api';
import { EmptyRow, PageHead } from '../components/ui';

export default function Team() {
  const [name, setName] = useState('');
  const [teams, setTeams] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () =>
    api
      .get('/team')
      .then(response => setTeams(response.data))
      .catch(err => setError(errorMessage(err)));

  useEffect(() => {
    load();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/team', { name });
      setName('');
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHead title="Tim" subtitle="Buat tim dan kelola anggota kolaborasi." />
      {error && <div className="alert error">{error}</div>}
      <form className="panel" onSubmit={submit}>
        <h3>Tim baru</h3>
        <div className="form-row">
          <label>Nama tim</label>
          <input value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Menyimpan...' : 'Buat tim'}
        </button>
      </form>
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
                <td>{team.members?.length ?? 0}</td>
                <td>{new Date(team.createdAt || Date.now()).toLocaleDateString('id-ID')}</td>
              </tr>
            ))}
            {teams.length === 0 && (
              <tr>
                <td colSpan={3} className="muted">
                  Belum ada tim.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
