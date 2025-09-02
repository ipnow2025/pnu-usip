import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { deleteFromS3 } from "@/lib/s3"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ patentId: string; fileId: string }> }
) {
  try {
    const { patentId, fileId } = await params

    // 파일 정보 조회
    const files = await prisma.$queryRaw`
      SELECT * FROM us_patents_document_preparation_files 
      WHERE id = ${fileId} AND patentId = ${patentId}
    `

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: "파일을 찾을 수 없습니다." },
        { status: 404 }
      )
    }

    const file = files[0] as any

    // S3에서 파일 삭제
    // if (file.fileKey) {
    //   try {
    //     await deleteFromS3(file.fileKey)
    //   } catch (s3Error) {
    //     console.error("S3 파일 삭제 오류:", s3Error)
    //     // S3 삭제 실패해도 DB 레코드는 삭제
    //   }
    // }

    // 데이터베이스에서 파일 레코드 삭제
    await prisma.$queryRaw`
      DELETE FROM us_patents_document_preparation_files 
      WHERE id = ${fileId} AND patentId = ${patentId}
    `

    return NextResponse.json({
      success: true,
      message: "파일이 성공적으로 삭제되었습니다."
    })

  } catch (error) {
    console.error("파일 삭제 오류:", error)
    return NextResponse.json(
      { error: "파일 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
} 