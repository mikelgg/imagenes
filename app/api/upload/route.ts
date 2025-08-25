import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

// Validate environment variables
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY
const AWS_REGION = process.env.AWS_REGION || 'eu-north-1'
const S3_BUCKET = process.env.S3_BUCKET || 'imagesv0.1'

if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  console.error('[S3 API] AWS credentials not configured')
}

// Initialize S3 client with explicit region and force eu-north-1
const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID || '',
    secretAccessKey: AWS_SECRET_ACCESS_KEY || '',
  },
  // Force region to prevent default us-east-1 fallback
  endpoint: `https://s3.${AWS_REGION}.amazonaws.com`,
})

console.log(`[S3 API] Initialized S3 client with region: ${AWS_REGION}, bucket: ${S3_BUCKET}`)
console.log(`[S3 API] Forced endpoint: https://s3.${AWS_REGION}.amazonaws.com`)

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

interface UploadRequest {
  filename: string
  contentType: string
  fileSize?: number
}

export async function POST(request: NextRequest) {
  try {
    // Check AWS credentials
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      console.error('[S3 API] AWS credentials not configured')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const body: UploadRequest = await request.json()
    const { filename, contentType, fileSize } = body

    console.log(`[S3 API] Request for: ${filename}, type: ${contentType}, size: ${fileSize} bytes`)

    // Validate input
    if (!filename || !contentType) {
      console.error('[S3 API] Missing required fields:', { filename: !!filename, contentType: !!contentType })
      return NextResponse.json(
        { error: 'Missing filename or contentType' },
        { status: 400 }
      )
    }

    // Validate content type
    if (!ALLOWED_TYPES.includes(contentType)) {
      console.error(`[S3 API] Invalid content type: ${contentType}`)
      return NextResponse.json(
        { error: `Invalid content type. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate file size if provided
    if (fileSize && fileSize > MAX_SIZE) {
      console.error(`[S3 API] File too large: ${fileSize} bytes (max: ${MAX_SIZE})`)
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Generate S3 key with date prefix and UUID
    const now = new Date()
    const datePrefix = now.toISOString().split('T')[0] // YYYY-MM-DD
    const fileExtension = contentType.split('/')[1] // jpeg, png, webp
    const uuid = uuidv4()
    const key = `samples/${datePrefix}/${uuid}.${fileExtension}`

    console.log(`[S3 API] Generated key: ${key}`)

    // Create presigned URL with exact Content-Type validation
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: contentType,
      // Auto-delete after 24 hours is handled by S3 lifecycle rules
    })

    console.log(`[S3 API] PutObjectCommand created with ContentType: ${contentType}`)

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // URL expires in 1 hour
    })

    // Log URL host/region without query parameters for debugging
    const urlObj = new URL(presignedUrl)
    console.log(`[S3 API] Generated presigned URL for: ${key}`)
    console.log(`[S3 API] URL host: ${urlObj.host}, region: ${AWS_REGION}`)
    console.log(`[S3 API] Content-Type signed: ${contentType}`)
    console.log(`[S3 API] Expected PUT header Content-Type: ${contentType}`)

    return NextResponse.json({
      url: presignedUrl,
      key: key,
      headers: {
        'Content-Type': contentType,
      },
    })

  } catch (error) {
    console.error('[S3 API] Error generating presigned URL:', error instanceof Error ? error.message : 'Unknown error')
    
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    )
  }
}
