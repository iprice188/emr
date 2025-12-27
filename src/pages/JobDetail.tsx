import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Job, Customer, Settings } from '@/types/database'
import { generateQuotePDF, generateInvoicePDF, downloadPDF } from '@/lib/pdfGenerator'

type JobWithCustomer = Job & { customer: Customer }

export default function JobDetail() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [loading, setLoading] = useState(true)
  const [job, setJob] = useState<JobWithCustomer | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)

  useEffect(() => {
    if (id) {
      loadJob()
    }
  }, [id])

  const loadJob = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load job with customer
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      setJob(data)

      // Load settings
      const { data: settingsData } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setSettings(settingsData)
    } catch (error) {
      console.error('Error loading job:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateQuote = async () => {
    if (!job || !settings) return
    setGeneratingPDF(true)

    try {
      // Set quote date and valid until if not already set
      let updatedJob = job
      if (!job.quote_date || ['draft', 'quoting'].includes(job.status)) {
        const quoteDate = job.quote_date || new Date().toISOString()
        const validUntil = new Date()
        validUntil.setDate(validUntil.getDate() + 30)

        const updates: Partial<Job> = {
          quote_date: quoteDate,
          quote_valid_until: validUntil.toISOString(),
        }

        // Update status to quoted if currently draft or quoting
        if (['draft', 'quoting'].includes(job.status)) {
          updates.status = 'quoted'
        }

        const { data, error } = await supabase
          .from('jobs')
          .update(updates)
          .eq('id', job.id)
          .select(`
            *,
            customer:customers(*)
          `)
          .single()

        if (error) throw error
        if (data) {
          updatedJob = data as JobWithCustomer
          setJob(updatedJob)
        }
      }

      const pdf = await generateQuotePDF(updatedJob, settings)
      downloadPDF(pdf, `Quote-${updatedJob.invoice_number || updatedJob.id}-${updatedJob.customer.name}.pdf`)
    } catch (error) {
      console.error('Error generating quote:', error)
      alert('Failed to generate quote PDF')
    } finally {
      setGeneratingPDF(false)
    }
  }

  const handleGenerateInvoice = async () => {
    if (!job || !settings) return
    setGeneratingPDF(true)

    try {
      const pdf = await generateInvoicePDF(job, settings)
      downloadPDF(pdf, `Invoice-${job.invoice_number || job.id}-${job.customer.name}.pdf`)
    } catch (error) {
      console.error('Error generating invoice:', error)
      alert('Failed to generate invoice PDF')
    } finally {
      setGeneratingPDF(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)

    try {
      const { error } = await supabase.from('jobs').delete().eq('id', id)

      if (error) throw error
      navigate('/jobs')
    } catch (error: any) {
      console.error('Error deleting job:', error)
      alert('Failed to delete job: ' + error.message)
    } finally {
      setDeleting(false)
    }
  }

  const handleStatusChange = async (newStatus: Job['status']) => {
    if (!id) return

    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error
      setJob(prev => (prev ? { ...prev, status: newStatus } : null))
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      quoting: 'bg-blue-100 text-blue-700',
      quoted: 'bg-purple-100 text-purple-700',
      accepted: 'bg-green-100 text-green-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      complete: 'bg-teal-100 text-teal-700',
      invoiced: 'bg-orange-100 text-orange-700',
      paid: 'bg-green-100 text-green-700',
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Job not found</p>
        <button onClick={() => navigate('/jobs')} className="btn-primary">
          Back to Jobs
        </button>
      </div>
    )
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/jobs')} className="text-2xl">
          ←
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{job.title}</h2>
          <p className="text-gray-600">{job.customer?.name}</p>
        </div>
        <button
          onClick={() => navigate(`/jobs/${id}/edit`)}
          className="btn-secondary"
        >
          Edit
        </button>
      </div>

      {/* Status Badge */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-gray-600">Status:</span>
          <span
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${getStatusColor(job.status)}`}
          >
            {job.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={handleGenerateQuote}
          className="btn-primary text-sm py-3"
          disabled={generatingPDF || !settings}
        >
          {generatingPDF ? 'Generating...' : '📄 Generate Quote'}
        </button>
        <button
          onClick={handleGenerateInvoice}
          className="btn-primary text-sm py-3"
          disabled={generatingPDF || !settings}
        >
          {generatingPDF ? 'Generating...' : '🧾 Generate Invoice'}
        </button>
      </div>

      {/* Job Info */}
      <div className="card mb-6">
        <h3 className="font-semibold text-lg mb-3">Job Details</h3>
        <div className="space-y-3 text-sm">
          {job.description && (
            <div>
              <div className="text-gray-500 mb-1">Description</div>
              <p className="whitespace-pre-line">{job.description}</p>
            </div>
          )}

          {job.notes && (
            <div>
              <div className="text-gray-500 mb-1">Internal Notes</div>
              <p className="whitespace-pre-line text-gray-700 italic">{job.notes}</p>
            </div>
          )}

          {job.job_address && (
            <div>
              <div className="text-gray-500 mb-1">Job Address</div>
              <p className="whitespace-pre-line">{job.job_address}</p>
            </div>
          )}
        </div>
      </div>

      {/* Dates */}
      <div className="card mb-6">
        <h3 className="font-semibold text-lg mb-3">Dates</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Quote Date</div>
            <div className="font-medium">{formatDate(job.quote_date)}</div>
          </div>
          <div>
            <div className="text-gray-500">Valid Until</div>
            <div className="font-medium">
              {formatDate(job.quote_valid_until)}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Start Date</div>
            <div className="font-medium">{formatDate(job.start_date)}</div>
          </div>
          <div>
            <div className="text-gray-500">End Date</div>
            <div className="font-medium">{formatDate(job.end_date)}</div>
          </div>
          <div>
            <div className="text-gray-500">Invoice Date</div>
            <div className="font-medium">{formatDate(job.invoice_date)}</div>
          </div>
          <div>
            <div className="text-gray-500">Paid Date</div>
            <div className="font-medium">{formatDate(job.paid_date)}</div>
          </div>
        </div>
      </div>

      {/* Materials */}
      {(job.materials_cost || job.materials_notes) && (
        <div className="card mb-6">
          <h3 className="font-semibold text-lg mb-3">Materials</h3>
          <div className="space-y-2 text-sm">
            {job.materials_cost && (
              <div className="flex justify-between">
                <span className="text-gray-600">Cost:</span>
                <span className="font-medium">
                  £{job.materials_cost.toFixed(2)}
                </span>
              </div>
            )}
            {job.materials_notes && (
              <div>
                <div className="text-gray-500 mb-1">Notes:</div>
                <p className="whitespace-pre-line">{job.materials_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Labour */}
      {(job.labour_days || job.labour_day_rate) && (
        <div className="card mb-6">
          <h3 className="font-semibold text-lg mb-3">Labour</h3>
          <div className="space-y-2 text-sm">
            {job.labour_days && (
              <div className="flex justify-between">
                <span className="text-gray-600">Days:</span>
                <span className="font-medium">{job.labour_days}</span>
              </div>
            )}
            {job.labour_day_rate && (
              <div className="flex justify-between">
                <span className="text-gray-600">Day Rate:</span>
                <span className="font-medium">
                  £{job.labour_day_rate.toFixed(2)}
                </span>
              </div>
            )}
            {job.labour_cost && (
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-600">Labour Total:</span>
                <span className="font-semibold">
                  £{job.labour_cost.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Other Costs */}
      {(job.other_costs || job.other_costs_notes) && (
        <div className="card mb-6">
          <h3 className="font-semibold text-lg mb-3">Other Costs</h3>
          <div className="space-y-2 text-sm">
            {job.other_costs && (
              <div className="flex justify-between">
                <span className="text-gray-600">Cost:</span>
                <span className="font-medium">
                  £{job.other_costs.toFixed(2)}
                </span>
              </div>
            )}
            {job.other_costs_notes && (
              <div>
                <div className="text-gray-500 mb-1">Notes:</div>
                <p className="whitespace-pre-line">{job.other_costs_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Financial Summary */}
      <div className="card bg-gray-50 mb-6">
        <h3 className="font-semibold text-lg mb-3">Financial Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Materials:</span>
            <span>£{(job.materials_cost || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Labour:</span>
            <span>£{(job.labour_cost || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Other:</span>
            <span>£{(job.other_costs || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium">
              £{(job.subtotal || 0).toFixed(2)}
            </span>
          </div>
          {job.vat_amount && job.vat_amount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">VAT (20%):</span>
              <span>£{job.vat_amount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg pt-2 border-t font-semibold">
            <span>Total:</span>
            <span className="text-green-600">
              £{(job.total || 0).toFixed(2)}
            </span>
          </div>
          {job.invoice_number && (
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-gray-600">Invoice Number:</span>
              <span className="font-medium">#{job.invoice_number}</span>
            </div>
          )}
        </div>
      </div>

      {/* Status Actions */}
      <div className="card mb-6">
        <h3 className="font-semibold text-lg mb-3">Update Status</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            'draft',
            'quoting',
            'quoted',
            'accepted',
            'in_progress',
            'complete',
            'invoiced',
            'paid',
          ].map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status as Job['status'])}
              className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                job.status === status
                  ? getStatusColor(status)
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              disabled={job.status === status}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Delete Button */}
      <div className="border-t pt-6">
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-3 px-4 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100"
          >
            Delete Job
          </button>
        ) : (
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-red-800 mb-3">
              Are you sure you want to delete this job? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
