import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST() {
  try {
    console.log('마이그레이션 API가 호출되었습니다.')

    // 기존 데이터 확인
    const existingUsers = await prisma.user.count()
    const existingPatents = await prisma.patent.count()

    if (existingUsers > 0 || existingPatents > 0) {
      return NextResponse.json({
        message: '이미 데이터가 존재합니다.',
        users: existingUsers,
        patents: existingPatents
      })
    }

    // 사용자 데이터 생성
    // const users = await Promise.all([
    //   prisma.user.create({
    //     data: {
    //       memberId: "user_1",
    //       memberIdx: "idx_1",
    //       name: "김특허",
    //       nameEn: "Kim Patent",
    //       email: "kim.patent@company.com",
    //       password: "dummy_password",
    //       role: "PATENT_MANAGER",
    //       organization: "테크컴퍼니",
    //       department: "지식재산팀",
    //       phone: "02-1234-5678",
    //       mobile: "010-1234-5678",
    //       status: "ACTIVE",
    //       addressKr: "서울시 강남구",
    //       addressEn: "Gangnam-gu, Seoul",
    //     }
    //   }),
    //   prisma.user.create({
    //     data: {
    //       memberId: "user_2",
    //       memberIdx: "idx_2",
    //       name: "이발명",
    //       nameEn: "Lee Inventor",
    //       email: "lee.inventor@company.com",
    //       password: "dummy_password",
    //       role: "INVENTOR",
    //       organization: "테크컴퍼니",
    //       department: "연구개발팀",
    //       phone: "02-1234-5679",
    //       mobile: "010-1234-5679",
    //       status: "ACTIVE",
    //       addressKr: "서울시 서초구",
    //       addressEn: "Seocho-gu, Seoul",
    //     }
    //   })
    // ])

    // // 특허 데이터 생성
    // const patents = await Promise.all([
    //   prisma.patent.create({
    //     data: {
    //       title: "AI 기반 특허 분석 시스템",
    //       applicationNumber: "INV-2024-001",
    //       status: "TRANSLATING",
    //       inventorId: users[1].id, // 이발명
    //       managerId: users[0].id,  // 김특허
    //     }
    //   }),
    //   prisma.patent.create({
    //     data: {
    //       title: "블록체인 기반 지적재산권 관리 시스템",
    //       applicationNumber: "INV-2024-002",
    //       status: "NO_PROGRESS",
    //       inventorId: users[1].id, // 이발명
    //       managerId: users[0].id,  // 김특허
    //     }
    //   })
    // ])

    // return NextResponse.json({
    //   message: '마이그레이션이 완료되었습니다.',
    //   users: users.length,
    //   patents: patents.length
    // })

  } catch (error) {
    console.error('마이그레이션 오류:', error)
    return NextResponse.json(
      { error: '마이그레이션 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
} 