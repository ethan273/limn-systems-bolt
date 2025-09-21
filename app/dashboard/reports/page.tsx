'use client'
 

import { useState } from 'react'
import { toast } from '@/components/ui/use-toast'
import { safeGet } from '@/lib/utils/bulk-type-fixes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'
import { Download, FileText, TrendingUp, DollarSign, Package } from 'lucide-react'
import { DateRange } from 'react-day-picker'
import { addDays, format } from 'date-fns'
import { safeFormatString } from '@/lib/utils/string-helpers'

export default function ReportsPage() {
  const [loading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>({
    from: addDays(new Date(), -30),
    to: new Date()
  })
  const [reportType, setReportType] = useState('sales')
  const [reportData] = useState<{
    sales: unknown[]
    production: unknown[]
    customers: unknown[]
    summary: Record<string, unknown>
  }>({
    sales: [],
    production: [],
    customers: [],
    summary: {}
  })



  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  const generateCustomReport = () => {
    toast.success('Custom report generation initiated! This will be available in the exports section.')
    // In production, this would trigger a custom report generation based on selected metrics
  }

  const scheduleReport = () => {
    toast.info('Report scheduling feature coming soon! You will be able to set up automated reports.')
  }

  const exportReport = () => {
    const reportContent = {
      type: reportType,
      dateRange: {
        from: dateRange.from?.toISOString(),
        to: dateRange.to?.toISOString()
      },
      data: reportData,
      generated: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(reportContent, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${reportType}-${format(new Date(), 'yyyy-MM-dd')}.json`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={scheduleReport}>
            <FileText className="w-4 h-4 mr-2" />
            Schedule Report
          </Button>
          <Button onClick={exportReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <DatePickerWithRange
          date={dateRange}
          onDateChange={(date) => setDateRange(date || { from: new Date(), to: new Date() })}
        />
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sales">Sales Report</SelectItem>
            <SelectItem value="production">Production Report</SelectItem>
            <SelectItem value="customers">Customer Report</SelectItem>
            <SelectItem value="financial">Financial Summary</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${reportData.summary.totalRevenue?.toLocaleString() || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="w-4 h-4" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {safeGet(reportData, ['summary', 'totalOrders']) ? String(safeGet(reportData, ['summary', 'totalOrders'])) : '0'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Avg Order Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Number(reportData.summary.avgOrderValue || 0).toFixed(0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Production Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {safeGet(reportData, ['summary', 'totalProduction']) ? String(safeGet(reportData, ['summary', 'totalProduction'])) : '0'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Sales Trend</TabsTrigger>
          <TabsTrigger value="production">Production Status</TabsTrigger>
          <TabsTrigger value="customers">Top Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Sales Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={reportData.sales}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: unknown) => `$${value}`} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#8884d8" 
                    name="Sales"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="production">
          <Card>
            <CardHeader>
              <CardTitle>Production Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={reportData.production}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${safeFormatString(name, 'unknown')} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(reportData.production || []).map((entry: unknown, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle>Top Customers by Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={reportData.customers}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="orders" fill="#8884d8" name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Custom Report Builder */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Custom Report Builder</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-slate-500">
              Build custom reports by selecting metrics and dimensions
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Metrics</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select metrics" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="orders">Order Count</SelectItem>
                    <SelectItem value="customers">Customer Count</SelectItem>
                    <SelectItem value="production">Production Volume</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Group By</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select dimension" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={generateCustomReport}>Generate Custom Report</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}