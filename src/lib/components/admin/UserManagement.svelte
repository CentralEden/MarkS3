<!--
  User Management Component
  Provides interface for admin users to manage system users
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import type { User, UserRole } from '$lib/types/auth.js';
  import { UserRole as UserRoleEnum } from '$lib/types/auth.js';
  import { userManagementService } from '$lib/services/userManagement.js';
  import type { CreateUserRequest, UpdateUserRequest } from '$lib/services/userManagement.js';
  import { WikiError } from '$lib/types/errors.js';

  // State
  let users: User[] = [];
  let loading = false;
  let error: string | null = null;
  let showCreateModal = false;
  let showEditModal = false;
  let showDeleteModal = false;
  let selectedUser: User | null = null;

  // Form data
  let createForm = {
    username: '',
    email: '',
    role: UserRoleEnum.REGULAR as UserRole,
    temporaryPassword: ''
  };

  let editForm = {
    username: '',
    email: '',
    role: UserRoleEnum.REGULAR as UserRole
  };

  // Load users on component mount
  onMount(() => {
    loadUsers();
  });

  /**
   * Load all users from the service
   */
  async function loadUsers() {
    loading = true;
    error = null;

    try {
      users = await userManagementService.listUsers();
    } catch (err) {
      console.error('Failed to load users:', err);
      error = err instanceof WikiError ? err.message : 'Failed to load users';
    } finally {
      loading = false;
    }
  }

  /**
   * Open create user modal
   */
  function openCreateModal() {
    createForm = {
      username: '',
      email: '',
      role: UserRoleEnum.REGULAR,
      temporaryPassword: ''
    };
    showCreateModal = true;
  }

  /**
   * Open edit user modal
   */
  function openEditModal(user: User) {
    selectedUser = user;
    editForm = {
      username: user.username,
      email: user.email,
      role: user.role
    };
    showEditModal = true;
  }

  /**
   * Open delete confirmation modal
   */
  function openDeleteModal(user: User) {
    selectedUser = user;
    showDeleteModal = true;
  }

  /**
   * Create a new user
   */
  async function createUser() {
    if (!createForm.username || !createForm.email) {
      error = 'Username and email are required';
      return;
    }

    loading = true;
    error = null;

    try {
      const request: CreateUserRequest = {
        username: createForm.username,
        email: createForm.email,
        role: createForm.role,
        temporaryPassword: createForm.temporaryPassword || undefined
      };

      await userManagementService.createUser(request);
      await loadUsers(); // Refresh the list
      showCreateModal = false;
    } catch (err) {
      console.error('Failed to create user:', err);
      error = err instanceof WikiError ? err.message : 'Failed to create user';
    } finally {
      loading = false;
    }
  }

  /**
   * Update an existing user
   */
  async function updateUser() {
    if (!selectedUser || !editForm.email) {
      error = 'Email is required';
      return;
    }

    loading = true;
    error = null;

    try {
      const request: UpdateUserRequest = {
        username: selectedUser.username,
        email: editForm.email,
        role: editForm.role
      };

      await userManagementService.updateUser(request);
      await loadUsers(); // Refresh the list
      showEditModal = false;
      selectedUser = null;
    } catch (err) {
      console.error('Failed to update user:', err);
      error = err instanceof WikiError ? err.message : 'Failed to update user';
    } finally {
      loading = false;
    }
  }

  /**
   * Delete a user
   */
  async function deleteUser() {
    if (!selectedUser) return;

    loading = true;
    error = null;

    try {
      await userManagementService.deleteUser(selectedUser.username);
      await loadUsers(); // Refresh the list
      showDeleteModal = false;
      selectedUser = null;
    } catch (err) {
      console.error('Failed to delete user:', err);
      error = err instanceof WikiError ? err.message : 'Failed to delete user';
    } finally {
      loading = false;
    }
  }

  /**
   * Close all modals
   */
  function closeModals() {
    showCreateModal = false;
    showEditModal = false;
    showDeleteModal = false;
    selectedUser = null;
    error = null;
  }

  /**
   * Get role display name
   */
  function getRoleDisplayName(role: UserRole): string {
    switch (role) {
      case UserRoleEnum.ADMIN:
        return 'Administrator';
      case UserRoleEnum.REGULAR:
        return 'Regular User';
      case UserRoleEnum.GUEST:
        return 'Guest';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get role badge class
   */
  function getRoleBadgeClass(role: UserRole): string {
    switch (role) {
      case UserRoleEnum.ADMIN:
        return 'role-admin';
      case UserRoleEnum.REGULAR:
        return 'role-regular';
      case UserRoleEnum.GUEST:
        return 'role-guest';
      default:
        return 'role-unknown';
    }
  }
</script>

<div class="user-management">
  <header class="section-header">
    <h2>User Management</h2>
    <button class="btn btn-primary" on:click={openCreateModal} disabled={loading}>
      Add New User
    </button>
  </header>

  {#if error}
    <div class="error-message">
      {error}
      <button class="btn-close" on:click={() => error = null}>×</button>
    </div>
  {/if}

  {#if loading}
    <div class="loading">Loading users...</div>
  {:else}
    <div class="users-table">
      <table>
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each users as user (user.id)}
            <tr>
              <td class="username">{user.username}</td>
              <td class="email">{user.email}</td>
              <td>
                <span class="role-badge {getRoleBadgeClass(user.role)}">
                  {getRoleDisplayName(user.role)}
                </span>
              </td>
              <td class="actions">
                <button 
                  class="btn btn-secondary btn-sm" 
                  on:click={() => openEditModal(user)}
                  disabled={loading}
                >
                  Edit
                </button>
                <button 
                  class="btn btn-danger btn-sm" 
                  on:click={() => openDeleteModal(user)}
                  disabled={loading}
                >
                  Delete
                </button>
              </td>
            </tr>
          {:else}
            <tr>
              <td colspan="4" class="no-users">No users found</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<!-- Create User Modal -->
{#if showCreateModal}
  <div class="modal-overlay" on:click={closeModals}>
    <div class="modal" on:click|stopPropagation>
      <header class="modal-header">
        <h3>Create New User</h3>
        <button class="btn-close" on:click={closeModals}>×</button>
      </header>
      
      <form on:submit|preventDefault={createUser}>
        <div class="form-group">
          <label for="create-username">Username</label>
          <input 
            id="create-username"
            type="text" 
            bind:value={createForm.username} 
            required 
            disabled={loading}
          />
        </div>
        
        <div class="form-group">
          <label for="create-email">Email</label>
          <input 
            id="create-email"
            type="email" 
            bind:value={createForm.email} 
            required 
            disabled={loading}
          />
        </div>
        
        <div class="form-group">
          <label for="create-role">Role</label>
          <select id="create-role" bind:value={createForm.role} disabled={loading}>
            <option value={UserRoleEnum.REGULAR}>Regular User</option>
            <option value={UserRoleEnum.ADMIN}>Administrator</option>
            <option value={UserRoleEnum.GUEST}>Guest</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="create-password">Temporary Password (optional)</label>
          <input 
            id="create-password"
            type="password" 
            bind:value={createForm.temporaryPassword} 
            placeholder="Auto-generated if empty"
            disabled={loading}
          />
        </div>
        
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" on:click={closeModals} disabled={loading}>
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Edit User Modal -->
{#if showEditModal && selectedUser}
  <div class="modal-overlay" on:click={closeModals}>
    <div class="modal" on:click|stopPropagation>
      <header class="modal-header">
        <h3>Edit User: {selectedUser.username}</h3>
        <button class="btn-close" on:click={closeModals}>×</button>
      </header>
      
      <form on:submit|preventDefault={updateUser}>
        <div class="form-group">
          <label for="edit-email">Email</label>
          <input 
            id="edit-email"
            type="email" 
            bind:value={editForm.email} 
            required 
            disabled={loading}
          />
        </div>
        
        <div class="form-group">
          <label for="edit-role">Role</label>
          <select id="edit-role" bind:value={editForm.role} disabled={loading}>
            <option value={UserRoleEnum.REGULAR}>Regular User</option>
            <option value={UserRoleEnum.ADMIN}>Administrator</option>
            <option value={UserRoleEnum.GUEST}>Guest</option>
          </select>
        </div>
        
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" on:click={closeModals} disabled={loading}>
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" disabled={loading}>
            {loading ? 'Updating...' : 'Update User'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- Delete User Modal -->
{#if showDeleteModal && selectedUser}
  <div class="modal-overlay" on:click={closeModals}>
    <div class="modal" on:click|stopPropagation>
      <header class="modal-header">
        <h3>Delete User</h3>
        <button class="btn-close" on:click={closeModals}>×</button>
      </header>
      
      <div class="modal-content">
        <p>Are you sure you want to delete the user <strong>{selectedUser.username}</strong>?</p>
        <p class="warning">This action cannot be undone.</p>
      </div>
      
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" on:click={closeModals} disabled={loading}>
          Cancel
        </button>
        <button type="button" class="btn btn-danger" on:click={deleteUser} disabled={loading}>
          {loading ? 'Deleting...' : 'Delete User'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .user-management {
    max-width: 1000px;
    margin: 0 auto;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .section-header h2 {
    color: #374151;
    margin: 0;
  }

  .error-message {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .loading {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
  }

  .users-table {
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th, td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
  }

  th {
    background: #f9fafb;
    font-weight: 600;
    color: #374151;
  }

  .username {
    font-weight: 500;
    color: #111827;
  }

  .email {
    color: #6b7280;
  }

  .role-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .role-admin {
    background: #fef3c7;
    color: #92400e;
  }

  .role-regular {
    background: #dbeafe;
    color: #1e40af;
  }

  .role-guest {
    background: #f3f4f6;
    color: #374151;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .no-users {
    text-align: center;
    color: #6b7280;
    font-style: italic;
  }

  /* Button styles */
  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #2563eb;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #1d4ed8;
  }

  .btn-secondary {
    background: #f3f4f6;
    color: #374151;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #e5e7eb;
  }

  .btn-danger {
    background: #dc2626;
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background: #b91c1c;
  }

  .btn-sm {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
  }

  .btn-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #6b7280;
    padding: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-close:hover {
    color: #374151;
  }

  /* Modal styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .modal-header h3 {
    margin: 0;
    color: #111827;
  }

  .modal-content {
    padding: 1.5rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #374151;
  }

  .form-group input,
  .form-group select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }

  .form-group input:focus,
  .form-group select:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .warning {
    color: #dc2626;
    font-weight: 500;
  }
</style>