import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { deleteFromS3 } from '@/lib/s3'
import { getS3Url } from '@/lib/getS3Url'

// GET: 문서 다운로드 URL 반환
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string, documentId: string }> }) {
  try {
    const { id, documentId } = await params
    
    const document = await (prisma as any).document.findUnique({
      where: { id: documentId }
    })

    if (!document) {
      return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 })
    }

    // S3 URL 생성
    const downloadUrl = getS3Url(document.filePath)

    return NextResponse.json({
      success: true,
      data: {
        downloadUrl,
        fileName: document.fileName,
        fileSize: document.fileSize,
        fileType: document.type
      }
    })
  } catch (error) {
    console.error("Document download error:", error)
    return NextResponse.json({ success: false, error: "Failed to get document URL" }, { status: 500 })
  }
}

// DELETE: 문서 삭제
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string, documentId: string }> }) {
  try {
    const { id, documentId } = await params
    
    const document = await (prisma as any).document.findUnique({
      where: { id: documentId }
    })

    if (!document) {
      return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 })
    }

    // S3에서 파일 삭제
    await deleteFromS3([{ Key: document.filePath }])

    // 데이터베이스에서 문서 정보 삭제
    await (prisma as any).document.delete({
      where: { id: documentId }
    })

    return NextResponse.json({
      success: true,
      message: "Document deleted successfully",
    })
  } catch (error) {
    console.error("Document delete error:", error)
    return NextResponse.json({ success: false, error: "Failed to delete document" }, { status: 500 })
  }
} 