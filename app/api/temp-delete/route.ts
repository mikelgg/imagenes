import { NextRequest, NextResponse } from 'next/server'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  endpoint: process.env.S3_ENDPOINT,
})

const BUCKET_NAME = process.env.S3_BUCKET!

function isValidAdminToken(token: string | null): boolean {
  const adminToken = process.env.ADMIN_TOKEN
  return !!(adminToken && token === adminToken)
}

export async function DELETE(request: NextRequest) {
  try {
    // Check admin authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.nextUrl.searchParams.get('token')
    
    if (!isValidAdminToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get key from query params
    const key = request.nextUrl.searchParams.get('key')
    
    if (!key) {
      return NextResponse.json(
        { error: 'Missing key parameter' },
        { status: 400 }
      )
    }

    // Validate key starts with temp/ for security
    if (!key.startsWith('temp/')) {
      return NextResponse.json(
        { error: 'Invalid key. Can only delete temp objects.' },
        { status: 400 }
      )
    }

    // Check if S3 is configured
    if (!process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY || !process.env.S3_BUCKET) {
      return NextResponse.json({ error: 'S3 not configured' }, { status: 503 })
    }

    // Delete object from S3
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    await s3Client.send(command)

    return NextResponse.json({ 
      ok: true, 
      message: 'Object deleted successfully',
      deletedKey: key
    })

  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete object' },
      { status: 500 }
    )
  }
}

// Handle other methods
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
