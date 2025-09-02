import { NextRequest, NextResponse } from "next/server"
import { uploadToS3 } from "@/lib/s3"
import { getCurrentUser } from "@/lib/permissions"
import { prisma } from "@/lib/db"
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
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
    }

    const formData = await request.formData()
    const patentId = formData.get("patentId") as string
    const files = formData.getAll("files") as File[]

    if (!patentId) {
      return NextResponse.json({ error: "특허 ID가 필요합니다." }, { status: 400 })
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "업로드할 파일이 없습니다." }, { status: 400 })
    }

    const uploadedFiles = []

    for (const file of files) {
      // 파일 크기 검증 (10MB 제한)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: `파일 크기는 10MB를 초과할 수 없습니다: ${file.name}` }, { status: 400 })
      }

      // 파일 타입 검증
      const allowedTypes = [".pdf", ".doc", ".docx"]
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."))
      if (!allowedTypes.includes(fileExtension)) {
        return NextResponse.json({ error: `지원하지 않는 파일 형식입니다: ${file.name}` }, { status: 400 })
      }

      try {
        // 파일을 ArrayBuffer로 변환
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // 파일명 안전화 및 파일 키 생성
        const safeFileName = sanitizeFileName(file.name)
        const fileKey = createKey(16, true) // 16자리 랜덤 키 + 타임스탬프
        const s3Key = `patentsMng/pnu/filing/${patentId}/${fileKey}`

        // S3에 업로드
        await uploadToS3(buffer, s3Key, 'public-read')

        // 데이터베이스에 파일 정보 저장 (Prisma create 사용)
        const result = await prisma.filingFile.create({
          data: {
            patentId,
            fileName: safeFileName,
            originalFileName: file.name,
            fileSize: BigInt(file.size),
            fileType: file.type,
            uploadedBy: currentUser.memberName,
            fileKey: s3Key,
          }
        })
        
        uploadedFiles.push({
          id: result.id,
          patentId,
          fileName: safeFileName,
          originalFileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadedBy: currentUser.memberName,
          fileKey: s3Key,
        })
      } catch (error) {
        console.error("파일 업로드 실패:", error)
        return NextResponse.json({ error: `파일 업로드 실패: ${file.name}` }, { status: 500 })
      }
    }

    return NextResponse.json({
      message: "파일이 성공적으로 업로드되었습니다.",
      files: uploadedFiles,
    })
  } catch (error) {
    console.error("파일 업로드 API 오류:", error)
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 })
  }
} 