import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import AWS from 'aws-sdk'

const s3 = new AWS.S3({
  region: process.env.AWS_REGION!,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
})

const BUCKET = process.env.S3_BUCKET_NAME!

export async function POST(request: NextRequest) {
  try {
    const { fileKey, fileName } = await request.json()

    if (!fileKey || !fileName) {
      return NextResponse.json(
        { error: "파일 키와 파일명이 필요합니다." },
        { status: 400 }
      )
    }

    // S3 파일의 메타데이터 업데이트
    await s3.copyObject({
      Bucket: BUCKET,
      CopySource: `${BUCKET}/${fileKey}`,
      Key: fileKey,
      Metadata: {
        'content-disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
      },
      MetadataDirective: 'REPLACE'
    }).promise()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("메타데이터 업데이트 오류:", error)
    return NextResponse.json(
      { error: "메타데이터 업데이트에 실패했습니다." },
      { status: 500 }
    )
  }
} 