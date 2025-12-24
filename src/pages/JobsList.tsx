import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Job, Customer } from '@/types/database'

type JobWithCustomer = Job & { customer: Customer }

export default function JobsList() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<JobWithCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    loadJobs()
  }, [])

  const loadJobs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setJobs(data || [])
    } catch (error) {
      console.error('Error loading jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredJobs = jobs.filter(job =>
    statusFilter === 'all' || job.status === statusFilter
  )

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

  const statusCounts = jobs.reduce((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading jobs...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Jobs</h2>
        <button
          onClick={() => navigate('/jobs/new')}
          className="btn-primary"
        >
          + New Job
        </button>
      </div>

      {/* Status Filter */}
      <div className="mb-4 overflow-x-auto">
        <div className="flex gap-2 min-w-max pb-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({jobs.length})
          </button>
          {['draft', 'quoting', 'quoted', 'accepted', 'in_progress', 'complete', 'invoiced', 'paid'].map(status => (
            statusCounts[status] > 0 && (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-black text-white'
                    : getStatusColor(status)
                }`}
              >
                {status.replace('_', ' ')} ({statusCounts[status]})
              </button>
            )
          ))}
        </div>
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            {statusFilter === 'all' ? 'No jobs yet' : `No ${statusFilter} jobs`}
          </p>
          {statusFilter === 'all' && (
            <button
              onClick={() => navigate('/jobs/new')}
              className="btn-primary"
            >
              Create Your First Job
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              onClick={() => navigate(`/jobs/${job.id}`)}
              className="card hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="font-semibold text-lg">{job.title}</div>
                  <div className="text-sm text-gray-600">
                    {job.customer?.name}
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getStatusColor(job.status)}`}
                >
                  {job.status.replace('_', ' ')}
                </span>
              </div>

              {job.description && (
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {job.description}
                </p>
              )}

              <div className="flex items-center justify-between text-sm">
                <div className="text-gray-500">
                  {job.quote_date && `Quote: ${new Date(job.quote_date).toLocaleDateString()}`}
                  {job.start_date && ` • Start: ${new Date(job.start_date).toLocaleDateString()}`}
                </div>
                {job.total && (
                  <div className="font-semibold text-green-600">
                    £{job.total.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
