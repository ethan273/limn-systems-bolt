'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Mail, 
  Phone, 
  MessageSquare, 
  ArrowLeft, 
  Send,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

export default function PortalContactPage() {
  const [user, setUser] = useState<{ email?: string; id?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    priority: 'normal'
  })
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user) {
          router.push('/auth')
          return
        }
        
        setUser(session.user)
      } catch (error) {
        console.error('Error checking auth:', error)
        router.push('/auth')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      // In a real implementation, you'd save this to a support_tickets table
      // const supabase = createClient()
      // For now, we'll just show success
      console.log('Support request submitted:', {
        user_id: user?.id,
        email: user?.email,
        subject: formData.subject,
        message: formData.message,
        priority: formData.priority,
        created_at: new Date().toISOString()
      })

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSubmitted(true)
    } catch (error) {
      console.error('Error submitting support request:', error)
      setError('Failed to submit your request. Please try again or contact support directly.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="bg-white shadow-lg rounded-lg px-8 py-10 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Message Sent!
            </h1>
            <p className="text-gray-600 mb-6">
              We&apos;ve received your message and will respond within 24 hours.
            </p>
            <Button
              onClick={() => router.push('/portal')}
              className="w-full bg-[#91bdbd] hover:bg-[#7da9a9] text-white"
            >
              Return to Portal
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#4b4949]">Contact Support</h1>
          <p className="text-gray-700">Get help with your portal or projects</p>
        </div>
        <Button
          variant="ghost"
          onClick={() => router.push('/portal')}
          className="text-[#91bdbd] hover:text-[#7da9a9]"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Portal
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Contact Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-[#4b4949] mb-4">Send us a Message</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              <div className="flex items-start">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="subject" className="block text-sm font-medium text-[#4b4949] mb-1">
                Subject
              </Label>
              <Input
                id="subject"
                type="text"
                placeholder="Brief description of your inquiry"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                className="focus-visible:ring-[#91bdbd]"
                required
                disabled={submitting}
              />
            </div>

            <div>
              <Label htmlFor="priority" className="block text-sm font-medium text-[#4b4949] mb-1">
                Priority
              </Label>
              <select
                id="priority"
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent"
                disabled={submitting}
              >
                <option value="low">Low - General inquiry</option>
                <option value="normal">Normal - Standard support</option>
                <option value="high">High - Urgent issue</option>
                <option value="critical">Critical - Service disruption</option>
              </select>
            </div>

            <div>
              <Label htmlFor="message" className="block text-sm font-medium text-[#4b4949] mb-1">
                Message
              </Label>
              <Textarea
                id="message"
                placeholder="Please describe your question or issue in detail..."
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                className="min-h-[120px] focus-visible:ring-[#91bdbd]"
                required
                disabled={submitting}
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#91bdbd] hover:bg-[#7da9a9] text-white"
            >
              {submitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </div>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Contact Information */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-[#4b4949] mb-4">Other Ways to Reach Us</h2>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-[#91bdbd] rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-[#4b4949]">Email Support</h3>
                  <p className="text-sm text-gray-600 mb-1">General inquiries and support</p>
                  <a 
                    href="mailto:support@limnsystems.com"
                    className="text-[#91bdbd] hover:text-[#7da9a9] font-medium"
                  >
                    support@limnsystems.com
                  </a>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-[#91bdbd] rounded-lg flex items-center justify-center">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-[#4b4949]">Phone Support</h3>
                  <p className="text-sm text-gray-600 mb-1">Monday - Friday, 9 AM - 6 PM EST</p>
                  <a 
                    href="tel:+1-555-0123"
                    className="text-[#91bdbd] hover:text-[#7da9a9] font-medium"
                  >
                    +1 (555) 012-3456
                  </a>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-[#91bdbd] rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-[#4b4949]">Live Chat</h3>
                  <p className="text-sm text-gray-600 mb-1">Available during business hours</p>
                  <p className="text-sm text-gray-500">Coming soon</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Response Times</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Critical issues: Within 2 hours</li>
              <li>• High priority: Within 4 hours</li>
              <li>• Normal inquiries: Within 24 hours</li>
              <li>• General questions: Within 48 hours</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}