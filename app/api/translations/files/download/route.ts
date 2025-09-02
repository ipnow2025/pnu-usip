import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { downloadBufferFromS3 } from "@/lib/s3"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get("fileId")
    const patentId = searchParams.get("patentId")

    if (!fileId || !patentId) {
      return NextResponse.json(
        { error: "파일 ID와 특허 ID가 필요합니다." },
        { status: 400 }
      )
    }

    // 번역 파일 정보 조회
    const translationFile = await (prisma as any).translationFile.findFirst({
      where: {
        id: fileId,
        patentId: patentId,
      },
    })

    if (!translationFile) {
      return NextResponse.json(
        { error: "파일을 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // 파일 정보 파싱
    const files = JSON.parse(translationFile.files)
    const targetFile = files.find((f: any) => f.id === fileId)

    if (!targetFile || !targetFile.fileKey) {
      return NextResponse.json(
        { error: "파일 정보를 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    // S3에서 파일 다운로드
    const fileBuffer = await downloadBufferFromS3(targetFile.fileKey)

    // Content-Disposition 헤더와 함께 파일 스트리밍
    const response = new NextResponse(fileBuffer)
    response.headers.set('Content-Type', targetFile.type || 'application/octet-stream')
    response.headers.set('Content-Disposition', `attachment; filename="${targetFile.name}"; filename*=UTF-8''${encodeURIComponent(targetFile.name)}`)
    response.headers.set('Content-Length', fileBuffer.length.toString())
    
    return response
  } catch (error) {
    console.error("번역 파일 다운로드 오류:", error)
    return NextResponse.json(
      { error: "파일 다운로드에 실패했습니다." },
      { status: 500 }
    )
  }
} 