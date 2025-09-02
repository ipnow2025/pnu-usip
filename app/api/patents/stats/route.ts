import { prisma } from "@/lib/db"

export async function GET() {
  try {
    // 전체 특허 수
    const total = await prisma.patent.count()

    // 기본 상태별 통계
    const basicStats = {
      total,
      translationWaiting: await prisma.patent.count({
        where: { status: "NO_PROGRESS" }
      }),
      translationInProgress: await prisma.patent.count({
        where: { status: "TRANSLATING" }
      }),
      translationCompleteDocPrep: await prisma.patent.count({
        where: { status: "DOCUMENT_PREP" }
      }),
    }

    // 서류 진행률 100%인 특허 수 계산 (/documents 페이지 로직 참고)
    let documentCompleteCount = 0
    try {
      // 방법 1: document_preparations 테이블에서 overall_status = 'COMPLETED' 확인
      try {
        const completedPreparations = await (prisma as any).documentPreparation.findMany({
          where: { overallStatus: "COMPLETED" }
        })
        documentCompleteCount = completedPreparations.length
      } catch (prepError) {
        
        // 방법 2: 개별 파일 상태 확인
        const allPatents = await prisma.patent.findMany()
        
        for (const patent of allPatents) {
          // 해당 특허의 서류 준비 파일들 조회
          const docFiles = await (prisma as any).documentPreparationFile.findMany({
            where: { patentId: patent.id }
          })
                    
          // 필수 서류 타입들 (OTHER 제외)
          const requiredDocTypes = ['DECLARATION', 'ADS', 'IDS', 'ASSIGNMENT', 'SPECIFICATION', 'DRAWINGS', 'IDS_ATTACHMENTS']
          
          // 각 필수 서류 타입별로 완료 상태 확인
          let completedTypes = 0
          for (const docType of requiredDocTypes) {
            const docFile = docFiles.find((file: any) => file.documentType === docType)
            
            // 완료 상태: COMPLETED, USER_UPLOADED, ATTORNEY_UPLOADED, TRANSLATION_LINKED
            if (docFile && ['COMPLETED', 'USER_UPLOADED', 'ATTORNEY_UPLOADED', 'TRANSLATION_LINKED'].includes(docFile.status)) {
              completedTypes++
            }
          }
                    
          // 모든 필수 서류가 완료되면 카운트 증가
          if (completedTypes === requiredDocTypes.length) {
            documentCompleteCount++
          }
        }
      }
      
      // 방법 3: 만약 여전히 0개라면, 특허 상태 기반으로 추정
      if (documentCompleteCount === 0) {
        const attorneyReviewCount = await prisma.patent.count({
          where: { status: "ATTORNEY_REVIEW" }
        })
        documentCompleteCount = attorneyReviewCount
      }
            
    } catch (error) {
      documentCompleteCount = 0
    }

    // USPTO 출원 완료된 특허 수 계산 (/filing/management 페이지 로직 참고)
    let filingCompleteCount = 0
    try {
      // 방법 1: USPTO_FILING 상태인 특허 수 확인
      const filingStatusCount = await prisma.patent.count({
        where: { status: "USPTO_FILING" }
      })
      
      // 방법 2: 출원 파일이 업로드된 특허 수 확인
      const filingFilesResult = await prisma.$queryRaw`
        SELECT COUNT(DISTINCT patent_id) as count
        FROM us_patents_filing_files
      `
      const filingFilesCount = Array.isArray(filingFilesResult) ? Number(filingFilesResult[0]?.count || 0) : 0
      
      // 두 방법 중 더 큰 값 사용 (더 보수적인 접근)
      filingCompleteCount = Math.max(filingStatusCount, filingFilesCount)
      
    } catch (error) {
      // 에러 발생 시 상태 기반으로만 계산
      try {
        filingCompleteCount = await prisma.patent.count({
          where: { status: "USPTO_FILING" }
        })
      } catch (fallbackError) {
        filingCompleteCount = 0
      }
    }

    const stats = {
      ...basicStats,
      docCompleteFilingReady: documentCompleteCount,
      filingComplete: filingCompleteCount,
    }

    return Response.json({
      success: true,
      data: stats,
    })
  } catch (error) {
    console.error("통계 조회 오류:", error)
    return Response.json(
      {
        success: false,
        error: "통계 데이터 조회 중 오류가 발생했습니다.",
      },
      { status: 500 },
    )
  }
}
