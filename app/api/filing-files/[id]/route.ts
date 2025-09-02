import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { deleteFromS3 } from "@/lib/s3"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fileId } = await params

    if (!fileId) {
      return NextResponse.json({ error: "파일 ID가 필요합니다." }, { status: 400 })
    }

    // 파일 정보 조회
    const files = await prisma.$queryRaw`
      SELECT file_key as fileKey
      FROM us_patents_filing_files 
      WHERE id = ${fileId}
    ` as any[]

    if (files.length === 0) {
      return NextResponse.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 })
    }

    const fileKey = files[0].fileKey

    // S3에서 파일 삭제
    try {
      await deleteFromS3([{ Key: fileKey }])
    } catch (s3Error) {
      console.error("S3 파일 삭제 실패:", s3Error)
      // S3 삭제 실패해도 DB에서 삭제는 진행
    }

    // 데이터베이스에서 파일 정보 삭제
    await prisma.$queryRaw`
      DELETE FROM us_patents_filing_files 
      WHERE id = ${fileId}
    `

    return NextResponse.json({
      message: "파일이 성공적으로 삭제되었습니다."
    })
  } catch (error) {
    console.error("파일 삭제 오류:", error)
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 })
  }
} 