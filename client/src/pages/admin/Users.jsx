import React, { useState, useEffect } from 'react';
import { userService } from '../../services/adminService';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { UserPlus, Search, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '',
    role: 'student',
    status: 'active',
  });

  // Confirm Delete Dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await userService.getUsers({ page, search, role: roleFilter, limit: 10 });
      setUsers(res.data.users);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search, roleFilter]);

  const handleOpenModal = (user = null) => {
    if (user) {
      setSelectedUser(user);
      setFormData({
        full_name: user.full_name,
        username: user.username,
        email: user.email,
        password: '',
        role: user.role,
        status: user.status,
      });
    } else {
      setSelectedUser(null);
      setFormData({
        full_name: '',
        username: '',
        email: '',
        password: '',
        role: 'student',
        status: 'active',
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedUser) {
        await userService.updateUser(selectedUser.id, formData);
        toast.success('User updated successfully');
      } else {
        await userService.createUser(formData);
        toast.success('User created successfully');
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Operation failed');
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    try {
      await userService.deleteUser(userToDelete.id);
      toast.success('User deactivated successfully');
      setConfirmOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Deactivation failed');
    }
  };

  const columns = [
    {
      header: 'Full Name',
      cell: (row) => (
        <div>
          <p className="font-semibold text-slate-100">{row.full_name}</p>
          <p className="text-xs text-slate-400">@{row.username}</p>
        </div>
      ),
    },
    { header: 'Email', accessor: 'email' },
    {
      header: 'Role',
      cell: (row) => (
        <Badge
          variant={
            row.role === 'admin' ? 'purple' : row.role === 'teacher' ? 'success' : 'info'
          }
        >
          {row.role}
        </Badge>
      ),
    },
    {
      header: 'Status',
      cell: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : 'danger'}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleOpenModal(row)}>
            <Edit2 className="w-4 h-4 text-indigo-400" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setUserToDelete(row);
              setConfirmOpen(true);
            }}
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">User Management</h1>
          <p className="text-sm text-slate-400">Create, edit, and manage system accounts</p>
        </div>
        <Button variant="primary" icon={UserPlus} onClick={() => handleOpenModal()}>
          Add New User
        </Button>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search by name, username or email..."
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={[
              { label: 'All Roles', value: '' },
              { label: 'Admin', value: 'admin' },
              { label: 'Teacher', value: 'teacher' },
              { label: 'Student', value: 'student' },
            ]}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            placeholder=""
          />
        </div>
      </div>

      {/* Users Table */}
      <Table columns={columns} data={users} loading={loading} />

      <Pagination
        page={page}
        pages={pagination.pages || 1}
        total={pagination.total || 0}
        limit={pagination.limit || 10}
        onPageChange={setPage}
      />

      {/* User Form Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedUser ? 'Edit User Account' : 'Create User Account'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
          />
          <Input
            label="Username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
          />
          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <Input
            label={selectedUser ? 'New Password (Leave blank to keep unchanged)' : 'Password'}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required={!selectedUser}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Role"
              options={[
                { label: 'Student', value: 'student' },
                { label: 'Teacher', value: 'teacher' },
                { label: 'Admin', value: 'admin' },
              ]}
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            />
            <Select
              label="Status"
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ]}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {selectedUser ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Deactivation */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Deactivate Account"
        message={`Are you sure you want to deactivate account for ${userToDelete?.full_name}?`}
      />
    </div>
  );
};
