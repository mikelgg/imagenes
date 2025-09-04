import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  endpoint: process.env.S3_ENDPOINT, // For S3-compatible services
})

const BUCKET_NAME = process.env.S3_BUCKET!

export async function POST(request: NextRequest) {
  try {
    // Check if required environment variables are set
    if (!process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY || !process.env.S3_BUCKET) {
      console.log('S3 configuration missing, skipping upload')
      return NextResponse.json({ ok: true, message: 'Upload disabled' })
    }

    const formData = await request.formData()
    const image = formData.get('image') as File
    const batchId = formData.get('batchId') as string
    const createdAt = formData.get('createdAt') as string

    // Validate inputs
    if (!image || !batchId || !createdAt) {
      return NextResponse.json(
        { error: 'Missing required fields: image, batchId, createdAt' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!image.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      )
    }

    // File size validation removed - no hard limits

    // Generate S3 key with date structure for easy lifecycle management
    const date = new Date(createdAt)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    const fileExtension = image.name.split('.').pop() || 'jpg'
    const fileName = `${batchId}-${uuidv4()}.${fileExtension}`
    const s3Key = `temp/${year}/${month}/${day}/${fileName}`

    // Convert file to buffer
    const buffer = Buffer.from(await image.arrayBuffer())

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: image.type,
      Metadata: {
        batchId,
        createdAt,
        originalName: image.name,
      },
      // Set object to expire in 24 hours (backup to lifecycle rule)
      Expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })

    await s3Client.send(command)

    return NextResponse.json({ 
      ok: true, 
      message: 'Sample image uploaded successfully',
      key: s3Key 
    })

  } catch (error) {
    console.error('Upload error:', error)
    
    // Don't expose internal errors to client
    return NextResponse.json(
      { error: 'Upload failed. Please try again later.' },
      { status: 500 }
    )
  }
}

// Handle other methods
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
