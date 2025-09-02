import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/permissions"

// 코멘트 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patentId: string }> }
) {
  try {
    const { patentId } = await params

    // 특허의 모든 코멘트 조회 (raw query 사용)
    const comments = await prisma.$queryRaw`
      SELECT * FROM us_patents_document_comments 
      WHERE patentId = ${patentId} 
      ORDER BY createdAt DESC
    `

    return NextResponse.json({
      success: true,
      data: Array.isArray(comments) ? comments : []
    })

  } catch (error) {
    console.error("코멘트 조회 오류:", error)
    return NextResponse.json(
      { error: "코멘트 조회 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

// 코멘트 작성
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patentId: string }> }
) {
  try {
    const { patentId } = await params
    const { documentType, content } = await request.json()

    if (!documentType || !content) {
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

    // authorId 생성 (사용자 ID가 없으면 기본값 사용)
    const authorId = currentUser.userId || 1 // userId만 사용

    // 코멘트 저장 (raw SQL 사용)
    const comment = await prisma.$queryRaw`
      INSERT INTO us_patents_document_comments (
        id, patentId, documentType, content, authorId, authorName, authorRole, createdAt, updatedAt
      ) VALUES (
        ${crypto.randomUUID()}, ${patentId}, ${documentType}, ${content}, 
        ${authorId}, ${currentUser.memberName || '관리자'}, ${currentUser.role || 'PATENT_MANAGER'}, NOW(), NOW()
      )
    `

    return NextResponse.json({
      success: true,
      data: {
        id: crypto.randomUUID(),
        patentId,
        documentType,
        content,
        authorId: authorId,
        authorName: currentUser.memberName || '관리자',
        authorRole: currentUser.role || 'PATENT_MANAGER',
        createdAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error("코멘트 작성 오류:", error)
    return NextResponse.json(
      { error: "코멘트 작성 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
} 