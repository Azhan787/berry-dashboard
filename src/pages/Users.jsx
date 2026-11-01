import React, { useEffect, useState } from 'react';
import { Search, UserPlus, Trash2, Mail, ShieldCheck, X } from 'lucide-react';
import { apiRequest } from '../lib/auth';
import { useAuth } from '../contexts/AuthContextValue';
import './pages.css';

export default function Users() {
  const { activeOrganizationId, organizations } = useAuth();
  const currentRole = organizations.find((item) => item.id === activeOrganizationId)?.role;
  const canManage = ['owner', 'admin'].includes(currentRole);
  const [teamState, setTeamState] = useState({ organizationId: null, members: [], invitations: [] });
  const [search, setSearch] = useState(''); const [showInvite, setShowInvite] = useState(false); const [invite, setInvite] = useState({ email: '', role: 'member' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const loading = teamState.organizationId !== activeOrganizationId;
  const members = loading ? [] : teamState.members; const invitations = loading ? [] : teamState.invitations;
  const visibleMembers = members.filter((member) => `${member.profile?.full_name || ''} ${member.profile?.email || ''}`.toLowerCase().includes(search.toLowerCase()));

  const load = async () => {
    const [memberRows, invitationRows] = await Promise.all([apiRequest(`/organizations/${activeOrganizationId}/members`), apiRequest(`/organizations/${activeOrganizationId}/invitations`)]);
    setTeamState({ organizationId: activeOrganizationId, members: memberRows || [], invitations: invitationRows || [] });
  };
  useEffect(() => {
    let active = true;
    Promise.all([apiRequest(`/organizations/${activeOrganizationId}/members`), apiRequest(`/organizations/${activeOrganizationId}/invitations`)]).then(([memberRows, invitationRows]) => {
      if (active) { setTeamState({ organizationId: activeOrganizationId, members: memberRows || [], invitations: invitationRows || [] }); setError(''); }
    }).catch((err) => { if (active) { setTeamState({ organizationId: activeOrganizationId, members: [], invitations: [] }); setError(err.message); } });
    return () => { active = false; };
  }, [activeOrganizationId]);

  const updateMember = async (member, values) => {
    setBusy(true); setError('');
    try { await apiRequest(`/organizations/${activeOrganizationId}/members/${member.user_id}`, { method: 'PATCH', body: { role: values.role ?? member.role, status: values.status ?? member.status } }); setNotice('Team member updated.'); await load(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const removeMember = async (member) => {
    if (!window.confirm(`Remove ${member.profile?.email || 'this member'} from the workspace?`)) return;
    setBusy(true); setError('');
    try { await apiRequest(`/organizations/${activeOrganizationId}/members/${member.user_id}`, { method: 'DELETE' }); setNotice('Member removed from this workspace.'); await load(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const createInvite = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { await apiRequest(`/organizations/${activeOrganizationId}/invitations`, { method: 'POST', body: invite }); setInvite({ email: '', role: 'member' }); setShowInvite(false); setNotice('Invitation email sent.'); await load(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const revokeInvite = async (row) => {
    setBusy(true); setError('');
    try { await apiRequest(`/organizations/${activeOrganizationId}/invitations/${row.id}`, { method: 'DELETE' }); setNotice(`Invitation to ${row.email} revoked.`); await load(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return <div>
    <div className="page-header"><div><h1 className="page-title">Team</h1><p className="page-subtitle">Manage members and invitations for this organization.</p></div>{canManage && <button className="btn btn-primary" onClick={() => setShowInvite(true)}><UserPlus size={16} /> Invite member</button>}</div>
    {error && <div role="alert" className="dashboard-state dashboard-error">{error}</div>}{notice && <div role="status" className="invoice-notice">{notice}</div>}
    {!canManage && !loading && <div className="business-panel">Team administration is restricted to organization owners and admins.</div>}
    <div className="table-card"><div className="table-card-header"><div className="table-card-title">Members ({members.length})</div><div className="table-actions"><div className="search-input-wrap"><Search size={16} color="#64748b" /><input placeholder="Search members..." value={search} onChange={(event) => setSearch(event.target.value)} /></div></div></div><div className="table-responsive"><table className="data-table"><thead><tr><th>Member</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead><tbody>
      {visibleMembers.map((member) => <tr key={member.user_id}><td><div className="user-cell"><div className="avatar-sm">{(member.profile?.full_name || member.profile?.email || '?').charAt(0).toUpperCase()}</div><div><strong>{member.profile?.full_name || '—'}</strong><div className="team-email">{member.profile?.email || member.user_id}</div></div></div></td><td>{canManage && member.role !== 'owner' ? <select aria-label={`Role for ${member.profile?.email || member.user_id}`} className="select-input" value={member.role} disabled={busy || (currentRole === 'admin' && member.role === 'admin')} onChange={(event) => updateMember(member, { role: event.target.value })}>{(currentRole === 'owner' ? ['admin', 'manager', 'member', 'viewer'] : ['manager', 'member', 'viewer']).map((role) => <option key={role}>{role}</option>)}</select> : member.role}</td><td><span className={`badge ${member.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{member.status}</span></td><td>{member.joined_at ? new Date(member.joined_at).toLocaleDateString() : '—'}</td><td>{member.role !== 'owner' && canManage && <div className="team-actions"><button className="btn btn-secondary btn-sm" disabled={busy || (currentRole === 'admin' && member.role === 'admin')} onClick={() => updateMember(member, { status: member.status === 'active' ? 'suspended' : 'active' })}>{member.status === 'active' ? 'Suspend' : 'Reactivate'}</button><button className="btn btn-danger btn-icon btn-sm" title="Remove member" onClick={() => removeMember(member)}><Trash2 size={14} /></button></div>}</td></tr>)}
      {loading && <tr><td colSpan="5">Loading team…</td></tr>}{!loading && canManage && visibleMembers.length === 0 && <tr><td colSpan="5">{search ? 'No members match this search.' : 'No team members found.'}</td></tr>}
    </tbody></table></div></div>
    {canManage && <div className="table-card"><div className="table-card-header"><div className="table-card-title">Invitations ({invitations.filter((row) => !row.accepted_at && !row.revoked_at && new Date(row.expires_at) > new Date()).length})</div></div><div className="table-responsive"><table className="data-table"><thead><tr><th>Email</th><th>Role</th><th>Expires</th><th>Status</th><th></th></tr></thead><tbody>{invitations.map((row) => { const active = !row.accepted_at && !row.revoked_at && new Date(row.expires_at) > new Date(); const state = row.accepted_at ? 'accepted' : row.revoked_at ? 'revoked' : active ? 'pending' : 'expired'; return <tr key={row.id}><td>{row.email}</td><td>{row.role}</td><td>{new Date(row.expires_at).toLocaleDateString()}</td><td>{state}</td><td>{active && <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => revokeInvite(row)}><X size={14} /> Revoke</button>}</td></tr>; })}{!loading && invitations.length === 0 && <tr><td colSpan="5">No invitations.</td></tr>}</tbody></table></div></div>}

    {showInvite && <div className="modal-backdrop" onClick={() => !busy && setShowInvite(false)}><form className="modal" onSubmit={createInvite} onClick={(event) => event.stopPropagation()}><div className="modal-header"><span className="modal-title">Invite a teammate</span><button type="button" className="btn btn-secondary btn-icon" onClick={() => setShowInvite(false)}><X size={18} /></button></div><div className="modal-body"><div className="form-group"><label className="form-label">Work email</label><input required type="email" maxLength="254" className="form-input" value={invite.email} onChange={(event) => setInvite({ ...invite, email: event.target.value })} /></div><div className="form-group"><label className="form-label">Role</label><select className="form-input" value={invite.role} onChange={(event) => setInvite({ ...invite, role: event.target.value })}>{(currentRole === 'owner' ? ['admin', 'manager', 'member', 'viewer'] : ['manager', 'member', 'viewer']).map((role) => <option key={role}>{role}</option>)}</select></div><p className="team-invite-help"><Mail size={14} /> Invitation email is sent through the configured server email provider and expires in seven days.</p></div><div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowInvite(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy}><ShieldCheck size={15} /> Send invitation</button></div></form></div>}
  </div>;
}
