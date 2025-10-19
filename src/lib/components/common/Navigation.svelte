<!--
  Main Navigation Component
  Handles the primary navigation menu with role-based access control
-->
<script lang="ts">
  import { page } from '$app/stores';
  import { authStore, isAuthenticated, isAdmin, canWrite, canUpload, user } from '$lib/stores/auth.js';

  // Current route for active state
  $: currentRoute = $page.route.id;

  // Navigation items configuration
  $: navigationItems = [
    {
      href: '/',
      label: 'ホーム',
      icon: 'home',
      show: true
    },
    {
      href: '/browse',
      label: 'ページ一覧',
      icon: 'folder',
      show: true
    },
    {
      href: '/edit',
      label: '編集',
      icon: 'edit',
      show: $canWrite
    },
    {
      href: '/files',
      label: 'ファイル',
      icon: 'file',
      show: $canUpload
    },
    {
      href: '/admin',
      label: '管理',
      icon: 'settings',
      show: $isAdmin,
      isAdmin: true
    }
  ];

  // SVG icons
  const icons = {
    home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9,22 9,12 15,12 15,22',
    folder: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
    edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
    file: 'M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z M13,2 13,9 20,9',
    settings: 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z',
    logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16,17 21,12 16,7 M21 12H9'
  };

  function getIconPath(iconName: string): string {
    return icons[iconName] || '';
  }
</script>

<nav class="navigation">
  <div class="nav-links">
    {#each navigationItems as item}
      {#if item.show}
        <a 
          href={item.href}
          class="nav-link"
          class:active={currentRoute === item.href}
          class:admin-link={item.isAdmin}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d={getIconPath(item.icon)} />
          </svg>
          {item.label}
        </a>
      {/if}
    {/each}
  </div>

  {#if $isAuthenticated && $user}
    <div class="user-info">
      <div class="user-details">
        <span class="username">{$user.username}</span>
        <span class="user-role" class:admin={$user.role === 'admin'} class:regular={$user.role === 'regular'}>
          {$user.role}
        </span>
      </div>
      <button class="logout-btn" on:click={() => authStore.logout()}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d={getIconPath('logout')} />
        </svg>
        ログアウト
      </button>
    </div>
  {/if}
</nav>

<style>
  .navigation {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .nav-links {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 6px;
    text-decoration: none;
    color: var(--text-secondary, #718096);
    font-weight: 500;
    padding: 8px 12px;
    border-radius: 6px;
    transition: all 0.2s ease;
    font-size: 14px;
  }

  .nav-link:hover {
    color: var(--text-primary, #2d3748);
    background: var(--bg-hover, #f7fafc);
  }

  .nav-link.active {
    color: var(--primary-color, #3182ce);
    background: var(--primary-light, #ebf8ff);
  }

  .nav-link svg {
    width: 16px;
    height: 16px;
  }

  .admin-link {
    color: var(--warning-color, #d69e2e);
  }

  .admin-link:hover {
    color: var(--warning-dark, #b7791f);
    background: var(--warning-light, #faf5e6);
  }

  .admin-link.active {
    color: var(--warning-dark, #b7791f);
    background: var(--warning-light, #faf5e6);
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .user-details {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .username {
    font-weight: 500;
    color: var(--text-primary, #2d3748);
    font-size: 14px;
  }

  .user-role {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .user-role.admin {
    background-color: var(--warning-light, #faf5e6);
    color: var(--warning-dark, #b7791f);
  }

  .user-role.regular {
    background-color: var(--primary-light, #ebf8ff);
    color: var(--primary-color, #3182ce);
  }

  .logout-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    border: 1px solid var(--border-color, #e1e5e9);
    background: white;
    color: var(--text-secondary, #718096);
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .logout-btn:hover {
    background: var(--bg-hover, #f7fafc);
    color: var(--text-primary, #2d3748);
    border-color: var(--border-hover, #cbd5e0);
  }

  .logout-btn svg {
    width: 14px;
    height: 14px;
  }

  /* Responsive design */
  @media (max-width: 1024px) {
    .nav-links {
      gap: 12px;
    }

    .nav-link {
      padding: 6px 8px;
      font-size: 13px;
    }

    .nav-link svg {
      width: 14px;
      height: 14px;
    }

    .user-info {
      gap: 8px;
    }

    .username {
      font-size: 13px;
    }
  }

  @media (max-width: 768px) {
    .navigation {
      flex-direction: column;
      gap: 16px;
    }

    .nav-links {
      gap: 12px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .nav-link {
      padding: 8px 12px;
      font-size: 13px;
    }

    .user-info {
      justify-content: center;
    }

    .user-details {
      gap: 6px;
    }
  }

  @media (max-width: 480px) {
    .nav-links {
      flex-direction: column;
      gap: 8px;
      width: 100%;
    }

    .nav-link {
      justify-content: center;
      width: 100%;
      max-width: 200px;
    }

    .user-info {
      flex-direction: column;
      gap: 8px;
    }
  }
</style>