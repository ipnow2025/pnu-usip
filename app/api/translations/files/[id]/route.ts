import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET: 특허별 번역 파일 목록 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patentId } = await params
    
    if (!patentId) {
      return NextResponse.json(
        { success: false, error: '특허 ID는 필수입니다.' },
        { status: 400 }
      )
    }
    
    // 실제 데이터베이스에서 특허 존재 확인
    const patent = await prisma.patent.findUnique({
      where: { id: patentId }
    })
    
    if (!patent) {
      return NextResponse.json(
        { success: false, error: '특허를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    // 번역 데이터 조회
    const translation = await prisma.translation.findFirst({
      where: { patentId: patentId }
    })
    
    // 실제 파일 데이터는 아직 구현되지 않았으므로 빈 배열 반환
    // 향후 Document 테이블과 연동하여 실제 파일 데이터 제공
    const files: any[] = []
    
    return NextResponse.json({
      success: true,
      data: files,
      total: files.length,
    })
  } catch (error) {
    console.error('번역 파일 목록 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '번역 파일 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 