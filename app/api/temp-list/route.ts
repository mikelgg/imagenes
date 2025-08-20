import { NextRequest, NextResponse } from 'next/server'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { GetObjectCommand } from '@aws-sdk/client-s3'

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

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                  request.nextUrl.searchParams.get('token')
    
    if (!isValidAdminToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if S3 is configured
    if (!process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY || !process.env.S3_BUCKET) {
      return NextResponse.json({ objects: [], message: 'S3 not configured' })
    }

    // List objects in temp/ prefix
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: 'temp/',
      MaxKeys: 1000, // Limit for performance
    })

    const response = await s3Client.send(command)
    
    if (!response.Contents) {
      return NextResponse.json({ objects: [] })
    }

    // Generate signed URLs for preview
    const objects = await Promise.all(
      response.Contents.map(async (object) => {
        if (!object.Key) return null

        try {
          // Generate signed URL for preview (valid for 1 hour)
          const getCommand = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: object.Key,
          })
          
          const signedUrl = await getSignedUrl(s3Client, getCommand, { 
            expiresIn: 3600 // 1 hour
          })

          // Calculate expiration time (24 hours from creation)
          const createdAt = object.LastModified || new Date()
          const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000)

          return {
            key: object.Key,
            size: object.Size || 0,
            lastModified: object.LastModified?.toISOString(),
            signedUrl,
            expiresAt: expiresAt.toISOString(),
            isExpired: expiresAt < new Date(),
          }
        } catch (error) {
          console.error(`Error generating signed URL for ${object.Key}:`, error)
          return null
        }
      })
    )

    // Filter out null results
    const validObjects = objects.filter(obj => obj !== null)

    return NextResponse.json({ 
      objects: validObjects,
      total: validObjects.length 
    })

  } catch (error) {
    console.error('List error:', error)
    return NextResponse.json(
      { error: 'Failed to list objects' },
      { status: 500 }
    )
  }
}

// Handle other methods
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
