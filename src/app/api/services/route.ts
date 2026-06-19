import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const anonClient = createClient(URL, ANON)
const authedClient = (token: string) =>
  createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } } })

function requireAuth(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7)
}

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category')
  let query = anonClient.from('services').select('*').order('sort_order').order('name')
  if (category) query = query.eq('category', category)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ services: data ?? [] })
}

export async function POST(req: NextRequest) {
  const token = requireAuth(req)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { category, name, description, duration, price, popular } = await req.json()
  if (!category || !name || !duration || price === undefined) {
    return NextResponse.json({ error: 'category, name, duration and price are required' }, { status: 400 })
  }

  const { data, error } = await authedClient(token)
    .from('services')
    .insert({ category, name, description: description || '', duration: Number(duration), price: Number(price), popular: !!popular })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ service: data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const token = requireAuth(req)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  if ('discount_price' in body) patch.discount_price = body.discount_price ?? null
  if ('discount_ends_at' in body) patch.discount_ends_at = body.discount_ends_at ?? null
  if ('popular' in body) patch.popular = !!body.popular
  if ('name' in body) patch.name = body.name
  if ('description' in body) patch.description = body.description
  if ('duration' in body) patch.duration = Number(body.duration)
  if ('price' in body) patch.price = Number(body.price)
  if ('sort_order' in body) patch.sort_order = Number(body.sort_order)

  const { data, error } = await authedClient(token)
    .from('services')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ service: data })
}

export async function DELETE(req: NextRequest) {
  const token = requireAuth(req)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await authedClient(token).from('services').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
