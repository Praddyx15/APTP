// src/frontend/components/admin/UserPermissions.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { DataTable, Column } from '../ui/DataTable';
import { User, UserRole, Permission } from '../auth/UserAuth';

// Types
interface Role {
  id: UserRole;
  name: string;
  description: string;
  permissions: Permission[];
}

// Component Props
interface UserPermissionsProps {
  users: User[];
  roles: Role[];
  onUpdateUserRole: (userId: string, roleId: UserRole) => Promise<void>;
  onUpdateUserPermissions: (userId: string, permissions: Permission[]) => Promise<void>;
  onUpdateRolePermissions: (roleId: UserRole, permissions: Permission[]) => Promise<void>;
}

export const UserPermissions: React.FC<UserPermissionsProps> = ({
  users,
  roles,
  onUpdateUserRole,
  onUpdateUserPermissions,
  onUpdateRolePermissions
}) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [editingUserPermissions, setEditingUserPermissions] = useState(false);
  const [editingRolePermissions, setEditingRolePermissions] = useState(false);
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);

  // Update selected user permissions
  useEffect(() => {
    if (selectedUser) {
      setUserPermissions([...selectedUser.permissions]);
    }
  }, [selectedUser]);

  // Update selected role permissions
  useEffect(() => {
    if (selectedRole) {
      setRolePermissions([...selectedRole.permissions]);
    }
  }, [selectedRole]);

  // Handle user role change
  const handleUserRoleChange = async (userId: string, roleId: UserRole) => {
    try {
      await onUpdateUserRole(userId, roleId);
      
      setAlertMessage({
        type: 'success',
        message: 'User role updated successfully.'
      });
      
      // Update local state
      setSelectedUser(prev => {
        if (prev && prev.id === userId) {
          return {
            ...prev,
            role: roleId,
            permissions: roles.find(r => r.id === roleId)?.permissions || prev.permissions
          };
        }
        return prev;
      });
      
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to update user role: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Handle save user permissions
  const handleSaveUserPermissions = async () => {
    if (!selectedUser) return;
    
    try {
      await onUpdateUserPermissions(selectedUser.id, userPermissions);
      
      setAlertMessage({
        type: 'success',
        message: 'User permissions updated successfully.'
      });
      
      // Update local state
      setSelectedUser(prev => {
        if (prev) {
          return {
            ...prev,
            permissions: [...userPermissions]
          };
        }
        return prev;
      });
      
      setEditingUserPermissions(false);
      
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to update user permissions: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Handle save role permissions
  const handleSaveRolePermissions = async () => {
    if (!selectedRole) return;
    
    try {
      await onUpdateRolePermissions(selectedRole.id, rolePermissions);
      
      setAlertMessage({
        type: 'success',
        message: 'Role permissions updated successfully.'
      });
      
      // Update local state
      setSelectedRole(prev => {
        if (prev) {
          return {
            ...prev,
            permissions: [...rolePermissions]
          };
        }
        return prev;
      });
      
      setEditingRolePermissions(false);
      
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to update role permissions: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Toggle user permission
  const toggleUserPermission = (permission: Permission) => {
    setUserPermissions(prev => {
      if (prev.includes(permission)) {
        return prev.filter(p => p !== permission);
      } else {
        return [...prev, permission];
      }
    });
  };

  // Toggle role permission
  const toggleRolePermission = (permission: Permission) => {
    setRolePermissions(prev => {
      if (prev.includes(permission)) {
        return prev.filter(p => p !== permission);
      } else {
        return [...prev, permission];
      }
    });
  };

  // Format permission for display
  const formatPermission = (permission: string): string => {
    return permission
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get all available permissions
  const allPermissions = Object.values(Permission);

  // User table columns
  const userColumns: Column<User>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (user) => (
        <div>
          <div className="font-medium">{user.firstName} {user.lastName}</div>
          <div className="text-sm text-gray-500">{user.email}</div>
        </div>
      ),
      sortable: true
    },
    {
      key: 'role',
      header: 'Role',
      render: (user) => {
        const role = roles.find(r => r.id === user.role);
        return (
          <div className="flex items-center">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {role?.name || user.role}
            </span>
          </div>
        );
      },
      sortable: true
    },
    {
      key: 'permissions',
      header: 'Permissions',
      render: (user) => (
        <div className="flex flex-wrap gap-1">
          {user.permissions.length > 3 ? (
            <>
              {user.permissions.slice(0, 2).map(permission => (
                <span 
                  key={permission} 
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                >
                  {formatPermission(permission)}
                </span>
              ))}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                +{user.permissions.length - 2} more
              </span>
            </>
          ) : (
            user.permissions.map(permission => (
              <span 
                key={permission} 
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
              >
                {formatPermission(permission)}
              </span>
            ))
          )}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user) => (
        <Button
          variant="outline"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedUser(user);
          }}
        >
          Manage
        </Button>
      )
    }
  ];

  // Role table columns
  const roleColumns: Column<Role>[] = [
    {
      key: 'name',
      header: 'Role',
      render: (role) => (
        <div>
          <div className="font-medium">{role.name}</div>
          <div className="text-sm text-gray-500">{role.description}</div>
        </div>
      ),
      sortable: true
    },
    {
      key: 'users',
      header: 'Users',
      render: (role) => {
        const usersWithRole = users.filter(user => user.role === role.id);
        return (
          <div className="flex items-center">
            <span className="font-medium">{usersWithRole.length}</span>
          </div>
        );
      }
    },
    {
      key: 'permissions',
      header: 'Permissions',
      render: (role) => (
        <div className="flex flex-wrap gap-1">
          {role.permissions.length > 3 ? (
            <>
              {role.permissions.slice(0, 2).map(permission => (
                <span 
                  key={permission} 
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                >
                  {formatPermission(permission)}
                </span>
              ))}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                +{role.permissions.length - 2} more
              </span>
            </>
          ) : (
            role.permissions.map(permission => (
              <span 
                key={permission} 
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
              >
                {formatPermission(permission)}
              </span>
            ))
          )}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (role) => (
        <Button
          variant="outline"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedRole(role);
          }}
        >
          Manage
        </Button>
      )
    }
  ];

  return (
    <div className="user-permissions">
      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}
      
      <div className="mb-6">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-xl font-semibold text-gray-900">User Permissions</h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage user roles and permissions for the platform.
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex space-x-4 mb-6">
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'users' 
              ? 'text-blue-700 border-b-2 border-blue-500' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'roles' 
              ? 'text-blue-700 border-b-2 border-blue-500' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('roles')}
        >
          Roles
        </button>
      </div>
      
      {/* User Management */}
      {activeTab === 'users' && (
        <div>
          <Card className="mb-6">
            <DataTable
              columns={userColumns}
              data={users}
              keyExtractor={(user) => user.id}
              onRowClick={(user) => setSelectedUser(user)}
              pagination={{
                pageSize: 10,
                totalItems: users.length,
                currentPage: 1,
                onPageChange: () => {}
              }}
            />
          </Card>
          
          {/* User Details */}
          {selectedUser && (
            <Card>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                  <h2 className="text-lg font-medium">User Details</h2>
                  <p className="text-sm text-gray-500">{selectedUser.firstName} {selectedUser.lastName}</p>
                </div>
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => setSelectedUser(null)}
                >
                  Close
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Email</h3>
                  <p>{selectedUser.email}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Role</h3>
                  <div>
                    <select
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      value={selectedUser.role}
                      onChange={(e) => handleUserRoleChange(selectedUser.id, e.target.value as UserRole)}
                    >
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      {roles.find(r => r.id === selectedUser.role)?.description}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500">Permissions</h3>
                  {!editingUserPermissions ? (
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => setEditingUserPermissions(true)}
                    >
                      Edit Permissions
                    </Button>
                  ) : (
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => {
                          setEditingUserPermissions(false);
                          setUserPermissions([...selectedUser.permissions]);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="small"
                        onClick={handleSaveUserPermissions}
                      >
                        Save
                      </Button>
                    </div>
                  )}
                </div>
                
                {!editingUserPermissions ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.permissions.length > 0 ? (
                      selectedUser.permissions.map(permission => (
                        <span 
                          key={permission} 
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {formatPermission(permission)}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No individual permissions assigned.</p>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {allPermissions.map(permission => (
                        <div key={permission} className="flex items-center">
                          <input
                            id={`permission-${permission}`}
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            checked={userPermissions.includes(permission)}
                            onChange={() => toggleUserPermission(permission)}
                          />
                          <label htmlFor={`permission-${permission}`} className="ml-2 block text-sm text-gray-900">
                            {formatPermission(permission)}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}
      
      {/* Role Management */}
      {activeTab === 'roles' && (
        <div>
          <Card className="mb-6">
            <DataTable
              columns={roleColumns}
              data={roles}
              keyExtractor={(role) => role.id}
              onRowClick={(role) => setSelectedRole(role)}
            />
          </Card>
          
          {/* Role Details */}
          {selectedRole && (
            <Card>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                  <h2 className="text-lg font-medium">Role Details</h2>
                  <p className="text-sm text-gray-500">{selectedRole.name}</p>
                </div>
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => setSelectedRole(null)}
                >
                  Close
                </Button>
              </div>
              
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                <p>{selectedRole.description}</p>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-500">Permissions</h3>
                  {!editingRolePermissions ? (
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => setEditingRolePermissions(true)}
                    >
                      Edit Permissions
                    </Button>
                  ) : (
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => {
                          setEditingRolePermissions(false);
                          setRolePermissions([...selectedRole.permissions]);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="small"
                        onClick={handleSaveRolePermissions}
                      >
                        Save
                      </Button>
                    </div>
                  )}
                </div>
                
                {!editingRolePermissions ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedRole.permissions.map(permission => (
                      <span 
                        key={permission} 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {formatPermission(permission)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {allPermissions.map(permission => (
                        <div key={permission} className="flex items-center">
                          <input
                            id={`role-permission-${permission}`}
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            checked={rolePermissions.includes(permission)}
                            onChange={() => toggleRolePermission(permission)}
                          />
                          <label htmlFor={`role-permission-${permission}`} className="ml-2 block text-sm text-gray-900">
                            {formatPermission(permission)}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Users with this Role</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  {users.filter(user => user.role === selectedRole.id).map(user => (
                    <div key={user.id} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-gray-600">
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => {
                          setSelectedRole(null);
                          setSelectedUser(user);
                          setActiveTab('users');
                        }}
                      >
                        View
                      </Button>
                    </div>
                  ))}
                  
                  {users.filter(user => user.role === selectedRole.id).length === 0 && (
                    <p className="text-sm text-gray-500">No users currently have this role.</p>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
