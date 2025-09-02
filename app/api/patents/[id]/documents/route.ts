import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { uploadToS3, deleteFromS3 } from '@/lib/s3'
import { createKey } from '@/lib/generateKey'

// GET: 특허의 문서 목록 조회
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    const documents = await (prisma as any).document.findMany({
      where: { patentId: id },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: documents,
    })
  } catch (error) {
    console.error("Documents GET error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch documents" }, { status: 500 })
  }
}

// POST: 문서 업로드
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    // FormData 파싱
    const formData = await request.formData()
    const type = formData.get('type') as string
    const file = formData.get('file') as File

    if (!type || !file) {
      return NextResponse.json({ 
        success: false, 
        error: "Type and file are required" 
      }, { status: 400 })
    }

    // 지원하는 문서 타입 검증
    const validTypes = ['ADS', 'SPECIFICATION', 'CLAIMS', 'ABSTRACT', 'DRAWINGS', 'OATH_DECLARATION', 'IDS', 'ASSIGNMENT', 'OTHER']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid document type" 
      }, { status: 400 })
    }

    // 특허 존재 확인
    const patent = await prisma.patent.findUnique({
      where: { id: id }
    })

    if (!patent) {
      return NextResponse.json({ success: false, error: "Patent not found" }, { status: 404 })
    }

    // 파일을 Buffer로 변환
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    // 안전한 S3 파일명 생성 (원본 파일명과 상관없이)
    const fileExtension = file.name.split('.').pop() || ''
    const safeFileName = `${createKey(16, true)}.${fileExtension}`
    const fileKey = `patentsMng/pnu/${id}/${safeFileName}`

    // S3에 파일 업로드
    await uploadToS3(fileBuffer, fileKey, 'public-read')

    // 데이터베이스에 문서 정보 저장 (원본 파일명은 보존)
    const document = await (prisma as any).document.create({
      data: {
        patentId: id,
        type: type,
        fileName: file.name, // 원본 파일명 (표시용)
        filePath: fileKey,   // S3 경로 (안전한 파일명)
        fileSize: file.size,
        version: 1,
        status: 'DRAFT',
        uploadedBy: 1, // TODO: 실제 로그인한 사용자 ID 사용
      }
    })

    return NextResponse.json({
      success: true,
      data: document,
    }, { status: 201 })
  } catch (error) {
    console.error("Document upload error:", error)
    return NextResponse.json({ success: false, error: "Failed to upload document" }, { status: 500 })
  }
} 