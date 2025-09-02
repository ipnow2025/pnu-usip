import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

// 사용자 생성 스키마
const createUserSchema = z.object({
  memberId: z.string().min(1),
  memberIdx: z.string().optional(),
  name: z.string().min(1),
  nameEn: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다."),
  role: z.enum(['PATENT_MANAGER', 'INVENTOR', 'US_ATTORNEY', 'EXTERNAL_REVIEWER']),
  organization: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  addressKr: z.string().optional(),
  addressEn: z.string().optional(),
})

// 사용자 업데이트 스키마
const updateUserSchema = createUserSchema.partial().omit({ memberId: true, memberIdx: true })

// GET: 모든 사용자 조회 (검색 및 필터링 포함)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const checkDuplicate = searchParams.get('checkDuplicate')
    const memberId = searchParams.get('memberId')
    
    // 중복 확인 요청인 경우
    if (checkDuplicate === 'true' && memberId) {
      const existingUser = await prisma.user.findFirst({
        where: { memberId: memberId }
      })
      
      return NextResponse.json({
        success: true,
        isDuplicate: !!existingUser,
        message: existingUser ? '이미 사용 중인 회원 ID입니다.' : '사용 가능한 회원 ID입니다.'
      })
    }
    
    const skip = (page - 1) * limit
    
    // 검색 조건 구성
    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nameEn: { contains: search } },
        { email: { contains: search } },
        { organization: { contains: search } },
        { department: { contains: search } },
      ]
    }
    
    if (role && role !== 'all') {
      where.role = role
    }
    
    if (status && status !== 'all') {
      where.status = status === 'active' ? 'ACTIVE' : 'INACTIVE'
    }
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ])
    
    // 프론트엔드에서 기대하는 형태로 변환
    const transformedUsers = users.map(user => ({
      id: user.id.toString(),
      memberId: user.memberId,
      memberIdx: user.memberIdx,
      name: user.name,
      nameEn: user.nameEn,
      email: user.email,
      role: mapRoleToDisplay(user.role),
      organization: user.organization,
      department: user.department,
      phone: user.phone,
      mobile: user.mobile,
      status: user.status === 'ACTIVE' ? '활성' : '비활성',
      addressKr: user.addressKr,
      addressEn: user.addressEn,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastLogin: '최근 로그인 정보 없음' // 실제로는 별도 테이블에서 조회
    }))
    
    return NextResponse.json({
      success: true,
      users: transformedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('사용자 조회 오류:', error)
    return NextResponse.json(
      { 
        success: false,
        error: '사용자 조회 중 오류가 발생했습니다.',
        users: []
      },
      { status: 500 }
    )
  }
}

// POST: 새 사용자 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const validatedData = createUserSchema.parse(body)
    
    // 빈 문자열을 null로 변환
    const cleanedData = {
      ...validatedData,
      email: validatedData.email === "" ? null : validatedData.email,
      nameEn: validatedData.nameEn === "" ? null : validatedData.nameEn,
      organization: validatedData.organization === "" ? null : validatedData.organization,
      department: validatedData.department === "" ? null : validatedData.department,
      phone: validatedData.phone === "" ? null : validatedData.phone,
      mobile: validatedData.mobile === "" ? null : validatedData.mobile,
      addressKr: validatedData.addressKr === "" ? null : validatedData.addressKr,
      addressEn: validatedData.addressEn === "" ? null : validatedData.addressEn,
    }
    
    // 비밀번호 해싱 (비밀번호가 필수이므로 항상 해싱)
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(cleanedData.password, saltRounds)
    
    // memberIdx가 없으면 자동 생성
    const userData = {
      ...cleanedData,
      password: hashedPassword, // 해싱된 비밀번호 저장
      memberIdx: cleanedData.memberIdx || `idx_${Date.now()}`
    }
    
    const user = await prisma.user.create({
      data: userData
    })
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id.toString(),
        memberId: user.memberId,
        memberIdx: user.memberIdx,
        name: user.name,
        nameEn: user.nameEn,
        email: user.email,
        role: mapRoleToDisplay(user.role),
        organization: user.organization,
        department: user.department,
        phone: user.phone,
        mobile: user.mobile,
        status: user.status === 'ACTIVE' ? '활성' : '비활성',
        addressKr: user.addressKr,
        addressEn: user.addressEn,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      }
    }, { status: 201 })
  } catch (error) {
    console.error('User creation error details:', error)
    
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.errors)
      return NextResponse.json(
        { 
          success: false,
          error: '입력 데이터가 올바르지 않습니다.', 
          details: error.errors 
        },
        { status: 400 }
      )
    }
    
    console.error('사용자 생성 오류:', error)
    return NextResponse.json(
      { 
        success: false,
        error: '사용자 생성 중 오류가 발생했습니다.' 
      },
      { status: 500 }
    )
  }
}

// 역할 매핑 함수
function mapRoleToDisplay(role: string): string {
  const roleMap: { [key: string]: string } = {
    'PATENT_MANAGER': '관리자',
    'INVENTOR': '발명자',
    'US_ATTORNEY': '변호사',
    'EXTERNAL_REVIEWER': '외부 검토자'
  }
  return roleMap[role] || role
}
