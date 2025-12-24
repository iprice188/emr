import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Customer, Job } from '@/types/database'

export default function CustomerDetail() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (id) {
      loadCustomerAndJobs()
    }
  }, [id])

  const loadCustomerAndJobs = async () => {
    try {
      // Load customer
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()

      if (customerError) throw customerError
      setCustomer(customerData)

      // Load jobs for this customer
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })

      if (jobsError) throw jobsError
      setJobs(jobsData || [])
    } catch (error) {
      console.error('Error loading customer:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)

      if (error) throw error
      navigate('/customers')
    } catch (error: any) {
      console.error('Error deleting customer:', error)
      alert('Failed to delete customer: ' + error.message)
    } finally {
      setDeleting(false)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Customer not found</p>
        <button onClick={() => navigate('/customers')} className="btn-primary">
          Back to Customers
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/customers')} className="text-2xl">
          ←
        </button>
        <h2 className="text-2xl font-bold flex-1">{customer.name}</h2>
        <button
          onClick={() => navigate(`/customers/${id}/edit`)}
          className="btn-secondary"
        >
          Edit
        </button>
      </div>

      {/* Customer Details */}
      <div className="card mb-6">
        <h3 className="font-semibold text-lg mb-3">Contact Information</h3>
        <div className="space-y-2 text-sm">
          {customer.phone && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">📱 Phone:</span>
              <a href={`tel:${customer.phone}`} className="text-blue-600">
                {customer.phone}
              </a>
            </div>
          )}
          {customer.email && (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">✉️ Email:</span>
              <a href={`mailto:${customer.email}`} className="text-blue-600">
                {customer.email}
              </a>
            </div>
          )}
          {customer.address && (
            <div className="flex items-start gap-2">
              <span className="text-gray-500">📍 Address:</span>
              <span className="whitespace-pre-line">{customer.address}</span>
            </div>
          )}
          {customer.notes && (
            <div className="mt-4 pt-4 border-t">
              <span className="text-gray-500 block mb-1">Notes:</span>
              <p className="whitespace-pre-line">{customer.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Jobs */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Jobs ({jobs.length})</h3>
          <button
            onClick={() => navigate(`/jobs/new?customer=${id}`)}
            className="btn-primary text-sm"
          >
            + New Job
          </button>
        </div>

        {jobs.length === 0 ? (
          <div className="card text-center text-gray-500">
            No jobs for this customer yet
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                onClick={() => navigate(`/jobs/${job.id}`)}
                className="card hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-semibold">{job.title}</div>
                    {job.description && (
                      <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {job.description}
                      </div>
                    )}
                    {job.total && (
                      <div className="text-sm font-semibold text-green-600 mt-2">
                        £{job.total.toFixed(2)}
                      </div>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(job.status)}`}
                  >
                    {job.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Button */}
      <div className="border-t pt-6">
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-3 px-4 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100"
          >
            Delete Customer
          </button>
        ) : (
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-red-800 mb-3">
              Are you sure? This will delete the customer and all their jobs.
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
