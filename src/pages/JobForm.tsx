import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Job, Customer, Settings } from '@/types/database'

export default function JobForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const preselectedCustomer = searchParams.get('customer')
  const isEditing = !!id

  const [loading, setLoading] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)

  // Customer modal state
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [savingCustomer, setSavingCustomer] = useState(false)
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  })

  const [formData, setFormData] = useState({
    customer_id: preselectedCustomer || '',
    title: '',
    description: '',
    notes: '',
    status: 'draft' as Job['status'],
    job_address: '',

    // Dates
    quote_date: '',
    quote_valid_until: '',
    start_date: '',
    end_date: '',
    invoice_date: '',
    paid_date: '',

    // Materials
    materials_notes: '',
    materials_cost: '',

    // Labour
    labour_type: 'days' as 'days' | 'fixed',
    labour_days: '',
    labour_day_rate: '',
    labour_fixed_cost: '',

    // Other
    other_costs: '',
    other_costs_notes: '',
  })

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load customers
      const { data: customersData } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      setCustomers(customersData || [])

      // Load settings
      const { data: settingsData } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setSettings(settingsData)

      // If editing, load the job
      if (isEditing && id) {
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', id)
          .single()

        if (jobError) throw jobError

        if (jobData) {
          // Determine labour type based on what's populated
          const labourType = jobData.labour_days && jobData.labour_day_rate ? 'days' : 'fixed'

          setFormData({
            customer_id: jobData.customer_id || '',
            title: jobData.title || '',
            description: jobData.description || '',
            notes: jobData.notes || '',
            status: jobData.status || 'draft',
            job_address: jobData.job_address || '',
            quote_date: jobData.quote_date || '',
            quote_valid_until: jobData.quote_valid_until || '',
            start_date: jobData.start_date || '',
            end_date: jobData.end_date || '',
            invoice_date: jobData.invoice_date || '',
            paid_date: jobData.paid_date || '',
            materials_notes: jobData.materials_notes || '',
            materials_cost: jobData.materials_cost?.toString() || '',
            labour_type: labourType,
            labour_days: jobData.labour_days?.toString() || '',
            labour_day_rate: jobData.labour_day_rate?.toString() || '',
            labour_fixed_cost: labourType === 'fixed' ? jobData.labour_cost?.toString() || '' : '',
            other_costs: jobData.other_costs?.toString() || '',
            other_costs_notes: jobData.other_costs_notes || '',
          })
        }
      } else if (settingsData?.default_day_rate) {
        // Set default day rate for new jobs
        setFormData(prev => ({
          ...prev,
          labour_day_rate: settingsData.default_day_rate?.toString() || '',
        }))
      }
    } catch (error: any) {
      console.error('Error loading data:', error)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Calculate costs
  const materialsTotal = parseFloat(formData.materials_cost) || 0

  // Calculate labour based on type
  let labourTotal = 0
  if (formData.labour_type === 'days') {
    const labourDays = parseFloat(formData.labour_days) || 0
    const labourRate = parseFloat(formData.labour_day_rate) || 0
    labourTotal = labourDays * labourRate
  } else {
    labourTotal = parseFloat(formData.labour_fixed_cost) || 0
  }

  const otherTotal = parseFloat(formData.other_costs) || 0

  const subtotal = materialsTotal + labourTotal + otherTotal
  const vatAmount = settings?.vat_registered ? subtotal * 0.20 : 0
  const total = subtotal + vatAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const jobData = {
        ...formData,
        user_id: user.id,
        materials_cost: parseFloat(formData.materials_cost) || null,
        // Set labour fields based on type
        labour_days: formData.labour_type === 'days' ? parseFloat(formData.labour_days) || null : null,
        labour_day_rate: formData.labour_type === 'days' ? parseFloat(formData.labour_day_rate) || null : null,
        labour_cost: labourTotal || null,
        other_costs: parseFloat(formData.other_costs) || null,
        subtotal,
        vat_amount: vatAmount,
        total,
        quote_date: formData.quote_date || null,
        quote_valid_until: formData.quote_valid_until || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        invoice_date: formData.invoice_date || null,
        paid_date: formData.paid_date || null,
        // Remove internal fields that aren't in the database
        labour_type: undefined,
        labour_fixed_cost: undefined,
      }

      if (isEditing) {
        const { error } = await supabase
          .from('jobs')
          .update(jobData)
          .eq('id', id)

        if (error) throw error
        navigate(`/jobs/${id}`)
      } else {
        const { data, error } = await supabase
          .from('jobs')
          .insert(jobData)
          .select()
          .single()

        if (error) throw error
        navigate(`/jobs/${data.id}`)
      }
    } catch (error: any) {
      console.error('Error saving job:', error)
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCustomerSelectChange = (value: string) => {
    if (value === 'CREATE_NEW') {
      setShowCustomerModal(true)
    } else {
      updateField('customer_id', value)
    }
  }

  const handleCreateCustomer = async () => {
    if (!newCustomer.name) {
      alert('Customer name is required')
      return
    }

    setSavingCustomer(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('customers')
        .insert({
          ...newCustomer,
          user_id: user.id,
        })
        .select()
        .single()

      if (error) throw error

      // Add to customers list
      setCustomers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))

      // Select the new customer
      updateField('customer_id', data.id)

      // Close modal and reset form
      setShowCustomerModal(false)
      setNewCustomer({ name: '', phone: '', email: '', address: '' })
    } catch (error: any) {
      console.error('Error creating customer:', error)
      alert('Failed to create customer: ' + error.message)
    } finally {
      setSavingCustomer(false)
    }
  }

  // Auto-set quote valid until date when quote date changes
  useEffect(() => {
    if (formData.quote_date && !formData.quote_valid_until && settings?.default_quote_validity_days) {
      const quoteDate = new Date(formData.quote_date)
      quoteDate.setDate(quoteDate.getDate() + settings.default_quote_validity_days)
      updateField('quote_valid_until', quoteDate.toISOString().split('T')[0])
    }
  }, [formData.quote_date])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="pb-24">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/jobs')} className="text-2xl">
          ←
        </button>
        <h2 className="text-2xl font-bold">
          {isEditing ? 'Edit Job' : 'New Job'}
        </h2>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-100 text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <section className="card">
          <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Customer *</label>
              <select
                className="input"
                value={formData.customer_id}
                onChange={(e) => handleCustomerSelectChange(e.target.value)}
                required
              >
                <option value="">Select a customer</option>
                <option value="CREATE_NEW" className="font-semibold">
                  + Create New Customer
                </option>
                <option disabled>──────────</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Job Title *</label>
              <input
                type="text"
                className="input"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                required
                placeholder="e.g., Kitchen Renovation"
              />
            </div>

            <div>
              <label className="label">Description (appears on quote)</label>
              <textarea
                className="input"
                rows={3}
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Brief description of the work..."
              />
            </div>

            <div>
              <label className="label">Internal Notes (private)</label>
              <textarea
                className="input"
                rows={3}
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Your private notes about this job..."
              />
            </div>

            <div>
              <label className="label">Job Address</label>
              <textarea
                className="input"
                rows={2}
                value={formData.job_address}
                onChange={(e) => updateField('job_address', e.target.value)}
                placeholder="Where is this job taking place?"
              />
            </div>

            <div>
              <label className="label">Status</label>
              <select
                className="input"
                value={formData.status}
                onChange={(e) => updateField('status', e.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="quoting">Quoting</option>
                <option value="quoted">Quoted</option>
                <option value="accepted">Accepted</option>
                <option value="in_progress">In Progress</option>
                <option value="complete">Complete</option>
                <option value="invoiced">Invoiced</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
        </section>

        {/* Dates */}
        <section className="card">
          <h3 className="text-lg font-semibold mb-4">Dates</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Quote Date</label>
              <input
                type="date"
                className="input"
                value={formData.quote_date}
                onChange={(e) => updateField('quote_date', e.target.value)}
              />
            </div>

            <div>
              <label className="label">Valid Until</label>
              <input
                type="date"
                className="input"
                value={formData.quote_valid_until}
                onChange={(e) => updateField('quote_valid_until', e.target.value)}
              />
            </div>

            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                className="input"
                value={formData.start_date}
                onChange={(e) => updateField('start_date', e.target.value)}
              />
            </div>

            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                className="input"
                value={formData.end_date}
                onChange={(e) => updateField('end_date', e.target.value)}
              />
            </div>

            <div>
              <label className="label">Invoice Date</label>
              <input
                type="date"
                className="input"
                value={formData.invoice_date}
                onChange={(e) => updateField('invoice_date', e.target.value)}
              />
            </div>

            <div>
              <label className="label">Paid Date</label>
              <input
                type="date"
                className="input"
                value={formData.paid_date}
                onChange={(e) => updateField('paid_date', e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Materials */}
        <section className="card">
          <h3 className="text-lg font-semibold mb-4">Materials</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Materials Cost (£)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={formData.materials_cost}
                onChange={(e) => updateField('materials_cost', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="label">Materials Notes</label>
              <textarea
                className="input"
                rows={3}
                value={formData.materials_notes}
                onChange={(e) => updateField('materials_notes', e.target.value)}
                placeholder="List of materials needed..."
              />
            </div>
          </div>
        </section>

        {/* Labour */}
        <section className="card">
          <h3 className="text-lg font-semibold mb-4">Labour</h3>
          <div className="space-y-4">
            {/* Labour Type Toggle */}
            <div>
              <label className="label">Pricing Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateField('labour_type', 'days')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    formData.labour_type === 'days'
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Days-Based
                </button>
                <button
                  type="button"
                  onClick={() => updateField('labour_type', 'fixed')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    formData.labour_type === 'fixed'
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Fixed Price
                </button>
              </div>
            </div>

            {/* Days-Based Fields */}
            {formData.labour_type === 'days' ? (
              <>
                <div>
                  <label className="label">Days Required</label>
                  <input
                    type="number"
                    step="0.5"
                    className="input"
                    value={formData.labour_days}
                    onChange={(e) => updateField('labour_days', e.target.value)}
                    placeholder="0.0"
                  />
                </div>

                <div>
                  <label className="label">Day Rate (£)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={formData.labour_day_rate}
                    onChange={(e) => updateField('labour_day_rate', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </>
            ) : (
              /* Fixed Price Field */
              <div>
                <label className="label">Fixed Labour Cost (£)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.labour_fixed_cost}
                  onChange={(e) => updateField('labour_fixed_cost', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            )}

            {labourTotal > 0 && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Labour Total</div>
                <div className="text-lg font-semibold">
                  £{labourTotal.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Other Costs */}
        <section className="card">
          <h3 className="text-lg font-semibold mb-4">Other Costs</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Other Costs (£)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={formData.other_costs}
                onChange={(e) => updateField('other_costs', e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                className="input"
                rows={2}
                value={formData.other_costs_notes}
                onChange={(e) => updateField('other_costs_notes', e.target.value)}
                placeholder="Describe other costs..."
              />
            </div>
          </div>
        </section>

        {/* Totals */}
        <section className="card bg-gray-50">
          <h3 className="text-lg font-semibold mb-4">Total</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Materials:</span>
              <span>£{materialsTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Labour:</span>
              <span>£{labourTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Other:</span>
              <span>£{otherTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">£{subtotal.toFixed(2)}</span>
            </div>
            {settings?.vat_registered && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">VAT (20%):</span>
                <span>£{vatAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg pt-2 border-t">
              <span className="font-semibold">Total:</span>
              <span className="font-bold text-green-600">
                £{total.toFixed(2)}
              </span>
            </div>
          </div>
        </section>

        {/* Submit Buttons */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-4 flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/jobs')}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary flex-1"
            disabled={saving}
          >
            {saving ? 'Saving...' : isEditing ? 'Update Job' : 'Create Job'}
          </button>
        </div>
      </form>

      {/* Quick Add Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">Add New Customer</h3>

            <div className="space-y-4">
              <div>
                <label className="label">Name *</label>
                <input
                  type="text"
                  className="input"
                  value={newCustomer.name}
                  onChange={(e) =>
                    setNewCustomer(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Customer name"
                  autoFocus
                />
              </div>

              <div>
                <label className="label">Phone</label>
                <input
                  type="tel"
                  className="input"
                  value={newCustomer.phone}
                  onChange={(e) =>
                    setNewCustomer(prev => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="07123 456789"
                />
              </div>

              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={newCustomer.email}
                  onChange={(e) =>
                    setNewCustomer(prev => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="customer@email.com"
                />
              </div>

              <div>
                <label className="label">Address</label>
                <textarea
                  className="input"
                  rows={3}
                  value={newCustomer.address}
                  onChange={(e) =>
                    setNewCustomer(prev => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="Customer address"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowCustomerModal(false)
                  setNewCustomer({ name: '', phone: '', email: '', address: '' })
                }}
                className="btn-secondary flex-1"
                disabled={savingCustomer}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCustomer}
                className="btn-primary flex-1"
                disabled={savingCustomer || !newCustomer.name}
              >
                {savingCustomer ? 'Creating...' : 'Create Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
