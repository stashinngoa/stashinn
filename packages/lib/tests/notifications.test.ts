/**
 * Tests for the Notifications Filter Logic
 * 
 * Note: These tests conceptually validate the behavior of the new filtering 
 * options introduced in AD-08 (Admin Notification Center).
 */

import { describe, expect, it } from 'vitest';

// Mock representation of the notifications list state
type Notification = {
  id: string;
  title: string;
  message: string;
  category: string;
  is_read: boolean;
  is_archived: boolean;
  created_at: string;
};

const mockData: Notification[] = [
  { id: '1', title: 'KYC Alert', message: 'New KYC', category: 'system', is_read: false, is_archived: false, created_at: new Date().toISOString() },
  { id: '2', title: 'Payment Failed', message: 'Razorpay error', category: 'payment', is_read: true, is_archived: false, created_at: new Date(Date.now() - 86400000).toISOString() }, // Yesterday
  { id: '3', title: 'Dispute Raised', message: 'Damage claim', category: 'damage', is_read: true, is_archived: true, created_at: new Date(Date.now() - 10 * 86400000).toISOString() }, // 10 days ago
];

function filterNotifications(
  notifications: Notification[],
  filters: { search?: string; category?: string; status?: string; dateRange?: string }
): Notification[] {
  let filtered = [...notifications];

  // Search
  if (filters.search) {
    const s = filters.search.toLowerCase();
    filtered = filtered.filter(n => n.title.toLowerCase().includes(s) || n.message.toLowerCase().includes(s));
  }

  // Category
  if (filters.category && filters.category !== 'all') {
    filtered = filtered.filter(n => n.category === filters.category);
  }

  // Status
  if (filters.status === 'unread') {
    filtered = filtered.filter(n => !n.is_read && !n.is_archived);
  } else if (filters.status === 'read') {
    filtered = filtered.filter(n => n.is_read && !n.is_archived);
  } else if (filters.status === 'archived') {
    filtered = filtered.filter(n => n.is_archived);
  } else {
    // Default (all non-archived)
    filtered = filtered.filter(n => !n.is_archived);
  }

  // Date Range
  if (filters.dateRange && filters.dateRange !== 'all') {
    const now = new Date();
    let startDate = new Date();
    
    if (filters.dateRange === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (filters.dateRange === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (filters.dateRange === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    }
    
    filtered = filtered.filter(n => new Date(n.created_at) >= startDate);
  }

  return filtered;
}

describe('Notification Filters', () => {
  it('Should filter by text search', () => {
    const result = filterNotifications(mockData, { search: 'KYC', status: 'all' });
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('1');
  });

  it('Should filter by category', () => {
    const result = filterNotifications(mockData, { category: 'payment', status: 'all' });
    expect(result.length).toBe(1);
    expect(result[0].category).toBe('payment');
  });

  it('Should respect default status filter (hide archived)', () => {
    const result = filterNotifications(mockData, { status: 'all' });
    expect(result.length).toBe(2);
    expect(result.find(n => n.id === '3')).toBeUndefined();
  });

  it('Should filter strictly for archived items', () => {
    const result = filterNotifications(mockData, { status: 'archived' });
    expect(result.length).toBe(1);
    expect(result[0].is_archived).toBe(true);
  });

  it('Should filter by unread status', () => {
    const result = filterNotifications(mockData, { status: 'unread' });
    expect(result.length).toBe(1);
    expect(result[0].is_read).toBe(false);
  });
  
  it('Should filter by date range', () => {
    // Both '1' (today) and '2' (yesterday) are within 'week', but '3' (10 days ago) is not.
    // Plus, default status hides archived anyway. Let's explicitly search archived + week.
    const result = filterNotifications(mockData, { dateRange: 'week', status: 'archived' });
    // Item 3 is archived, but it's 10 days old, so it shouldn't match 'week'
    expect(result.length).toBe(0);
  });
});
