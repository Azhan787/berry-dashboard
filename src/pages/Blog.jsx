import React, { useState } from 'react';
import { Search, Plus, X, Pencil, Trash2, Eye, BookOpen, Users, TrendingUp, Star } from 'lucide-react';
import './pages.css';

const blogStats = [
  { label: 'Total Posts', value: '128', icon: BookOpen, bg: 'rgba(103,58,183,0.15)', color: '#673ab7' },
  { label: 'Total Authors', value: '24', icon: Users, bg: 'rgba(33,150,243,0.15)', color: '#2196f3' },
  { label: 'Total Views', value: '1.4M', icon: Eye, bg: 'rgba(0,200,83,0.15)', color: '#00c853' },
  { label: 'Featured Posts', value: '18', icon: Star, bg: 'rgba(255,193,7,0.15)', color: '#ffc107' },
];

const initialPosts = [
  { id: 1, title: 'Getting Started with React', author: 'Alice M.', date: '2026-09-01', status: 'Published', views: 3420 },
  { id: 2, title: 'Advanced CSS Techniques', author: 'Bob L.', date: '2026-09-02', status: 'Draft', views: 0 },
  { id: 3, title: 'Node.js Best Practices', author: 'Carol W.', date: '2026-09-03', status: 'Published', views: 2100 },
  { id: 4, title: 'Database Design Patterns', author: 'David K.', date: '2026-09-04', status: 'Review', views: 0 },
  { id: 5, title: 'UI/UX for Developers', author: 'Eve T.', date: '2026-09-05', status: 'Published', views: 5800 },
];

const Blog = () => {
  const [posts, setPosts] = useState(initialPosts);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', author: '', date: '', status: 'Draft' });

  const filtered = posts.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.author.toLowerCase().includes(search.toLowerCase())
  );

  const addPost = () => {
    setPosts([{ id: Date.now(), ...form, views: 0 }, ...posts]);
    setShowModal(false);
    setForm({ title: '', author: '', date: '', status: 'Draft' });
  };

  const deletePost = (id) => setPosts(posts.filter(p => p.id !== id));

  const statusBadge = (s) => {
    const map = { Published: 'badge-success', Draft: 'badge-warning', Review: 'badge-info' };
    return `badge ${map[s] || 'badge-info'}`;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Blog</h1>
          <p className="page-subtitle">Manage your blog posts and content</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Post
        </button>
      </div>

      <div className="stats-row">
        {blogStats.map(s => (
          <div className="mini-stat-card" key={s.label}>
            <div className="mini-stat-icon" style={{ backgroundColor: s.bg }}>
              <s.icon size={22} color={s.color} />
            </div>
            <div>
              <div className="mini-stat-value">{s.value}</div>
              <div className="mini-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="table-card">
        <div className="table-card-header">
          <div className="table-card-title">Blog Posts</div>
          <div className="table-actions">
            <div className="search-input-wrap">
              <Search size={16} color="#64748b" />
              <input placeholder="Search posts..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Date</th>
                <th>Status</th>
                <th>Views</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(post => (
                <tr key={post.id}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{post.title}</td>
                  <td>{post.author}</td>
                  <td>{post.date}</td>
                  <td><span className={statusBadge(post.status)}>{post.status}</span></td>
                  <td>{post.views.toLocaleString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary btn-icon btn-sm" title="View"><Eye size={14} /></button>
                      <button className="btn btn-secondary btn-icon btn-sm" title="Edit"><Pencil size={14} /></button>
                      <button className="btn btn-danger btn-icon btn-sm" title="Delete" onClick={() => deletePost(post.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add Blog Post</span>
              <button className="btn btn-secondary btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Post title" />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Author</label>
                  <input className="form-input" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} placeholder="Author name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {['Draft', 'Review', 'Published'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addPost}>Add Post</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Blog;
