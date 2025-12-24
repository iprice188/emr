import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { Customer } from '@/types/database'

export default function CustomersList() {
  const navigate = useNavigate()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Error loading customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading customers...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Customers</h2>
        <button
          onClick={() => navigate('/customers/new')}
          className="btn-primary"
        >
          + Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search customers..."
          className="input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Customers List */}
      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'No customers found' : 'No customers yet'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => navigate('/customers/new')}
              className="btn-primary"
            >
              Add Your First Customer
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              onClick={() => navigate(`/customers/${customer.id}`)}
              className="card hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="font-semibold text-lg">{customer.name}</div>
              {customer.phone && (
                <div className="text-sm text-gray-600 mt-1">
                  📱 {customer.phone}
                </div>
              )}
              {customer.email && (
                <div className="text-sm text-gray-600 mt-1">
                  ✉️ {customer.email}
                </div>
              )}
              {customer.address && (
                <div className="text-sm text-gray-600 mt-1">
                  📍 {customer.address.split('\n')[0]}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
