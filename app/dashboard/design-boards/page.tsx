'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/page-header'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Paintbrush,
  Plus,
  Settings,
  Users,
  Maximize2,
  Mail,
  Phone,
  ToggleLeft,
  ToggleRight,
  Trash2
} from 'lucide-react'

interface DesignBoard {
  id: string
  name: string
  description: string
  status: 'active' | 'archived' | 'draft'
  created_at: string
  updated_at: string
  created_by: string
  participants_count: number
  is_public?: boolean
  thumbnail?: string
}

interface BoardParticipant {
  id: string
  email: string
  access_granted: boolean
  invited_at: string
  last_accessed?: string
  role: 'viewer' | 'editor' | 'admin'
}

export default function DesignBoardsPage() {
  const [boards, setBoards] = useState<DesignBoard[]>([])
  const [selectedBoard, setSelectedBoard] = useState<DesignBoard | null>(null)
  const [participants, setParticipants] = useState<BoardParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)

  // Create form state
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    status: 'active' | 'archived' | 'draft';
  }>({
    name: '',
    description: '',
    status: 'active'
  })

  // Invite form state
  const [inviteData, setInviteData] = useState<{
    email: string;
    role: 'viewer' | 'editor' | 'admin';
    send_via: 'email' | 'sms';
  }>({
    email: '',
    role: 'viewer',
    send_via: 'email'
  })

  useEffect(() => {
    fetchBoards()
  }, [])

  const fetchBoards = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/design-boards')
      if (!response.ok) throw new Error('Failed to fetch design boards')

      const data = await response.json()
      setBoards(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load design boards')
    } finally {
      setLoading(false)
    }
  }

  const fetchParticipants = async (boardId: string) => {
    try {
      const response = await fetch(`/api/design-boards/${boardId}/participants`)
      if (!response.ok) throw new Error('Failed to fetch participants')

      const data = await response.json()
      setParticipants(data.data || [])
    } catch (err) {
      console.error('Error fetching participants:', err)
      setError(err instanceof Error ? err.message : 'Failed to load participants')
    }
  }

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/design-boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Failed to create board')

      const result = await response.json()
      const newBoard = result.data

      // Reset form and close modal
      setFormData({ name: '', description: '', status: 'active' })
      setShowCreateForm(false)

      // Refresh boards list
      await fetchBoards()

      // Automatically open the new board in fullscreen
      if (newBoard?.id) {
        const muralBoardUrl = `/mural/${newBoard.id}`
        window.open(muralBoardUrl, '_blank', 'fullscreen=yes')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create board')
    }
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!selectedBoard) return

      const response = await fetch(`/api/design-boards/${selectedBoard.id}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData)
      })

      if (!response.ok) throw new Error('Failed to invite user')

      // Reset form
      setInviteData({ email: '', role: 'viewer', send_via: 'email' })
      setShowInviteForm(false)

      // Refresh participants
      await fetchParticipants(selectedBoard.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite user')
    }
  }

  const toggleUserAccess = async (participantId: string, currentAccess: boolean) => {
    try {
      if (!selectedBoard) return

      const response = await fetch(`/api/design-boards/${selectedBoard.id}/participants/${participantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_granted: !currentAccess })
      })

      if (!response.ok) throw new Error('Failed to update user access')

      // Refresh participants
      await fetchParticipants(selectedBoard.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user access')
    }
  }

  const deleteUser = async (participantId: string) => {
    try {
      if (!selectedBoard) return

      const response = await fetch(`/api/design-boards/${selectedBoard.id}/participants/${participantId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to remove user')

      // Refresh participants
      await fetchParticipants(selectedBoard.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove user')
    }
  }

  const openBoardFullscreen = (board: DesignBoard) => {
    // Open our existing mural board using the correct route structure
    const muralBoardUrl = `/mural/${board.id}`
    window.open(muralBoardUrl, '_blank', 'fullscreen=yes')
  }

  const openManageModal = async (board: DesignBoard) => {
    setSelectedBoard(board)
    await fetchParticipants(board.id)
    setShowManageModal(true)
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      draft: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-gray-100 text-slate-900'
    }
    return colors[status as keyof typeof colors] || colors.active
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Design Boards"
        description="Manage collaborative design boards and user access"
        actions={
          <Button onClick={() => setShowCreateForm(true)} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-2" />
            Create Board
          </Button>
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800 text-sm">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Boards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {boards.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Active Boards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {boards.filter(b => b.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Participants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {boards.reduce((sum, b) => sum + b.participants_count, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Draft Boards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {boards.filter(b => b.status === 'draft').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Boards Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paintbrush className="h-5 w-5" />
            Design Boards ({boards.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div>Loading design boards...</div>
            </div>
          ) : boards.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No design boards found. Create your first board to get started!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Board Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {boards.map((board) => (
                  <TableRow key={board.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{board.name}</div>
                        {board.description && (
                          <div className="text-sm text-slate-500 mt-1">{board.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(board.status)}>
                        {board.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{board.created_by}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-slate-500" />
                        {board.participants_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(board.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openBoardFullscreen(board)}
                          title="Open in Fullscreen"
                        >
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openManageModal(board)}
                          title="Manage Board"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Board Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Create New Design Board</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateBoard} className="space-y-4">
                <div>
                  <Label htmlFor="name">Board Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Brief description of the board purpose..."
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: string) => setFormData({...formData, status: value as 'active' | 'archived' | 'draft'})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                    Create Board
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Manage Board Modal */}
      {showManageModal && selectedBoard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Manage Board: {selectedBoard.name}</CardTitle>
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => setShowInviteForm(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
                <Button
                  variant="outline"
                  onClick={() => openBoardFullscreen(selectedBoard)}
                >
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Open Board
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Board Info */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Board Information</h3>
                  <div className="bg-gray-50 rounded-md p-4 space-y-2">
                    <div><strong>Description:</strong> {selectedBoard.description}</div>
                    <div><strong>Status:</strong> <Badge className={getStatusBadge(selectedBoard.status)}>{selectedBoard.status}</Badge></div>
                    <div><strong>Created:</strong> {new Date(selectedBoard.created_at).toLocaleDateString()}</div>
                    <div><strong>Created By:</strong> {selectedBoard.created_by}</div>
                  </div>
                </div>

                {/* Participants */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Participants ({participants.length})</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Access</TableHead>
                        <TableHead>Invited</TableHead>
                        <TableHead>Last Accessed</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participants.map((participant) => (
                        <TableRow key={participant.id}>
                          <TableCell>{participant.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{participant.role}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={participant.access_granted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {participant.access_granted ? 'Granted' : 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(participant.invited_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {participant.last_accessed
                              ? new Date(participant.last_accessed).toLocaleDateString()
                              : 'Never'
                            }
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleUserAccess(participant.id, participant.access_granted)}
                                title={participant.access_granted ? 'Revoke Access' : 'Grant Access'}
                              >
                                {participant.access_granted ? (
                                  <ToggleRight className="h-4 w-4 text-green-600" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4 text-slate-500" />
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                title="Remove User"
                                onClick={() => deleteUser(participant.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Invite Form */}
                {showInviteForm && (
                  <div className="border rounded-md p-4 bg-blue-50">
                    <h4 className="font-medium mb-3">Invite New User</h4>
                    <form onSubmit={handleInviteUser} className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor="invite-email">Email Address *</Label>
                          <Input
                            id="invite-email"
                            type="email"
                            value={inviteData.email}
                            onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="invite-role">Role</Label>
                          <Select
                            value={inviteData.role}
                            onValueChange={(value: string) => setInviteData({...inviteData, role: value as 'viewer' | 'editor' | 'admin'})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewer">Viewer</SelectItem>
                              <SelectItem value="editor">Editor</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="invite-method">Send Via</Label>
                          <Select
                            value={inviteData.send_via}
                            onValueChange={(value: string) => setInviteData({...inviteData, send_via: value as 'email' | 'sms'})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="email">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4" />
                                  Email
                                </div>
                              </SelectItem>
                              <SelectItem value="sms">
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4" />
                                  SMS
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Send Invite
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowInviteForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowManageModal(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}