import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Job, Customer } from '@/types/database'

type JobWithCustomer = Job & { customer: Customer }

export default function Home() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [recentJobs, setRecentJobs] = useState<JobWithCustomer[]>([])
  const [stats, setStats] = useState({
    activeJobs: 0,
    outstandingQuotes: 0,
    unpaidInvoices: 0,
    totalOutstanding: 0,
  })

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load all jobs with customer info
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select(`
          *,
          customer:customers(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Set recent jobs (last 5)
      setRecentJobs(jobs?.slice(0, 5) || [])

      // Calculate stats
      const activeJobs = jobs?.filter(j =>
        ['in_progress', 'accepted'].includes(j.status)
      ).length || 0

      const outstandingQuotes = jobs?.filter(j =>
        ['quoting', 'quoted'].includes(j.status)
      ).length || 0

      const unpaidInvoices = jobs?.filter(j =>
        j.status === 'invoiced'
      ).length || 0

      const totalOutstanding = jobs
        ?.filter(j => j.status === 'invoiced')
        .reduce((sum, j) => sum + (j.total || 0), 0) || 0

      setStats({
        activeJobs,
        outstandingQuotes,
        unpaidInvoices,
        totalOutstanding,
      })
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
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

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Dashboard</h2>
        <p className="text-gray-600">Welcome back</p>
      </div>

      {/* Primary Action */}
      <Link
        to="/jobs/new"
        className="block w-full bg-black text-white text-center py-4 rounded-lg font-medium text-lg shadow-lg active:bg-gray-800"
      >
        + New Job
      </Link>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Active Jobs</div>
          <div className="text-2xl font-bold">{stats.activeJobs}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Outstanding Quotes</div>
          <div className="text-2xl font-bold">{stats.outstandingQuotes}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Unpaid Invoices</div>
          <div className="text-2xl font-bold">{stats.unpaidInvoices}</div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-600 mb-1">Total Outstanding</div>
          <div className="text-2xl font-bold">£{stats.totalOutstanding.toFixed(2)}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="font-semibold mb-3">Quick Actions</h3>
        <div className="space-y-2">
          <Link
            to="/jobs"
            className="block card hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">View All Jobs</span>
              <span className="text-gray-400">→</span>
            </div>
          </Link>
          <Link
            to="/customers"
            className="block card hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">View Customers</span>
              <span className="text-gray-400">→</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Jobs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Recent Jobs</h3>
          {recentJobs.length > 0 && (
            <Link to="/jobs" className="text-sm text-gray-600">
              View all →
            </Link>
          )}
        </div>
        {recentJobs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No jobs yet. Create your first job to get started!
          </div>
        ) : (
          <div className="space-y-3">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => navigate(`/jobs/${job.id}`)}
                className="card hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-semibold">{job.title}</div>
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
                {job.total && (
                  <div className="text-sm font-semibold text-green-600">
                    £{job.total.toFixed(2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
