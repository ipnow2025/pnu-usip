import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// 특허 생성 스키마
const createPatentSchema = z.object({
  managementNumber: z.string().optional(),
  title: z.string().min(1, "특허명은 필수입니다"),
  titleEn: z.string().optional(),
  applicationNumber: z.string().optional(),
  usApplicationNumber: z.string().optional(),
  usRegistrationNumber: z.string().optional(),
  pctApplicationNumber: z.string().optional(),
  filingDate: z.string().optional().transform(val => val ? new Date(val) : null),
  pctFiled: z.boolean().default(false),
  pctFilingDate: z.string().optional().transform(val => val ? new Date(val) : null),
  usptoEligible: z.boolean().default(false),
  dueDate: z.string().optional().transform(val => val ? new Date(val) : null),
  status: z.enum(['NO_PROGRESS', 'TRANSLATING', 'TRANSLATION_REVIEW', 'DOCUMENT_PREP', 'ATTORNEY_REVIEW', 'USPTO_FILING', 'OA_RESPONSE', 'USPTO_REGISTERED']).default('NO_PROGRESS'),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  notes: z.string().optional(),
  inventorId: z.number().int().positive(),
  managerId: z.number().int().positive(),
  inventors: z.array(z.string()).min(1, "최소 1명의 발명자는 필수입니다"),
  priorityPatents: z.array(z.object({
    title: z.string().optional(),
    applicationNumber: z.string().optional(),
    filingDate: z.string().optional().transform(val => val ? new Date(val) : null),
    inventors: z.array(z.string()).min(1, "최소 1명의 발명자는 필수입니다"),
  })).optional(),
})

