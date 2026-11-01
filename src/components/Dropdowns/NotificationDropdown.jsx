import React, { useCallback, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../lib/auth';
import { useAuth } from '../../contexts/AuthContextValue';
import { useClickOutside } from '../../hooks/useClickOutside';
import './Dropdown.css';

export default function NotificationDropdown() {
  const { activeOrganizationId } = useAuth();
  const [isOpen, setIsOpen] = useState(false); const [state, setState] = useState({ organizationId: null, items: [], unreadCount: 0 }); const [error, setError] = useState('');
  const dropdownRef = useRef(null); const navigate = useNavigate();
  useClickOutside(dropdownRef, () => setIsOpen(false));
  const load = useCallback(async () => { try { const result = await apiRequest('/notifications'); setState({ organizationId: activeOrganizationId, items: result.items || [], unreadCount: result.unreadCount || 0 }); setError(''); } catch (err) { setError(err.message); } }, [activeOrganizationId]);
  const markRead = async (item) => { try { await apiRequest(`/notifications/${item.id}/read`, { method: 'PATCH' }); setState((current) => ({ ...current, items: current.items.map((row) => row.id === item.id ? { ...row, is_read: true } : row), unreadCount: Math.max(0, current.unreadCount - (item.is_read ? 0 : 1)) })); } catch (err) { setError(err.message); } };
  const markAll = async () => { try { await apiRequest('/notifications/read-all', { method: 'PATCH' }); setState((current) => ({ ...current, items: current.items.map((row) => ({ ...row, is_read: true })), unreadCount: 0 })); } catch (err) { setError(err.message); } };
  const openItem = async (item) => { if (!item.is_read) await markRead(item); setIsOpen(false); const path = item.action_url?.startsWith('/') && !item.action_url.startsWith('//') ? item.action_url : '/'; navigate(path); };
  const notifications = state.organizationId === activeOrganizationId ? state.items : [];
  return <div className="dropdown-wrapper" ref={dropdownRef} style={{ position: 'relative' }}>
    <button className="icon-btn notification-trigger" onClick={() => { const open = !isOpen; setIsOpen(open); if (open) void load(); }} aria-label={`Notifications${state.unreadCount ? `, ${state.unreadCount} unread` : ''}`} aria-expanded={isOpen}><Bell size={18} />{state.unreadCount > 0 && <span className="notification-count">{state.unreadCount > 99 ? '99+' : state.unreadCount}</span>}</button>
    {isOpen && <div className="dropdown-menu notification-menu"><div className="dropdown-header"><span>Notifications</span>{state.unreadCount > 0 && <button className="notification-clear" onClick={markAll}><CheckCheck size={14} /> Mark all read</button>}</div>{error && <p className="notification-error">{error}</p>}{notifications.length ? notifications.map((item) => <button key={item.id} className={`notification-item${item.is_read ? '' : ' unread'}`} onClick={() => openItem(item)}><strong>{item.title}</strong><span>{item.message}</span><small>{new Date(item.created_at).toLocaleString()}</small></button>) : <div className="notification-empty">No workspace notifications yet.</div>}</div>}
  </div>;
}
