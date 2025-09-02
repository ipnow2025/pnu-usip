import { NextRequest, NextResponse } from 'next/server'
import { translationsStore } from '@/lib/data/translations-store'

// DELETE: 번역 파일 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params
    
    if (!fileId) {
      return NextResponse.json(
        { success: false, error: '파일 ID는 필수입니다.' },
        { status: 400 }
      )
    }
    
    // 파일 삭제 (실제로는 S3에서도 삭제해야 함)
    const deleted = translationsStore.deleteFile(fileId)
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: '파일을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: '파일이 삭제되었습니다.',
    })
  } catch (error) {
    console.error('번역 파일 삭제 오류:', error)
    return NextResponse.json(
      { success: false, error: '번역 파일 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 