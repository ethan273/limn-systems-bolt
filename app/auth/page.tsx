'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/ui/logo'
import { Users, Building, ShoppingCart } from 'lucide-react'

export default function AuthPage() {
  const router = useRouter()

  const handleUserTypeSelection = (userType: 'employee' | 'contractor' | 'customer') => {
    switch (userType) {
      case 'employee':
        router.push('/auth/employee')
        break
      case 'contractor':
        router.push('/auth/contractor')
        break
      case 'customer':
        router.push('/auth/customer')
        break
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-lg">
        <div className="bg-white shadow-lg rounded-lg px-8 py-10">
          <div className="mb-8 text-center">
            <div className="mb-6 flex justify-center">
              <Logo width={120} height={52} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">
              Welcome to Limn Systems
            </h1>
            <p className="text-slate-600 mt-2">
              Please select your account type to continue
            </p>
          </div>

          <div className="space-y-4">
            {/* Employee Login */}
            <button
              onClick={() => handleUserTypeSelection('employee')}
              className="w-full p-6 bg-white border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <Building className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Employee Login
                  </h3>
                  <p className="text-sm text-slate-600">
                    Sign in with your @limn.us.com Google account
                  </p>
                </div>
              </div>
            </button>

            {/* Contractor Login */}
            <button
              onClick={() => handleUserTypeSelection('contractor')}
              className="w-full p-6 bg-white border-2 border-slate-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Partner Login
                  </h3>
                  <p className="text-sm text-slate-600">
                    Sign in with your contractor account credentials
                  </p>
                </div>
              </div>
            </button>

            {/* Customer Portal */}
            <button
              onClick={() => handleUserTypeSelection('customer')}
              className="w-full p-6 bg-white border-2 border-slate-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
            >
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                    <ShoppingCart className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Client Portal
                  </h3>
                  <p className="text-sm text-slate-600">
                    Access your project dashboard and orders
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              Need help accessing your account?{' '}
              <a 
                href="mailto:support@limnsystems.com" 
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}