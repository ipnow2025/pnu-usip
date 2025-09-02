import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { uploadToS3 } from "@/lib/s3"
import { getCurrentUser } from "@/lib/permissions"
import { createKey } from "@/lib/generateKey"

// 파일명 안전화 함수
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_') // 특수문자를 언더스코어로 변경
    .replace(/_+/g, '_') // 연속된 언더스코어를 하나로
    .replace(/^_|_$/g, '') // 앞뒤 언더스코어 제거
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const patentId = formData.get('patentId') as string
    const documentType = formData.get('documentType') as string
    const uploadType = formData.get('uploadType') as string
    const file = formData.get('file') as File

    if (!patentId || !documentType || !uploadType || !file) {
      return NextResponse.json(
        { error: "필수 파라미터가 누락되었습니다." },
        { status: 400 }
      )
    }

    // 현재 사용자 정보 가져오기
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: "인증되지 않은 사용자입니다." },
        { status: 401 }
      )
    }

    // 파일 크기 검증 (50MB 제한)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "파일 크기가 50MB를 초과합니다." },
        { status: 400 }
      )
    }

    // 허용된 파일 타입 검증
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "지원하지 않는 파일 타입입니다." },
        { status: 400 }
      )
    }

    // 파일을 ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 파일명 안전화 및 파일 키 생성
    const safeFileName = sanitizeFileName(file.name)
    const fileExtension = file.name.split('.').pop() || ''
    const randomKey = createKey(12, true) // 12자리 랜덤 키 + 타임스탬프
    const fileKey = `patentsMng/pnu/preparation/${patentId}/${documentType}/${uploadType}/${randomKey}_${safeFileName}`

    // S3에 파일 업로드
    const uploadResult = await uploadToS3(buffer, fileKey, 'private')

    if (!uploadResult) {
      return NextResponse.json(
        { error: "파일 업로드에 실패했습니다." },
        { status: 500 }
      )
    }

    // 데이터베이스에 파일 정보 저장 (raw SQL 사용)
    const documentFile = await prisma.$queryRaw`
      INSERT INTO us_patents_document_preparation_files (
        id, patentId, documentType, uploadType, fileName, originalFileName, 
        filePath, fileKey, fileSize, fileType, uploadedBy, status, createdAt, updatedAt
      ) VALUES (
        ${crypto.randomUUID()}, ${patentId}, ${documentType}, ${uploadType}, 
        ${safeFileName}, ${file.name}, ${fileKey}, ${fileKey}, ${file.size}, 
        ${file.type}, ${currentUser.memberName}, 
        ${uploadType === 'ATTORNEY_DRAFT' ? 'ATTORNEY_UPLOADED' : 'USER_UPLOADED'},
        NOW(), NOW()
      )
    `

    // DocumentPreparation 레코드 생성 또는 업데이트 (raw SQL 사용)
    try {
      await prisma.$queryRaw`
        INSERT INTO us_patents_document_preparations (id, patentId, overallStatus, translationStatus, createdAt, updatedAt)
        VALUES (${crypto.randomUUID()}, ${patentId}, 'IN_PROGRESS', 'NOT_STARTED', NOW(), NOW())
        ON DUPLICATE KEY UPDATE 
        overallStatus = 'IN_PROGRESS', updatedAt = NOW()
      `
    } catch (upsertError) {
      console.error("DocumentPreparation upsert 오류:", upsertError)
      // upsert 실패해도 파일 업로드는 성공으로 처리
    }

    return NextResponse.json({
      success: true,
      data: {
        id: crypto.randomUUID(),
        fileName: safeFileName,
        originalFileName: file.name,
        fileSize: file.size,
        uploadedBy: currentUser.memberName,
        status: uploadType === 'ATTORNEY_DRAFT' ? 'ATTORNEY_UPLOADED' : 'USER_UPLOADED',
        createdAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error("문서 업로드 오류:", error)
    return NextResponse.json(
      { error: "문서 업로드 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
} 