import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

// ── 영수증 CRUD ──

export async function getReceipts(month, category, subCategory, team) {
  let query = supabase
    .from('receipts')
    .select('*')
    .eq('month', month)
    .eq('category', category)
    .order('receipt_date', { ascending: false });

  if (subCategory) {
    query = query.eq('sub_category', subCategory);
  }

  if (team) {
    query = query.eq('team', team);
  }

  const { data, error } = await query;
  return { data, error };
}

export async function getReceiptsByTrip(tripId, team) {
  let query = supabase
    .from('receipts')
    .select('*')
    .eq('trip_id', tripId)
    .order('receipt_date', { ascending: false });

  if (team) {
    query = query.eq('team', team);
  }

  const { data, error } = await query;
  return { data, error };
}

export async function createReceipt(receipt) {
  const { data, error } = await supabase
    .from('receipts')
    .insert(receipt)
    .select()
    .single();
  return { data, error };
}

export async function updateReceipt(id, updates) {
  const { data, error } = await supabase
    .from('receipts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteReceipt(id) {
  // 먼저 이미지 URL을 가져와서 Storage에서도 삭제
  const { data: receipt } = await supabase
    .from('receipts')
    .select('image_url')
    .eq('id', id)
    .single();

  if (receipt?.image_url) {
    const path = receipt.image_url.split('/storage/v1/object/public/receipts/')[1];
    if (path) {
      await supabase.storage.from('receipts').remove([path]);
    }
  }

  const { error } = await supabase.from('receipts').delete().eq('id', id);
  return { error };
}

// ── 이미지 업로드 ──

export async function uploadReceiptImage(blob, month) {
  const fileName = `${month}/${uuidv4()}.jpg`;
  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(fileName, blob, { contentType: 'image/jpeg' });

  if (error) return { url: null, error };

  const { data: urlData } = supabase.storage
    .from('receipts')
    .getPublicUrl(fileName);

  return { url: urlData.publicUrl, error: null };
}

// ── 예산 CRUD ──

export async function getBudgets(month, team) {
  let query = supabase
    .from('budgets')
    .select('*')
    .eq('month', month)
    .order('sub_category');

  if (team) {
    query = query.eq('team', team);
  }

  const { data, error } = await query;
  return { data, error };
}

export async function upsertBudget(month, category, subCategory, amount, team) {
  const record = { month, category, sub_category: subCategory, amount };
  if (team) record.team = team;

  const { data, error } = await supabase
    .from('budgets')
    .upsert(
      record,
      { onConflict: team ? 'month,category,sub_category,team' : 'month,category,sub_category' }
    )
    .select()
    .single();
  return { data, error };
}

export async function deleteBudget(id) {
  const { error } = await supabase.from('budgets').delete().eq('id', id);
  return { error };
}

// ── 출장 CRUD ──

export async function getTrips(month, team) {
  let query = supabase
    .from('trips')
    .select('*')
    .eq('month', month)
    .order('start_date', { ascending: false });

  if (team) {
    query = query.eq('team', team);
  }

  const { data, error } = await query;
  return { data, error };
}

export async function createTrip(trip) {
  const { data, error } = await supabase
    .from('trips')
    .insert(trip)
    .select()
    .single();
  return { data, error };
}

export async function updateTrip(id, updates) {
  const { data, error } = await supabase
    .from('trips')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteTrip(id) {
  const { error } = await supabase.from('trips').delete().eq('id', id);
  return { error };
}

// ── 집계 ──

export async function getMonthSummary(month, category, team) {
  let query = supabase
    .from('receipts')
    .select('sub_category, amount')
    .eq('month', month)
    .eq('category', category);

  if (team) {
    query = query.eq('team', team);
  }

  const { data, error } = await query;

  if (error) return { summary: null, error };

  const summary = {};
  (data || []).forEach((r) => {
    summary[r.sub_category] = (summary[r.sub_category] || 0) + r.amount;
  });

  return { summary, error: null };
}

export async function getTripSummary(tripId, team) {
  let query = supabase
    .from('receipts')
    .select('sub_category, amount')
    .eq('trip_id', tripId);

  if (team) {
    query = query.eq('team', team);
  }

  const { data, error } = await query;

  if (error) return { summary: null, error };

  const summary = {};
  (data || []).forEach((r) => {
    summary[r.sub_category] = (summary[r.sub_category] || 0) + r.amount;
  });

  return { summary, error: null };
}
