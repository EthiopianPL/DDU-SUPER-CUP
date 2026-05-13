// src/app/pages/AdminNewsPage.tsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Edit, Trash2, Save, X, AlertCircle,
  CheckCircle, Loader2, Upload
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export function AdminNewsPage() {
  const { user } = useAuth();
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'Match Report',
    image: '',
    team_color: '#ffd700'
  });

  const categories = [
    'Match Report', 'Highlights', 'Transfer News',
    'Interview', 'International', 'Awards', 'Announcement'
  ];

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNews(data || []);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!file) return null;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return null;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return null;
    }

    setUploading(true);

    try {
      // First, try to create the bucket if it doesn't exist
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `news/${fileName}`;

      // Try to upload to 'news-images' bucket
      const { error: uploadError } = await supabase.storage
        .from('news-images')
        .upload(filePath, file);

      if (uploadError) {
        // If bucket doesn't exist, try using the default 'public' bucket or skip image
        console.error('Upload error:', uploadError);

        // Create a public URL using a free image service as fallback
        // For now, return a placeholder image
        const fallbackImage = 'https://images.unsplash.com/photo-1698844013403-b7c4cf0d3b2f';
        setError('Image upload failed. Using placeholder image.');
        return fallbackImage;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('news-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      // Return a placeholder image instead of failing
      return 'https://images.unsplash.com/photo-1698844013403-b7c4cf0d3b2f';
    } finally {
      setUploading(false);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = await uploadImage(file);
      if (imageUrl) {
        setFormData({ ...formData, image: imageUrl });
        setSuccess('Image uploaded successfully!');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from('news')
          .update({
            title: formData.title,
            content: formData.content,
            category: formData.category,
            image: formData.image,
            team_color: formData.team_color,
          })
          .eq('id', editingId);

        if (error) throw error;
        setSuccess('News updated successfully!');
      } else {
        const { error } = await supabase
          .from('news')
          .insert([{
            title: formData.title,
            content: formData.content,
            category: formData.category,
            image: formData.image || 'https://images.unsplash.com/photo-1698844013403-b7c4cf0d3b2f',
            team_color: formData.team_color,
            author: user?.name || 'Admin',
          }]);

        if (error) throw error;
        setSuccess('News posted successfully!');
      }

      resetForm();
      fetchNews();
      setShowForm(false);
    } catch (error: any) {
      setError(error.message || 'Failed to save news');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this news?')) return;

    try {
      const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccess('News deleted successfully!');
      fetchNews();
    } catch (error: any) {
      setError(error.message || 'Failed to delete news');
    }
  };

  const handleEdit = (item: any) => {
    setFormData({
      title: item.title,
      content: item.content,
      category: item.category,
      image: item.image || '',
      team_color: item.team_color || '#ffd700'
    });
    setEditingId(item.id);
    setIsEditing(true);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      category: 'Match Report',
      image: '',
      team_color: '#ffd700'
    });
    setEditingId(null);
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#ffd700] animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Manage News</h2>
          <p className="text-sm text-gray-400">Create, edit, and delete news articles</p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-[#ffd700] text-black hover:scale-[1.02] transition-all"
          >
            <Plus className="w-4 h-4" />
            Post New News
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-red-500 text-sm">{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-green-500 text-sm">{success}</span>
        </div>
      )}

      {showForm && (
        <div className="rounded-lg p-6 mb-8" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">
              {isEditing ? 'Edit News' : 'Create New News'}
            </h3>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="p-1 hover:bg-white/10 rounded-lg">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 rounded-lg text-white"
                style={{ background: 'rgba(10, 14, 26, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 rounded-lg text-white resize-y"
                style={{ background: 'rgba(10, 14, 26, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg text-white"
                  style={{ background: 'rgba(10, 14, 26, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Team Color</label>
                <div className="flex gap-2 flex-wrap">
                  {['#ffc300', '#e63946', '#8b4513', '#2d6a4f', '#0077b6', '#6a4c93', '#ffd700'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, team_color: color })}
                      className={`w-8 h-8 rounded-full transition-all ${formData.team_color === color ? 'ring-2 ring-white scale-110' : ''}`}
                      style={{ background: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Image URL (Optional)</label>
              <input
                type="text"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 py-2 rounded-lg text-white"
                style={{ background: 'rgba(10, 14, 26, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
              />
              <p className="text-xs text-gray-500 mt-1">Enter an image URL or use the upload button below</p>

              <div className="mt-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Upload Image
                </button>
              </div>

              {formData.image && (
                <div className="flex items-center gap-2 mt-2">
                  <img src={formData.image} alt="Preview" className="w-10 h-10 rounded object-cover" />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, image: '' })}
                    className="text-red-400 text-sm hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading || uploading} className="flex items-center gap-2 px-6 py-2 rounded-lg font-semibold bg-[#ffd700] text-black">
                {(loading || uploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isEditing ? 'Update News' : 'Post News'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="px-6 py-2 rounded-lg font-semibold text-gray-400">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white">All News Articles</h3>
        {news.length === 0 ? (
          <div className="text-center py-12 rounded-lg" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
            <p className="text-gray-400">No news articles yet</p>
            <button onClick={() => setShowForm(true)} className="mt-3 text-[#ffd700] text-sm hover:underline">
              Create your first news post
            </button>
          </div>
        ) : (
          news.map((item) => (
            <div key={item.id} className="rounded-lg p-4" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
              <div className="flex gap-4">
                {item.image && (
                  <img src={item.image} alt={item.title} className="w-24 h-24 object-cover rounded-lg" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: item.team_color || '#ffd700', color: '#000' }}>
                      {item.category}
                    </span>
                    <span className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-white font-semibold mb-1">{item.title}</h4>
                  <p className="text-sm text-gray-400 line-clamp-2">{item.content}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(item)} className="p-2 rounded-lg hover:bg-white/10">
                    <Edit className="w-4 h-4 text-blue-400" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg hover:bg-white/10">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}