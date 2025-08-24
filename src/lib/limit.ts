const FREE_QUOTA = 3;

interface QuotaStatus {
  unlocked: boolean;
  left: number;
}

export function getQuota(): QuotaStatus {
  const unlocked = localStorage.getItem('tr_unlocked') === '1';
  const left = parseInt(localStorage.getItem('tr_left') || '3', 10);
  
  return { unlocked, left };
}

export function consumeOne(): boolean {
  const { unlocked, left } = getQuota();
  
  if (unlocked) {
    return true; // Unlimited for unlocked users
  }
  
  if (left <= 0) {
    return false; // No quota left
  }
  
  const newLeft = left - 1;
  localStorage.setItem('tr_left', newLeft.toString());
  return true;
}

export function resetQuota(): void {
  localStorage.setItem('tr_left', FREE_QUOTA.toString());
}

export function initializeQuota(): void {
  if (localStorage.getItem('tr_left') === null) {
    localStorage.setItem('tr_left', FREE_QUOTA.toString());
  }
}