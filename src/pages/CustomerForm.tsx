import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Customer } from '@/types/database'

export default function CustomerForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id

  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  })

  useEffect(() => {
    if (isEditing) {
      loadCustomer()
    }
  }, [id])

  const loadCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      if (data) {
        setFormData({
          name: data.name || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          notes: data.notes || '',
        })
      }
    } catch (error: any) {
      console.error('Error loading customer:', error)
      setError('Failed to load customer')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      if (isEditing) {
        const { error } = await supabase
          .from('customers')
          .update(formData)
          .eq('id', id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('customers')
          .insert({
            ...formData,
            user_id: user.id,
          })

        if (error) throw error
      }

      navigate('/customers')
    } catch (error: any) {
      console.error('Error saving customer:', error)
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/customers')}
          className="text-2xl"
        >
          ←
        </button>
        <h2 className="text-2xl font-bold">
          {isEditing ? 'Edit Customer' : 'New Customer'}
        </h2>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-100 text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Name *</label>
          <input
            type="text"
            className="input"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            required
            placeholder="Customer name"
          />
        </div>

        <div>
          <label className="label">Phone</label>
          <input
            type="tel"
            className="input"
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            placeholder="07123 456789"
          />
        </div>

        <div>
          <label className="label">Email</label>
          <input
            type="email"
            className="input"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="customer@email.com"
          />
        </div>

        <div>
          <label className="label">Address</label>
          <textarea
            className="input"
            rows={3}
            value={formData.address}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="Customer address"
          />
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea
            className="input"
            rows={4}
            value={formData.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Any additional notes about this customer..."
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary flex-1"
            disabled={saving}
          >
            {saving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}
