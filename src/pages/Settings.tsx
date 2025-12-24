import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Settings as SettingsType } from '@/types/database'

export default function Settings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [settings, setSettings] = useState<Partial<SettingsType>>({
    business_name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    default_day_rate: null,
    vat_registered: false,
    vat_number: '',
    bank_details: '',
    quote_message_template: '',
    invoice_message_template: '',
    default_quote_validity_days: 30,
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      if (data) {
        setSettings(data)
      }
    } catch (error: any) {
      console.error('Error loading settings:', error)
      setMessage({ type: 'error', text: 'Failed to load settings' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('settings')
        .upsert({
          ...settings,
          user_id: user.id,
        })

      if (error) throw error

      setMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch (error: any) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const updateField = (field: keyof SettingsType, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        {/* Business Details */}
        <section className="card">
          <h3 className="text-xl font-semibold mb-4">Business Details</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Business Name</label>
              <input
                type="text"
                className="input"
                value={settings.business_name || ''}
                onChange={(e) => updateField('business_name', e.target.value)}
                placeholder="e.g., EMR Joinery"
              />
            </div>

            <div>
              <label className="label">Contact Name</label>
              <input
                type="text"
                className="input"
                value={settings.contact_name || ''}
                onChange={(e) => updateField('contact_name', e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="label">Phone</label>
              <input
                type="tel"
                className="input"
                value={settings.phone || ''}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="07123 456789"
              />
            </div>

            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={settings.email || ''}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="label">Address</label>
              <textarea
                className="input"
                rows={3}
                value={settings.address || ''}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="Your business address"
              />
            </div>
          </div>
        </section>

        {/* Financial Settings */}
        <section className="card">
          <h3 className="text-xl font-semibold mb-4">Financial Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Default Day Rate (£)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={settings.default_day_rate || ''}
                onChange={(e) => updateField('default_day_rate', e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="250.00"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="vat_registered"
                className="w-5 h-5 rounded border-gray-300"
                checked={settings.vat_registered || false}
                onChange={(e) => updateField('vat_registered', e.target.checked)}
              />
              <label htmlFor="vat_registered" className="text-sm font-medium">
                VAT Registered
              </label>
            </div>

            {settings.vat_registered && (
              <div>
                <label className="label">VAT Number</label>
                <input
                  type="text"
                  className="input"
                  value={settings.vat_number || ''}
                  onChange={(e) => updateField('vat_number', e.target.value)}
                  placeholder="GB123456789"
                />
              </div>
            )}

            <div>
              <label className="label">Bank Details</label>
              <textarea
                className="input"
                rows={3}
                value={settings.bank_details || ''}
                onChange={(e) => updateField('bank_details', e.target.value)}
                placeholder="Sort Code: 12-34-56&#10;Account: 12345678&#10;Name: Your Business Name"
              />
              <p className="text-xs text-gray-500 mt-1">
                These details will appear on your invoices
              </p>
            </div>
          </div>
        </section>

        {/* Quote Settings */}
        <section className="card">
          <h3 className="text-xl font-semibold mb-4">Quote Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Default Quote Validity (days)</label>
              <input
                type="number"
                className="input"
                value={settings.default_quote_validity_days || 30}
                onChange={(e) => updateField('default_quote_validity_days', parseInt(e.target.value))}
              />
            </div>

            <div>
              <label className="label">Quote Message Template</label>
              <textarea
                className="input"
                rows={6}
                value={settings.quote_message_template || ''}
                onChange={(e) => updateField('quote_message_template', e.target.value)}
                placeholder="Hi {customer_name},&#10;&#10;See attached your quote for {job_title}.&#10;&#10;Valid until {expiry_date}.&#10;&#10;Let me know if you have any questions.&#10;&#10;Thanks,&#10;{business_name}"
              />
              <p className="text-xs text-gray-500 mt-1">
                Available variables: {'{customer_name}'}, {'{job_title}'}, {'{expiry_date}'}, {'{business_name}'}
              </p>
            </div>
          </div>
        </section>

        {/* Invoice Settings */}
        <section className="card">
          <h3 className="text-xl font-semibold mb-4">Invoice Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Invoice Message Template</label>
              <textarea
                className="input"
                rows={8}
                value={settings.invoice_message_template || ''}
                onChange={(e) => updateField('invoice_message_template', e.target.value)}
                placeholder="Hi {customer_name},&#10;&#10;Please find attached invoice #{invoice_number} for {job_title}.&#10;&#10;Total: £{total}&#10;&#10;Payment details:&#10;{bank_details}&#10;&#10;Thanks,&#10;{business_name}"
              />
              <p className="text-xs text-gray-500 mt-1">
                Available variables: {'{customer_name}'}, {'{job_title}'}, {'{invoice_number}'}, {'{total}'}, {'{bank_details}'}, {'{business_name}'}
              </p>
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="sticky bottom-20 bg-white border-t border-gray-200 p-4 -mx-4">
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