// GET: 모든 특허 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const section = searchParams.get('section') || ''
    
    const skip = (page - 1) * limit
    
    // 검색 조건
    const where: any = {}
    
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { titleEn: { contains: search } },
        { applicationNumber: { contains: search } },
        { managementNumber: { contains: search } },
      ]
    }
    
    if (status && status !== 'all') {
      where.status = status
    }
    
    // 번역 섹션 필터링
    if (section === 'translation') {
      where.status = {
        in: ['TRANSLATING', 'TRANSLATION_REVIEW', 'DOCUMENT_PREP']
      }
    }
    
    const [patents, total] = await Promise.all([
      prisma.patent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.patent.count({ where })
    ])
    
    // 발명자 정보를 별도로 가져와서 합치기
    const patentsWithInventors = await Promise.all(
      patents.map(async (patent) => {
        // inventors 컬럼에서 JSON 파싱
        let inventors = []
        if ((patent as any).inventors) {
          try {
            const parsedInventors = JSON.parse((patent as any).inventors)
            inventors = Array.isArray(parsedInventors) ? parsedInventors : []
          } catch (e) {
            inventors = []
          }
        }
        
        // 우선권 특허 정보 가져오기
        const priorityPatents = await (prisma as any).priorityPatent.findMany({
          where: { patentId: patent.id },
          orderBy: { createdAt: 'asc' }
        })

        const priorityPatentsWithInventors = priorityPatents.map((pp: any) => {
          let ppInventors = []
          if (pp.inventors) {
            try {
              const parsedInventors = JSON.parse(pp.inventors)
              ppInventors = Array.isArray(parsedInventors) ? parsedInventors : []
            } catch (e) {
              ppInventors = []
            }
          }

          return {
            title: pp.title,
            applicationNumber: pp.applicationNumber,
            filingDate: pp.filingDate,
            inventors: ppInventors
          }
        })
        
        // 불린 값들을 올바르게 변환
        const transformedPatent = {
          ...patent,
          pctFiled: Boolean(patent.pctFiled),
          usptoEligible: Boolean(patent.usptoEligible),
          inventors: inventors.map((name: string, index: number) => ({
            id: index.toString(),
            name: name,
            email: '',
            role: 'INVENTOR',
            department: ''
          })),
          priorityPatents: priorityPatentsWithInventors
        }
        
        return transformedPatent
      })
    )
    
    return NextResponse.json({
      success: true,
      data: patentsWithInventors,
      total: total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('특허 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '특허 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST: 새 특허 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createPatentSchema.parse(body)
    
    // 관리번호가 없으면 자동 생성
    if (!validatedData.managementNumber) {
      validatedData.managementNumber = await generateManagementNumber()
    }
    
    // 발명자 정보를 JSON으로 저장
    const patentData = {
      ...validatedData,
      inventors: JSON.stringify(validatedData.inventors)
    }
    
    // priorityPatents를 제거하고 메인 특허 데이터만 추출
    const { priorityPatents, ...mainPatentData } = patentData
    
    // 특허 생성
    const patent = await prisma.patent.create({
      data: {
        ...mainPatentData,
        inventors: mainPatentData.inventors, // 이미 JSON.stringify된 상태
      } as any,
    })

    // 우선권 특허가 있는 경우 생성
    if (priorityPatents && priorityPatents.length > 0) {
      for (const priorityPatent of priorityPatents) {
        if ((priorityPatent.title && priorityPatent.title.trim()) || 
            (priorityPatent.applicationNumber && priorityPatent.applicationNumber.trim())) {
          await (prisma as any).priorityPatent.create({
            data: {
              patentId: patent.id,
              title: priorityPatent.title || "",
              applicationNumber: priorityPatent.applicationNumber || "",
              filingDate: priorityPatent.filingDate ? new Date(priorityPatent.filingDate) : null,
              inventors: JSON.stringify(priorityPatent.inventors),
            },
          })
        }
      }
    }
    
    // 생성된 특허에 발명자 정보 포함하여 반환
    const inventor = await prisma.user.findFirst({
      where: { id: patent.inventorId }
    })
    
    // inventors 컬럼에서 JSON 파싱
    let inventors = []
    if ((patent as any).inventors) {
      try {
        const parsedInventors = JSON.parse((patent as any).inventors)
        inventors = Array.isArray(parsedInventors) ? parsedInventors : []
      } catch (e) {
        inventors = []
      }
    }
    
    // 우선권 특허 정보 가져오기
    const createdPriorityPatents = await (prisma as any).priorityPatent.findMany({
      where: { patentId: patent.id },
      orderBy: { createdAt: 'asc' }
    })

    const priorityPatentsWithInventors = createdPriorityPatents.map((pp: any) => {
      let ppInventors = []
      if (pp.inventors) {
        try {
          const parsedInventors = JSON.parse(pp.inventors)
          ppInventors = Array.isArray(parsedInventors) ? parsedInventors : []
        } catch (e) {
          ppInventors = []
        }
      }

      return {
        title: pp.title,
        applicationNumber: pp.applicationNumber,
        filingDate: pp.filingDate,
        inventors: ppInventors
      }
    })
    
    const patentWithInventors = {
      ...patent,
      pctFiled: Boolean(patent.pctFiled),
      usptoEligible: Boolean(patent.usptoEligible),
      inventors: inventors.map((name: string, index: number) => ({
        id: index.toString(),
        name: name,
        email: '',
        role: 'INVENTOR',
        department: ''
      })),
      priorityPatents: priorityPatentsWithInventors
    }
    
    return NextResponse.json({
      success: true,
      data: patentWithInventors
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: '입력 데이터가 올바르지 않습니다.', details: error.errors },
        { status: 400 }
      )
    }
    
    // Prisma 에러 처리
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'P2002') {
        const target = (error as any).meta?.target
        if (target && target.includes('applicationNumber')) {
          return NextResponse.json(
            { success: false, error: '이미 존재하는 출원번호입니다.' },
            { status: 400 }
          )
        }
        if (target && target.includes('managementNumber')) {
          return NextResponse.json(
            { success: false, error: '이미 존재하는 관리번호입니다.' },
            { status: 400 }
          )
        }
      }
    }
    
    console.error('특허 생성 오류:', error)
    return NextResponse.json(
      { success: false, error: '특허 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 관리번호 자동 생성 함수
async function generateManagementNumber(): Promise<string> {
  const currentYear = new Date().getFullYear()
  
  // 모든 특허를 가져와서 해당 년도 필터링
  const allPatents = await prisma.patent.findMany()
  
  let maxNumber = 0
  allPatents.forEach(patent => {
    const match = (patent as any).managementNumber?.match(new RegExp(`PNU-${currentYear}-(\\d{4})`))
    if (match) {
      const number = parseInt(match[1])
      if (number > maxNumber) {
        maxNumber = number
      }
    }
  })
  
  // 다음 번호 생성
  const nextNumber = maxNumber + 1
  return `PNU-${currentYear}-${nextNumber.toString().padStart(4, '0')}`
}

// 마감일 계산 함수
function calculateDueDate(filingDate: Date, pctFiled: boolean): Date {
  const dueDate = new Date(filingDate)
  
  if (pctFiled) {
    // PCT 출원: 30개월 후
    dueDate.setMonth(dueDate.getMonth() + 30)
  } else {
    // KR 특허: 12개월 후
    dueDate.setMonth(dueDate.getMonth() + 12)
  }
  
  return dueDate
}
